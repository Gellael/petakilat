import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { apiFetch } from '../auth';
import { API } from '../constants/config';
import { BASEMAP_TILES, INSET_SYNC, DEFAULT_INSET_BASEMAP, rasterSource, BASE_SRC, BASE_LAYER } from '../constants/basemaps';
import { SHEET_W, SHEET_H, EMPTY_FC } from '../constants/sheet';
import { GEE_LAYERS, geeLayerId } from '../constants/gee';
import { escapeHtml } from '../utils/html';
import { expandBbox, toDMS, getFeatureName } from '../utils/geo';
import { swapBasemap, runWhenReady, removeGeeLayer, addGeeLayer, updateGeeMask } from '../utils/mapLayers';
import { ensureScript, waitMapIdle, captureMapCanvas, overlayMapSnapshot } from '../utils/exportHelpers';
import { hasCallout, buildPinHtml, buildCalloutHtml, CALLOUT_FRAME_CSS } from '../utils/aoi';
import type { AoiItem, Auth } from '../types';
import '../lib/setupMaplibre';

interface UseMapEditorOptions {
  activePage: 'home' | 'admin-map';
  auth: Auth;
  setShowAccount: (open: boolean) => void;
}

/**
 * Seluruh state dan logika editor peta: wilayah bertingkat, simbologi, layer GEE,
 * titik AOI, peta inset, dan ekspor PNG/PDF. Komponen UI hanya membaca hasilnya.
 */
export function useMapEditor({ activePage, auth, setShowAccount }: UseMapEditorOptions) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({ lokasi: true, dasar: false, simbol: false, gee: false, aoi: false, identitas: false });
  const [exporting, setExporting] = useState<'' | 'png' | 'pdf'>('');
  const [apiError, setApiError] = useState<string>('');
  const [loadingKab, setLoadingKab] = useState<boolean>(false);
  const [sheetScale, setSheetScale] = useState<number>(1);

  // --- IDENTITAS & KARTOGRAFI ---
  const [judulUtama, setJudulUtama] = useState<string>('PETA ADMINISTRASI DESA');
  const [namaWilayahJudul, setNamaWilayahJudul] = useState<string>('');
  const [subJudul, setSubJudul] = useState<string>('KABUPATEN BENGKULU UTARA - PROVINSI BENGKULU');
  const [sumberData, setSumberData] = useState<string>('Badan Informasi Geospasial (BIG) & WebGIS Aiven PostGIS');
  const [pembuatPeta, setPembuatPeta] = useState<string>('Laboratorium SIG & Informatika');
  const [tahunPeta, setTahunPeta] = useState<string>('2026');

  // --- SIMBOLOGI & TAMPILAN WILAYAH ---
  const [basemapKey, setBasemapKey] = useState<string>('citra');
  const [insetBasemapKey, setInsetBasemapKey] = useState<string>(DEFAULT_INSET_BASEMAP);

  // --- LAYER GOOGLE EARTH ENGINE ---
  const [geeActive, setGeeActive] = useState<Record<string, boolean>>({});
  const [geeLoading, setGeeLoading] = useState<Record<string, boolean>>({});
  const [geeOpacity, setGeeOpacity] = useState<number>(0.8);
  const [geeMask, setGeeMask] = useState<boolean>(true);
  const [geeMsg, setGeeMsg] = useState<string>('');
  const [geeErr, setGeeErr] = useState<boolean>(false);
  const geeActiveRef = useRef<Record<string, boolean>>({});
  geeActiveRef.current = geeActive;
  const geeOpacityRef = useRef<number>(geeOpacity);
  geeOpacityRef.current = geeOpacity;

  const toggleGeeLayer = async (key: string, on: boolean) => {
    const map = mapInstance.current;
    if (!on) {
      setGeeActive((p) => ({ ...p, [key]: false }));
      removeGeeLayer(map, key);
      return;
    }
    if (!map) {
      setGeeErr(true);
      setGeeMsg('Peta belum siap. Coba lagi sebentar.');
      return;
    }
    setGeeActive((p) => ({ ...p, [key]: true }));
    setGeeLoading((p) => ({ ...p, [key]: true }));
    setGeeMsg('');
    setGeeErr(false);
    try {
      const res = await apiFetch(`/api/gee-tiles?layer=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (!data.tileUrl) throw new Error('tileUrl kosong');
      if (!geeActiveRef.current[key]) return; // sempat dimatikan saat memuat
      runWhenReady(map, () => addGeeLayer(map, key, data.tileUrl, geeOpacityRef.current));
    } catch (e) {
      console.error('Gagal memuat layer Earth Engine:', key, e);
      setGeeActive((p) => ({ ...p, [key]: false }));
      setGeeErr(true);
      setGeeMsg(`Gagal memuat layer "${GEE_LAYERS.find((l) => l.key === key)?.label || key}". Periksa server API dan Vercel Logs.`);
    } finally {
      setGeeLoading((p) => ({ ...p, [key]: false }));
    }
  };

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    GEE_LAYERS.forEach((l) => {
      if (map.getLayer(geeLayerId(l.key))) map.setPaintProperty(geeLayerId(l.key), 'raster-opacity', geeOpacity);
    });
  }, [geeOpacity]);
  const [fillColor, setFillColor] = useState<string>('#38bdf8');
  const [opacityVal, setOpacityVal] = useState<number>(0.45);
  const [strokeColor, setStrokeColor] = useState<string>('#dc2626');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [showNeighbors, setShowNeighbors] = useState<boolean>(true);
  const [neighborStrokeColor, setNeighborStrokeColor] = useState<string>('#475569');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showCoordinateGrid, setShowCoordinateGrid] = useState<boolean>(true);

  // --- WILAYAH BERTINGKAT ---
  const [listProvinsi, setListProvinsi] = useState<string[]>([]);
  const [selectedProv, setSelectedProv] = useState<string>('');
  const [listKabupaten, setListKabupaten] = useState<string[]>([]);
  const [selectedKab, setSelectedKab] = useState<string>('');
  const [listDesa, setListDesa] = useState<string[]>([]);
  const [selectedDesa, setSelectedDesa] = useState<string>('');
  const [selectedProps, setSelectedProps] = useState<any>(null);

  // Status Peta (Zoom, Skala, Koordinat Grid)
  const [zoom, setZoom] = useState<number>(13);
  const [mapScale, setMapScale] = useState<number>(25000);
  const [scaleBarMeters, setScaleBarMeters] = useState<number>(1000);
  const [coordsDMS, setCoordsDMS] = useState<{ west: string; east: string; north: string; south: string; centerLng: string; centerLat: string }>({
    west: '102° 08\' 00" BT',
    east: '102° 11\' 00" BT',
    north: '3° 25\' 00" LS',
    south: '3° 28\' 00" LS',
    centerLng: '102° 09\' 30" BT',
    centerLat: '3° 26\' 30" LS'
  });

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const currentGeoJsonRef = useRef<any>(null);
  const selectedFeatureRef = useRef<any>(null);

  // Penutup di luar batas desa untuk layer GEE (ikut berubah saat desa dipilih ulang)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const anyOn = Object.values(geeActive).some(Boolean);
    updateGeeMask(map, selectedFeatureRef.current, geeMask && anyOn);
  }, [geeMask, geeActive, selectedDesa]);
  const labelMarkerRef = useRef<maplibregl.Marker | null>(null);

  // --- TITIK AOI & FOTO DOKUMENTASI ---
  const [aoiList, setAoiList] = useState<AoiItem[]>([]);
  const [isAddingAoi, setIsAddingAoi] = useState<boolean>(false);
  const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null);
  const [, setLabelPos] = useState<[number, number] | null>(null);
  const [showLegendBasemap, setShowLegendBasemap] = useState<boolean>(true);

  // --- PETA INSET (basemap + shape desa) ---
  const insetContainer = useRef<HTMLDivElement>(null);
  const insetInstance = useRef<maplibregl.Map | null>(null);
  const insetReadyRef = useRef<boolean>(false);

  // Ref yang disinkronkan tiap render agar callback peta selalu membaca nilai terbaru
  const selectedDesaRef = useRef<string>(selectedDesa);
  selectedDesaRef.current = selectedDesa;
  const selectedKabRef = useRef<string>(selectedKab);
  selectedKabRef.current = selectedKab;
  const fillColorRef = useRef<string>(fillColor);
  fillColorRef.current = fillColor;
  const strokeColorRef = useRef<string>(strokeColor);
  strokeColorRef.current = strokeColor;
  const basemapKeyRef = useRef<string>(basemapKey);
  basemapKeyRef.current = basemapKey;
  const insetKey = insetBasemapKey === INSET_SYNC ? basemapKey : insetBasemapKey;
  const insetKeyRef = useRef<string>(insetKey);
  insetKeyRef.current = insetKey;
  const aoiListRef = useRef<AoiItem[]>([]);
  aoiListRef.current = aoiList;
  const isAddingAoiRef = useRef<boolean>(false);
  isAddingAoiRef.current = isAddingAoi;

  const aoiMarkersMapRef = useRef<Map<string, { pointMarker: maplibregl.Marker; calloutMarker?: maplibregl.Marker }>>(new Map());

  const toggleSec = (k: string) => setOpenSec((p) => ({ ...p, [k]: !p[k] }));
  // Fitur lain baru terbuka setelah kabupaten/kota dipilih dan datanya berhasil dimuat
  const wilayahSiap = !!selectedKab && !loadingKab && listDesa.length > 0;
  const patchAoi = (id: string, patch: Partial<AoiItem>) =>
    setAoiList((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));


  // Update Skala & Koordinat Grid Berdasarkan Posisi Peta
  const updateMapMetrics = (map: maplibregl.Map) => {
    const z = map.getZoom();
    const center = map.getCenter();
    const bounds = map.getBounds();

    setZoom(Number(z.toFixed(1)));

    const latRad = (center.lat * Math.PI) / 180;
    const metersPerPixel = (156543.03392 * Math.cos(latRad)) / Math.pow(2, z);
    const calculatedScale = Math.round(metersPerPixel / 0.000264583);
    setMapScale(calculatedScale);

    const rawDist = metersPerPixel * 120;
    let niceDist = 1000;
    if (rawDist < 300) niceDist = 100;
    else if (rawDist < 700) niceDist = 500;
    else if (rawDist < 1500) niceDist = 1000;
    else if (rawDist < 3500) niceDist = 2000;
    else if (rawDist < 7500) niceDist = 5000;
    else if (rawDist < 15000) niceDist = 10000;
    else if (rawDist < 35000) niceDist = 25000;
    else niceDist = 50000;
    setScaleBarMeters(niceDist);

    setCoordsDMS({
      west: toDMS(bounds.getWest(), false),
      east: toDMS(bounds.getEast(), false),
      north: toDMS(bounds.getNorth(), true),
      south: toDMS(bounds.getSouth(), true),
      centerLng: toDMS(center.lng, false),
      centerLat: toDMS(center.lat, true)
    });
  };

  // ---------- Muat daftar provinsi (sekali, saat pertama membuka aplikasi peta) ----------
  const loadProvinsi = () => {
    setApiError('');
    fetch(`${API}/api/get-wilayah`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((provinces) => {
        if (Array.isArray(provinces)) setListProvinsi(provinces);
      })
      .catch(() => setApiError('Server data wilayah tidak dapat dihubungi.'));
  };

  useEffect(() => {
    if (activePage === 'admin-map' && listProvinsi.length === 0) loadProvinsi();
  }, [activePage]);

  // ---------- Bersihkan peta saat komponen benar-benar dilepas ----------
  useEffect(() => () => {
    insetReadyRef.current = false;
    try { insetInstance.current?.remove(); } catch (_) {}
    try { mapInstance.current?.remove(); } catch (_) {}
    insetInstance.current = null;
    mapInstance.current = null;
    aoiMarkersMapRef.current.clear();
  }, []);

  // ---------- Inisialisasi peta utama (sekali; halaman tetap termuat saat pindah ke beranda) ----------
  useEffect(() => {
    if (activePage !== 'admin-map' || !mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      preserveDrawingBuffer: true,
      style: {
        version: 8,
        sources: {
          [BASE_SRC]: rasterSource(basemapKeyRef.current)
        },
        layers: [{ id: BASE_LAYER, type: 'raster', source: BASE_SRC, minzoom: 0, maxzoom: 22 }]
      },
      center: [102.148, -3.447],
      zoom: zoom
    } as any);

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    map.on('move', () => updateMapMetrics(map));

    map.on('load', () => {
      map.resize();
      updateMapMetrics(map);
      updateLeaderLinesGeoJson(aoiListRef.current);
    });

    // Klik peta -> tambah titik AOI
    map.on('click', (e) => {
      if (!isAddingAoiRef.current) return;
      const lng = Number(e.lngLat.lng.toFixed(6));
      const lat = Number(e.lngLat.lat.toFixed(6));
      const newAoi: AoiItem = {
        id: 'aoi-' + Date.now(),
        title: `AOI ${aoiListRef.current.length + 1}`,
        lng,
        lat,
        color: '#dc2626',
        icon: '📍',
        imageUrl: '',
        imageCaption: '',
        calloutLng: Number((lng + 0.0035).toFixed(6)),
        calloutLat: Number((lat + 0.0025).toFixed(6)),
        showCallout: true,
        showInLegend: true,
        legendLabel: '',
        legendImageUrl: ''
      };
      setAoiList((prev) => [...prev, newAoi]);
      setSelectedAoiId(newAoi.id);
      setIsAddingAoi(false);
      setOpenSec((p) => ({ ...p, aoi: true }));
      if (window.innerWidth <= 900) setSidebarOpen(true);
    });

    mapInstance.current = map;
    (window as any).mapInstance = map;
  }, [activePage]);

  // Saat kembali dari beranda, ukuran kanvas peta perlu dihitung ulang
  useEffect(() => {
    if (activePage !== 'admin-map') return;
    const id = requestAnimationFrame(() => {
      mapInstance.current?.resize();
      insetInstance.current?.resize();
    });
    return () => cancelAnimationFrame(id);
  }, [activePage]);

  // Skala lembar peta otomatis menyesuaikan ukuran layar (ukuran asli 1020 x 680 tetap dipakai saat ekspor)
  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const calc = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const pad = w < 640 ? 24 : 40;
      const s = Math.min(1, (w - pad) / SHEET_W, (h - pad) / SHEET_H);
      setSheetScale(Math.max(0.2, Number(s.toFixed(3))));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ===================== PETA INSET (BASEMAP + SHAPE DESA) =====================
  const refreshInset = () => {
    const inset = insetInstance.current;
    if (!inset || !insetReadyRef.current) return;

    const kabFc = selectedKabRef.current && currentGeoJsonRef.current?.features?.length ? currentGeoJsonRef.current : null;
    const matched = kabFc && selectedDesaRef.current
      ? kabFc.features.filter((f: any) => getFeatureName(f.properties).toLowerCase() === selectedDesaRef.current.toLowerCase())
      : [];
    const selectedFc = matched.length > 0 ? { type: 'FeatureCollection' as const, features: matched } : EMPTY_FC;
    const contextFc = kabFc || EMPTY_FC;

    (inset.getSource('inset-context-src') as maplibregl.GeoJSONSource | undefined)?.setData(contextFc as any);
    (inset.getSource('inset-selected-src') as maplibregl.GeoJSONSource | undefined)?.setData(selectedFc as any);

    // Garis batas sekitar: putih di atas citra satelit, abu-abu terang di peta gelap, abu-abu gelap di peta terang
    const tone = (BASEMAP_TILES[insetKeyRef.current] || BASEMAP_TILES.citra).tone;
    const ctxColor = tone === 'sat' ? '#ffffff' : tone === 'dark' ? '#94a3b8' : '#64748b';
    if (inset.getLayer('inset-context-line')) inset.setPaintProperty('inset-context-line', 'line-color', ctxColor);
    if (inset.getLayer('inset-context-fill')) inset.setPaintProperty('inset-context-fill', 'fill-color', ctxColor);
    if (inset.getLayer('inset-selected-fill')) inset.setPaintProperty('inset-selected-fill', 'fill-color', fillColorRef.current);
    if (inset.getLayer('inset-selected-line')) inset.setPaintProperty('inset-selected-line', 'line-color', strokeColorRef.current);

    const target = matched.length > 0 ? selectedFc : kabFc;
    if (target) {
      try {
        const bb = turf.bbox(target as any);
        const box = matched.length > 0 ? expandBbox(bb, 0.8) : (bb as [number, number, number, number]);
        inset.resize();
        inset.fitBounds(box, { padding: 8, maxZoom: 18, animate: false });
      } catch (_) {}
    }
  };

  useEffect(() => {
    if (activePage !== 'admin-map' || !insetContainer.current || insetInstance.current) return;

    const inset = new maplibregl.Map({
      container: insetContainer.current,
      style: {
        version: 8,
        sources: {
          [BASE_SRC]: rasterSource(insetKeyRef.current)
        },
        layers: [{ id: BASE_LAYER, type: 'raster', source: BASE_SRC }]
      },
      center: [102.148, -3.447],
      zoom: 8,
      interactive: false,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      preserveDrawingBuffer: true
    } as any);

    inset.on('load', () => {
      inset.addSource('inset-context-src', { type: 'geojson', data: EMPTY_FC as any });
      inset.addSource('inset-selected-src', { type: 'geojson', data: EMPTY_FC as any });
      inset.addLayer({ id: 'inset-context-fill', type: 'fill', source: 'inset-context-src', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.06 } });
      inset.addLayer({ id: 'inset-context-line', type: 'line', source: 'inset-context-src', paint: { 'line-color': '#ffffff', 'line-width': 0.8, 'line-opacity': 0.75 } });
      inset.addLayer({ id: 'inset-selected-fill', type: 'fill', source: 'inset-selected-src', paint: { 'fill-color': fillColorRef.current, 'fill-opacity': 0.55 } });
      inset.addLayer({ id: 'inset-selected-line', type: 'line', source: 'inset-selected-src', paint: { 'line-color': strokeColorRef.current, 'line-width': 2.5 } });
      insetReadyRef.current = true;
      refreshInset();
    });

    insetInstance.current = inset;
  }, [activePage]);

  // Wilayah / warna berubah -> inset menyesuaikan otomatis
  useEffect(() => {
    refreshInset();
  }, [listDesa, selectedDesa, selectedKab, fillColor, strokeColor, activePage]);

  // Peta dasar inset berubah (pilihan inset atau peta utama bila mode ikuti utama) -> inset ikut berganti
  useEffect(() => {
    if (insetInstance.current && insetReadyRef.current) {
      swapBasemap(insetInstance.current, insetKey);
      refreshInset();
    }
  }, [insetKey]);

  // Ganti Peta Dasar (utama; inset disinkronkan oleh effect di atas)
  const handleBasemapChange = (newKey: string) => {
    const tileInfo = BASEMAP_TILES[newKey];
    if (!tileInfo) return;
    setBasemapKey(newKey);
    swapBasemap(mapInstance.current, newKey);
  };

  // Update Real-time Simbologi Batas Wilayah
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (map.getLayer('selected-desa-layer')) {
      map.setPaintProperty('selected-desa-layer', 'fill-color', fillColor);
      map.setPaintProperty('selected-desa-layer', 'fill-opacity', Number(opacityVal));
    }
    if (map.getLayer('selected-desa-outline')) {
      map.setPaintProperty('selected-desa-outline', 'line-color', strokeColor);
      map.setPaintProperty('selected-desa-outline', 'line-width', Number(strokeWidth));
    }
    if (map.getLayer('neighbor-desa-outline')) {
      map.setPaintProperty('neighbor-desa-outline', 'line-color', neighborStrokeColor);
      map.setLayoutProperty('neighbor-desa-outline', 'visibility', showNeighbors ? 'visible' : 'none');
    }
    if (map.getLayer('neighbor-desa-layer')) {
      map.setLayoutProperty('neighbor-desa-layer', 'visibility', showNeighbors ? 'visible' : 'none');
    }
    if (labelMarkerRef.current) {
      const markerEl = labelMarkerRef.current.getElement();
      if (markerEl) markerEl.style.display = showLabels ? 'inline-flex' : 'none';
    }
  }, [fillColor, opacityVal, strokeColor, strokeWidth, showNeighbors, neighborStrokeColor, showLabels]);

  // Kursor peta saat mode tambah AOI
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    try {
      map.getCanvas().style.cursor = isAddingAoi ? 'crosshair' : '';
    } catch (_) {}
  }, [isAddingAoi]);

  // Garis penunjuk (leader lines)
  const updateLeaderLinesGeoJson = (items: AoiItem[]) => {
    const map = mapInstance.current;
    if (!map) return;

    const fc = {
      type: 'FeatureCollection' as const,
      features: items.filter(hasCallout).map((a) => ({
        type: 'Feature' as const,
        properties: { id: a.id, color: a.color || '#0f172a' },
        geometry: { type: 'LineString' as const, coordinates: [[a.lng, a.lat], [a.calloutLng, a.calloutLat]] }
      }))
    };

    if (map.getSource('aoi-leader-lines-source')) {
      (map.getSource('aoi-leader-lines-source') as maplibregl.GeoJSONSource).setData(fc as any);
    } else if (map.isStyleLoaded()) {
      map.addSource('aoi-leader-lines-source', { type: 'geojson', data: fc as any });
      if (!map.getLayer('aoi-leader-lines-layer')) {
        map.addLayer({
          id: 'aoi-leader-lines-layer',
          type: 'line',
          source: 'aoi-leader-lines-source',
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#0f172a'],
            'line-width': 2,
            'line-dasharray': [4, 2]
          }
        });
      }
    }
  };

  // Sinkronisasi marker AOI & kartu foto dokumentasi
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || activePage !== 'admin-map') return;

    const currentIds = new Set(aoiList.map((a) => a.id));
    aoiMarkersMapRef.current.forEach((obj, id) => {
      if (!currentIds.has(id)) {
        obj.pointMarker.remove();
        obj.calloutMarker?.remove();
        aoiMarkersMapRef.current.delete(id);
      }
    });

    aoiList.forEach((aoi) => {
      let markerObj = aoiMarkersMapRef.current.get(aoi.id);

      if (!markerObj) {
        const pinEl = document.createElement('div');
        pinEl.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:grab;user-select:none;';
        pinEl.innerHTML = buildPinHtml(aoi);

        // anchor 'bottom': ujung runcing pin tepat berada di koordinat titik
        const pointMarker = new maplibregl.Marker({ element: pinEl, draggable: true, anchor: 'bottom' })
          .setLngLat([aoi.lng, aoi.lat])
          .addTo(map);

        pointMarker.on('dragstart', () => { pinEl.style.cursor = 'grabbing'; });
        pointMarker.on('drag', () => {
          const pos = pointMarker.getLngLat();
          const updated = aoiListRef.current.map((it) => (it.id === aoi.id ? { ...it, lng: pos.lng, lat: pos.lat } : it));
          aoiListRef.current = updated;
          updateLeaderLinesGeoJson(updated);
        });
        pointMarker.on('dragend', () => {
          pinEl.style.cursor = 'grab';
          const pos = pointMarker.getLngLat();
          patchAoi(aoi.id, { lng: pos.lng, lat: pos.lat });
        });

        markerObj = { pointMarker };
        aoiMarkersMapRef.current.set(aoi.id, markerObj);
      } else {
        markerObj.pointMarker.setLngLat([aoi.lng, aoi.lat]);
        markerObj.pointMarker.getElement().innerHTML = buildPinHtml(aoi);
      }

      if (hasCallout(aoi)) {
        if (!markerObj.calloutMarker) {
          const cardEl = document.createElement('div');
          cardEl.style.cssText = CALLOUT_FRAME_CSS(aoi.color || '#0f172a');
          cardEl.innerHTML = buildCalloutHtml(aoi);

          const calloutMarker = new maplibregl.Marker({ element: cardEl, draggable: true })
            .setLngLat([aoi.calloutLng, aoi.calloutLat])
            .addTo(map);

          calloutMarker.on('dragstart', () => { cardEl.style.cursor = 'grabbing'; });
          calloutMarker.on('drag', () => {
            const pos = calloutMarker.getLngLat();
            const updated = aoiListRef.current.map((it) => (it.id === aoi.id ? { ...it, calloutLng: pos.lng, calloutLat: pos.lat } : it));
            aoiListRef.current = updated;
            updateLeaderLinesGeoJson(updated);
          });
          calloutMarker.on('dragend', () => {
            cardEl.style.cursor = 'grab';
            const pos = calloutMarker.getLngLat();
            patchAoi(aoi.id, { calloutLng: pos.lng, calloutLat: pos.lat });
          });

          markerObj.calloutMarker = calloutMarker;
        } else {
          markerObj.calloutMarker.setLngLat([aoi.calloutLng, aoi.calloutLat]);
          const cardEl = markerObj.calloutMarker.getElement();
          cardEl.style.background = aoi.color || '#0f172a';
          cardEl.innerHTML = buildCalloutHtml(aoi);
        }
      } else if (markerObj.calloutMarker) {
        markerObj.calloutMarker.remove();
        markerObj.calloutMarker = undefined;
      }
    });

    updateLeaderLinesGeoJson(aoiList);
  }, [aoiList, activePage]);

  const toggleAddAoi = () => {
    if (isAddingAoi) {
      setIsAddingAoi(false);
      return;
    }
    setIsAddingAoi(true);
    if (window.innerWidth <= 900) setSidebarOpen(false); // tutup panel agar peta bisa diklik
  };

  // ===================== PILIH WILAYAH =====================
  // Gerbang kredit: dicek setiap user mengklik dropdown provinsi. Kredit TIDAK dipotong di sini
  // (pemotongan hanya terjadi saat ekspor). Admin selalu lolos.
  const cekKreditProvinsi = async (): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/me');
      if (res.ok) {
        const me = await res.json();
        if (me.role === 'admin' || me.kredit > 0) { setApiError(''); return true; }
        setApiError('Kredit Anda habis. Silakan top-up terlebih dahulu untuk mengakses peta.');
        setShowAccount(true); // buka panel top-up
        auth.refreshUser();
        return false;
      }
      if (res.status === 401) return false; // sesi habis; apiFetch sudah memicu logout
    } catch { /* server tidak terjangkau */ }
    setApiError('Tidak dapat memeriksa kredit. Periksa koneksi lalu coba lagi.');
    return false;
  };

  const handleSelectProvinsi = (prov: string) => {
    setSelectedProv(prov);
    setSelectedKab('');
    setSelectedDesa('');
    setSelectedProps(null);
    setListKabupaten([]);
    setListDesa([]);
    if (!prov) return;

    fetch(`${API}/api/get-wilayah?provinsi=${encodeURIComponent(prov)}`)
      .then((res) => res.json())
      .then((kabupatens) => {
        if (Array.isArray(kabupatens)) setListKabupaten(kabupatens);
      })
      .catch(() => setApiError('Gagal memuat daftar kabupaten/kota.'));
  };

  const handleSelectKabupaten = (kab: string) => {
    setSelectedKab(kab);
    setSelectedDesa('');
    setSelectedProps(null);
    setListDesa([]);
    selectedFeatureRef.current = null;
    if (!kab) return;

    setApiError('');
    setLoadingKab(true);
    apiFetch(`/api/get-desa?kabupaten=${encodeURIComponent(kab)}`)
    .then(async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setApiError(data?.error || 'Gagal memuat data desa.');
      if (res.status === 402) setShowAccount(true); // kredit habis -> buka panel top-up
      return null;
    }
    return data;
  })
  .then((geoJsonData) => {
    if (!geoJsonData || !geoJsonData.features) return;
    auth.refreshUser();
        currentGeoJsonRef.current = JSON.parse(JSON.stringify(geoJsonData));

        const desaSet = new Set<string>();
        geoJsonData.features.forEach((f: any) => {
          const des = getFeatureName(f.properties);
          if (des) desaSet.add(des);
        });
        setListDesa(Array.from(desaSet).sort() as string[]);
        setSubJudul(`KABUPATEN ${kab.toUpperCase()} - PROVINSI ${(selectedProv || '').toUpperCase()}`);

        const map = mapInstance.current;
        if (!map) return;

        const renderKabupatenPolygons = () => {
          // Bersihkan layer desa/tetangga dari pilihan sebelumnya
          ['selected-desa-layer', 'selected-desa-outline', 'neighbor-desa-layer', 'neighbor-desa-outline'].forEach((id) => {
            if (map.getLayer(id)) map.removeLayer(id);
          });
          if (labelMarkerRef.current) {
            labelMarkerRef.current.remove();
            labelMarkerRef.current = null;
          }

          if (map.getSource('aiven-batas')) {
            (map.getSource('aiven-batas') as maplibregl.GeoJSONSource).setData(geoJsonData);
          } else {
            map.addSource('aiven-batas', { type: 'geojson', data: geoJsonData });
          }

          if (!map.getLayer('wilayah-fill')) {
            map.addLayer({
              id: 'wilayah-fill',
              type: 'fill',
              source: 'aiven-batas',
              paint: { 'fill-color': fillColor, 'fill-opacity': Number(opacityVal) * 0.7 }
            });
          }
          if (!map.getLayer('wilayah-outline')) {
            map.addLayer({
              id: 'wilayah-outline',
              type: 'line',
              source: 'aiven-batas',
              paint: { 'line-color': '#1e293b', 'line-width': 1.2 }
            });
          }

          try {
            const bbox = turf.bbox(geoJsonData);
            map.fitBounds(bbox as [number, number, number, number], { padding: 40, maxZoom: 12 });
            setTimeout(() => updateMapMetrics(map), 500);
          } catch (e) {
            console.error('Gagal fitBounds kabupaten:', e);
          }
        };

        runWhenReady(map, renderKabupatenPolygons);
      })
      .catch(() => setApiError('Gagal memuat data desa. Periksa server API lalu coba lagi.'))
      .finally(() => setLoadingKab(false));
  };

  const handleSelectDesa = (desa: string) => {
    setSelectedDesa(desa);
    if (!desa || !mapInstance.current || !currentGeoJsonRef.current) return;
    const map = mapInstance.current;

    const allFeatures = currentGeoJsonRef.current.features;
    const matchedFeatures = allFeatures.filter((f: any) => getFeatureName(f.properties).toLowerCase() === desa.toLowerCase());
    const otherFeatures = allFeatures.filter((f: any) => getFeatureName(f.properties).toLowerCase() !== desa.toLowerCase());
    if (matchedFeatures.length === 0) return;

    const selectedFeature = matchedFeatures[0];
    selectedFeatureRef.current = selectedFeature;
    const props = selectedFeature.properties || {};
    setSelectedProps(props);

    setJudulUtama('PETA ADMINISTRASI DESA');
    setNamaWilayahJudul(desa.toUpperCase());
    const kec = props.WADMKC || props.wadmkc || props.KECAMATAN || '';
    setSubJudul(`KECAMATAN ${kec ? kec.toUpperCase() + ' - ' : ''}KABUPATEN ${(selectedKab || '').toUpperCase()} - PROVINSI ${(selectedProv || '').toUpperCase()}`);

    if (map.getLayer('wilayah-fill')) map.removeLayer('wilayah-fill');
    if (map.getLayer('wilayah-outline')) map.removeLayer('wilayah-outline');

    // Desa-desa sekitar (konteks)
    const otherFc = turf.featureCollection(otherFeatures);
    if (map.getSource('neighbor-desa-source')) {
      (map.getSource('neighbor-desa-source') as maplibregl.GeoJSONSource).setData(otherFc);
    } else {
      map.addSource('neighbor-desa-source', { type: 'geojson', data: otherFc });
    }
    if (!map.getLayer('neighbor-desa-layer')) {
      map.addLayer({ id: 'neighbor-desa-layer', type: 'fill', source: 'neighbor-desa-source', paint: { 'fill-color': '#64748b', 'fill-opacity': 0.1 } });
    }
    if (!map.getLayer('neighbor-desa-outline')) {
      map.addLayer({ id: 'neighbor-desa-outline', type: 'line', source: 'neighbor-desa-source', paint: { 'line-color': neighborStrokeColor, 'line-width': 1.2, 'line-dasharray': [3, 2] } });
    }

    // Desa terpilih
    const selectedFc = turf.featureCollection(matchedFeatures);
    if (map.getSource('selected-desa-source')) {
      (map.getSource('selected-desa-source') as maplibregl.GeoJSONSource).setData(selectedFc);
    } else {
      map.addSource('selected-desa-source', { type: 'geojson', data: selectedFc });
    }
    if (map.getLayer('selected-desa-layer')) map.removeLayer('selected-desa-layer');
    if (map.getLayer('selected-desa-outline')) map.removeLayer('selected-desa-outline');
    map.addLayer({ id: 'selected-desa-layer', type: 'fill', source: 'selected-desa-source', paint: { 'fill-color': fillColor, 'fill-opacity': Number(opacityVal) } });
    map.addLayer({ id: 'selected-desa-outline', type: 'line', source: 'selected-desa-source', paint: { 'line-color': strokeColor, 'line-width': Number(strokeWidth) } });

    // Label nama desa (draggable)
    try {
      const centroid = turf.centroid(selectedFeature);
      const centerCoords = centroid.geometry.coordinates as [number, number];
      setLabelPos(centerCoords);

      if (labelMarkerRef.current) {
        labelMarkerRef.current.remove();
        labelMarkerRef.current = null;
      }

      const el = document.createElement('div');
      el.className = 'qgis-minimal-desa-label';
      el.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(6px);
        padding: 5px 13px;
        border-radius: 20px;
        border: 1px solid rgba(15, 23, 42, 0.20);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
        cursor: grab;
        user-select: none;
        white-space: nowrap;
        transform: translateX(-50%);
      `;
      el.title = 'Geser untuk memindahkan label desa';
      el.innerHTML = `
        <span style="color: #94a3b8; font-size: 10px; pointer-events:none;">⠿⠿</span>
        <span style="font-size: 11px; font-weight: 800; color: #0f172a; letter-spacing: 1px; text-transform: uppercase; font-family: 'Inter', system-ui, sans-serif; pointer-events:none;">${escapeHtml(desa)}</span>
      `;

      const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'top-left', offset: [0, 0] })
        .setLngLat(centerCoords)
        .addTo(map);

      marker.on('dragstart', () => {
        el.style.cursor = 'grabbing';
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.28)';
      });
      marker.on('dragend', () => {
        el.style.cursor = 'grab';
        el.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.18)';
        const newPos = marker.getLngLat();
        setLabelPos([newPos.lng, newPos.lat]);
      });

      labelMarkerRef.current = marker;
      if (!showLabels) el.style.display = 'none';
    } catch (err) {
      console.warn('Gagal membuat label centroid:', err);
    }

    // Zoom pas ke desa
    try {
      const bbox = turf.bbox(selectedFc);
      map.resize();
      map.fitBounds(bbox as [number, number, number, number], { padding: 70, maxZoom: 15 });
      setTimeout(() => updateMapMetrics(map), 600);
    } catch (e) {
      console.error('Gagal zoom ke desa:', e);
    }
  };

  const resetLabelPosition = () => {
    if (selectedFeatureRef.current && labelMarkerRef.current) {
      try {
        const coords = turf.centroid(selectedFeatureRef.current).geometry.coordinates as [number, number];
        labelMarkerRef.current.setLngLat(coords);
        setLabelPos(coords);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ===================== EKSPOR =====================
  const renderSheetToCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!sheetRef.current) return null;

    const ok = await ensureScript('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if (!ok) {
      alert('Library html2canvas gagal dimuat. Periksa koneksi internet lalu coba lagi.');
      return null;
    }

    const mainMap = mapInstance.current;
    const inset = insetInstance.current;

    await Promise.all([waitMapIdle(mainMap), waitMapIdle(inset)]);
    const [mainUrl, insetUrl] = await Promise.all([captureMapCanvas(mainMap), captureMapCanvas(inset)]);

    if (mainMap && mainUrl.length < 5000) {
      console.warn('Snapshot peta utama tampak kosong. Pastikan tile peta dasar sudah tampil sebelum ekspor.');
    }

    const cleanups: Array<() => void> = [];

    // Sembunyikan kontrol zoom, ikon atribusi, dan banner mode tambah AOI selama capture
    const hide = Array.from(sheetRef.current.querySelectorAll('.maplibregl-ctrl-group, .maplibregl-ctrl-attrib, [data-export-hide]')) as HTMLElement[];
    hide.forEach((el) => {
      const prev = el.style.display;
      el.style.display = 'none';
      cleanups.push(() => { el.style.display = prev; });
    });

    // Lepas skala tampilan (zoom-to-fit) agar hasil ekspor selalu berukuran asli 1020 x 680
    const scaler = scalerRef.current;
    if (scaler) {
      const prev = scaler.style.transform;
      scaler.style.transform = 'none';
      cleanups.push(() => { scaler.style.transform = prev; });
    }

    try {
      cleanups.push(await overlayMapSnapshot('[data-map-container="true"]', mainUrl));
      cleanups.push(await overlayMapSnapshot('[data-inset-container="true"]', insetUrl));
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      // Pastikan semua font sudah termuat sebelum diukur
      try { await (document as any).fonts?.ready; } catch (_) {}
      await new Promise((r) => setTimeout(r, 80));

      const node = sheetRef.current as HTMLElement;
      let canvas: HTMLCanvasElement | null = null;

      // Jalur utama: html-to-image memakai mesin teks browser sendiri, jadi posisi teks presisi
      const h2iOk = await ensureScript('htmlToImage', 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js');
      if (h2iOk) {
        try {
          const opts = {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: false,
            skipFonts: true,
            width: SHEET_W,
            height: SHEET_H,
            style: { transform: 'none', margin: '0' }
          };
          await (window as any).htmlToImage.toCanvas(node, opts); // pemanasan (wajib untuk Safari)
          canvas = await (window as any).htmlToImage.toCanvas(node, opts);
        } catch (err) {
          console.warn('html-to-image gagal, beralih ke html2canvas:', err);
          canvas = null;
        }
      }

      // Cadangan: html2canvas dengan perbaikan rendering teks
      if (!canvas) {
        canvas = await (window as any).html2canvas(node, {
          useCORS: true,
          allowTaint: false,
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff',
          width: SHEET_W,
          height: SHEET_H,
          windowWidth: Math.max(SHEET_W, window.innerWidth),
          windowHeight: Math.max(SHEET_H, window.innerHeight),
          scrollX: 0,
          scrollY: 0,
          onclone: (doc: Document) => {
            const st = doc.createElement('style');
            st.textContent = `
              * { -webkit-font-smoothing: auto !important; font-kerning: none !important;
                  font-variant-ligatures: none !important; text-rendering: geometricPrecision !important;
                  font-synthesis: none !important; }
            `;
            doc.head.appendChild(st);
          }
        });
      }
      if (!canvas) return null;
      return canvas;
    } finally {
      cleanups.reverse().forEach((fn) => fn());
    }
  };

  const exportFileBase = () => `Peta-Administrasi-${(selectedDesa || selectedKab || 'Wilayah').replace(/\s+/g, '-')}`;

  const izinEkspor = async (): Promise<boolean> => {
  if (!wilayahSiap) { alert('Pilih provinsi dan kabupaten/kota terlebih dahulu sebelum mengekspor.'); return false; }
  const res = await apiFetch('/api/ekspor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kabupaten: selectedKab }),
  });
  if (res.ok) { auth.refreshUser(); return true; } // kredit -1 terjadi di server saat ekspor
  const d = await res.json().catch(() => null);
  alert(d?.error || 'Tidak dapat mengekspor.');
  if (res.status === 402) setShowAccount(true);
  return false;
};
  const handleExportPNG = async () => {
    if (!(await izinEkspor())) return;
    setExporting('png');
    try {
      const canvas = await renderSheetToCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${exportFileBase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Gagal ekspor PNG:', err);
      alert('Gagal mengekspor PNG. Lihat console browser untuk detailnya.');
    } finally {
      setExporting('');
    }
  };

  const handleExportPDF = async () => {
    if (!(await izinEkspor())) return;
    setExporting('pdf');
    try {
      const pdfOk = await ensureScript('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      if (!pdfOk) {
        alert('Library jsPDF gagal dimuat. Periksa koneksi internet lalu coba lagi.');
        return;
      }
      const canvas = await renderSheetToCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, (pdf.internal.pageSize.getHeight() - pdfHeight) / 2, pdfWidth, pdfHeight);
      pdf.save(`${exportFileBase()}.pdf`);
    } catch (err) {
      console.error('Gagal ekspor PDF:', err);
      alert('Gagal mengekspor PDF. Lihat console browser untuk detailnya.');
    } finally {
      setExporting('');
    }
  };

  // Luas wilayah dari atribut GeoJSON, atau dihitung dari geometri
  const luasDesaKm2 = selectedProps?.LUAS
    ? Number(selectedProps.LUAS).toFixed(2)
    : (selectedFeatureRef.current ? (turf.area(selectedFeatureRef.current) / 1000000).toFixed(2) : '-');

  const regionTitle = selectedDesa ? `Desa ${selectedDesa}` : selectedKab ? selectedKab : 'Belum ada wilayah dipilih';
  const regionSub = selectedDesa ? subJudul : 'Pilih wilayah di panel pengaturan untuk memulai';

  return {
    sidebarOpen, setSidebarOpen, openSec, exporting, apiError, loadingKab, sheetScale, judulUtama,
    setJudulUtama, namaWilayahJudul, setNamaWilayahJudul, subJudul, setSubJudul, sumberData,
    setSumberData, pembuatPeta, setPembuatPeta, tahunPeta, setTahunPeta, basemapKey,
    insetBasemapKey, setInsetBasemapKey, geeActive, geeLoading, geeOpacity, setGeeOpacity, geeMask,
    setGeeMask, geeMsg, geeErr, toggleGeeLayer, fillColor, setFillColor, opacityVal, setOpacityVal,
    strokeColor, setStrokeColor, strokeWidth, setStrokeWidth, showNeighbors, setShowNeighbors,
    neighborStrokeColor, setNeighborStrokeColor, showLabels, setShowLabels, showCoordinateGrid,
    setShowCoordinateGrid, listProvinsi, selectedProv, listKabupaten, selectedKab, listDesa,
    selectedDesa, selectedProps, zoom, mapScale, scaleBarMeters, coordsDMS, mapContainer, sheetRef,
    scalerRef, paperRef, aoiList, setAoiList, isAddingAoi, setIsAddingAoi, selectedAoiId,
    setSelectedAoiId, showLegendBasemap, setShowLegendBasemap, insetContainer, toggleSec,
    wilayahSiap, patchAoi, loadProvinsi, handleBasemapChange, toggleAddAoi, cekKreditProvinsi,
    handleSelectProvinsi, handleSelectKabupaten, handleSelectDesa, resetLabelPosition,
    handleExportPNG, handleExportPDF, luasDesaKm2, regionTitle, regionSub
  };
}

export type MapEditor = ReturnType<typeof useMapEditor>;

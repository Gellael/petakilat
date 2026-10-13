import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import * as turf from '@turf/turf';
maplibregl.setWorkerUrl(workerUrl);

const API= import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface AoiItem {
  id: string;
  title: string;
  lng: number;
  lat: number;
  color: string;
  icon: string;
  imageUrl: string;
  imageCaption: string;
  calloutLng: number;
  calloutLat: number;
  showCallout: boolean;
  showInLegend: boolean;
  legendLabel: string;
  legendImageUrl: string;
}

const AOI_ICONS: { emoji: string; label: string }[] = [
  { emoji: '📍', label: 'Pin Lokasi' },
  { emoji: '📷', label: 'Kamera / Foto' },
  { emoji: '🏥', label: 'Fasilitas Kesehatan' },
  { emoji: '🏫', label: 'Fasilitas Pendidikan' },
  { emoji: '⚠️', label: 'Peringatan / Masalah' },
  { emoji: '🌊', label: 'Badan Air / Sungai' },
  { emoji: '🌿', label: 'Vegetasi / Lahan Hijau' },
  { emoji: '🏗️', label: 'Konstruksi / Bangunan' },
  { emoji: '🛣️', label: 'Jalan / Infrastruktur' },
  { emoji: '⭐', label: 'Titik Penting' },
  { emoji: '🔴', label: 'Titik Merah' },
  { emoji: '🔵', label: 'Titik Biru' },
];

const CARTO_KEY: string = ((import.meta as any).env?.VITE_CARTO_KEY as string | undefined) || '';

type BasemapTone = 'sat' | 'light' | 'dark';
interface BasemapDef {
  name: string;
  url: string;
  desc: string;
  thumb: string;
  group: string;
  tone: BasemapTone;
  attr: string;
  maxzoom?: number;
  needsKey?: 'carto';
}

const BASEMAP_GROUPS = ['Satelit', 'Terang', 'Gelap', 'Jalan & topografi'];

const CARTO_ATTR = '© OpenStreetMap contributors © CARTO';

const BASEMAP_TILES: Record<string, BasemapDef> = {
  citra: {
    name: 'Citra Satelit Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    desc: 'Citra satelit resolusi tinggi',
    thumb: 'linear-gradient(135deg,#34502f,#6b7a4f 45%,#46586a)',
    group: 'Satelit',
    tone: 'sat',
    attr: 'Esri, Maxar, Earthstar Geographics'
  },
  esri_lightgray: {
    name: 'Esri Abu-abu Terang',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    desc: 'Kanvas netral tanpa label, cocok untuk inset',
    thumb: 'linear-gradient(135deg,#eceeef,#cfd4d8)',
    group: 'Terang',
    tone: 'light',
    maxzoom: 16,
    attr: 'Esri, HERE, Garmin, OpenStreetMap contributors'
  },
  positron: {
    name: 'Carto Positron',
    url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    desc: 'Peta terang, bersih untuk cetak',
    thumb: 'linear-gradient(135deg,#f6f7f8,#dde2e6)',
    group: 'Terang',
    tone: 'light',
    needsKey: 'carto',
    attr: CARTO_ATTR
  },
  positron_nolabels: {
    name: 'Positron Tanpa Label',
    url: 'https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
    desc: 'Terang polos tanpa nama tempat',
    thumb: 'linear-gradient(135deg,#fbfbfb,#e6e9ec)',
    group: 'Terang',
    tone: 'light',
    needsKey: 'carto',
    attr: CARTO_ATTR
  },
  voyager: {
    name: 'Carto Voyager',
    url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    desc: 'Modern, hangat, mudah dibaca',
    thumb: 'linear-gradient(135deg,#f3efe6,#d7e6d3 55%,#bcd9e6)',
    group: 'Terang',
    tone: 'light',
    needsKey: 'carto',
    attr: CARTO_ATTR
  },
  esri_darkgray: {
    name: 'Esri Abu-abu Gelap',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    desc: 'Kanvas gelap netral',
    thumb: 'linear-gradient(135deg,#1f2327,#343a40 55%,#4a5159)',
    group: 'Gelap',
    tone: 'dark',
    maxzoom: 16,
    attr: 'Esri, HERE, Garmin, OpenStreetMap contributors'
  },
  dark: {
    name: 'Carto Dark Matter',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    desc: 'Mode gelap modern dengan label',
    thumb: 'linear-gradient(135deg,#0b0f17,#1c2433 55%,#2c3648)',
    group: 'Gelap',
    tone: 'dark',
    needsKey: 'carto',
    attr: CARTO_ATTR
  },
  dark_nolabels: {
    name: 'Dark Matter Tanpa Label',
    url: 'https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    desc: 'Gelap polos, batas wilayah menonjol',
    thumb: 'linear-gradient(135deg,#05070b,#141a26 55%,#222b3b)',
    group: 'Gelap',
    tone: 'dark',
    needsKey: 'carto',
    attr: CARTO_ATTR
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    desc: 'Jalan, pemukiman, dan toponimi',
    thumb: 'linear-gradient(135deg,#ece6d6,#c9dfb4 55%,#aad3df)',
    group: 'Jalan & topografi',
    tone: 'light',
    attr: '© OpenStreetMap contributors'
  },
  esri_street: {
    name: 'Esri Jalan',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    desc: 'Peta jalan klasik bergaya navigasi',
    thumb: 'linear-gradient(135deg,#f2eee3,#d6e4c8 50%,#a9cfe6)',
    group: 'Jalan & topografi',
    tone: 'light',
    attr: 'Esri, HERE, Garmin, OpenStreetMap contributors'
  },
  topo: {
    name: 'Esri Topografi',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    desc: 'Relief dan kontur medan',
    thumb: 'linear-gradient(135deg,#e8dcc0,#b9cf9c 55%,#c9b79a)',
    group: 'Jalan & topografi',
    tone: 'light',
    attr: 'Esri, HERE, Garmin, USGS, NGA'
  },
  opentopo: {
    name: 'OpenTopoMap',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    desc: 'Garis kontur dan bayangan lereng',
    thumb: 'linear-gradient(135deg,#d9e8c4,#e3d3a8 50%,#b8a58a)',
    group: 'Jalan & topografi',
    tone: 'light',
    maxzoom: 17,
    attr: '© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)'
  }
};

const isBasemapAvailable = (key: string) => !!BASEMAP_TILES[key] && (!BASEMAP_TILES[key].needsKey || !!CARTO_KEY);
const AVAILABLE_KEYS = Object.keys(BASEMAP_TILES).filter(isBasemapAvailable);
const basemapUrl = (b: BasemapDef) => (b.needsKey === 'carto' ? `${b.url}?key=${encodeURIComponent(CARTO_KEY)}` : b.url);

// Pilihan peta dasar khusus inset. 'sync' = ikut peta utama. Bawaan: peta terang polos yang lazim dipakai peta letak.
const INSET_SYNC = 'sync';
const DEFAULT_INSET_BASEMAP = CARTO_KEY ? 'positron_nolabels' : 'esri_lightgray';
const INSET_CHOICES: string[] = [
  INSET_SYNC,
  'positron_nolabels',
  'esri_lightgray',
  'positron',
  'voyager',
  'dark_nolabels',
  'esri_darkgray',
  'dark',
  'osm',
  'citra',
  'topo'
].filter((k) => k === INSET_SYNC || isBasemapAvailable(k));

const basemapThumb = (key: string) => (BASEMAP_TILES[key] || BASEMAP_TILES.citra).thumb;

const rasterSource = (key: string) => {
  const b = BASEMAP_TILES[key] && isBasemapAvailable(key) ? BASEMAP_TILES[key] : BASEMAP_TILES.citra;
  return { type: 'raster' as const, tiles: [basemapUrl(b)], tileSize: 256, maxzoom: b.maxzoom ?? 19 };
};

const BASE_SRC = 'raster-tiles';
const BASE_LAYER = 'simple-tile-layer';
const SHEET_W = 1020;
const SHEET_H = 680;
const SHEET_FONT = 'serif';
const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as any[] };

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hasCallout = (a: AoiItem) => a.showCallout && !!(a.imageUrl || a.imageCaption);
const expandBbox = (b: number[], f: number): [number, number, number, number] => {
  const dx = (b[2] - b[0]) * f;
  const dy = (b[3] - b[1]) * f;
  return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy];
};

const swapBasemap = (map: maplibregl.Map | null, key: string) => {
  if (!map) return;
  const run = () => {
    if (map.getLayer(BASE_LAYER)) map.removeLayer(BASE_LAYER);
    if (map.getSource(BASE_SRC)) map.removeSource(BASE_SRC);
    map.addSource(BASE_SRC, rasterSource(key));
    const beforeId = map.getStyle().layers.find((l) => l.id !== BASE_LAYER)?.id;
    map.addLayer({ id: BASE_LAYER, type: 'raster', source: BASE_SRC }, beforeId);
  };
  try {
    run();
  } catch (_) {
    map.once('load', () => {
      try { run(); } catch (e) { console.warn('Gagal mengganti peta dasar:', e); }
    });
  }
};

const runWhenReady = (map: maplibregl.Map, fn: () => void) => {
  try {
    fn();
  } catch (_) {
    map.once('load', fn);
  }
};

const GEE_LAYERS: { key: string; label: string }[] = [
  { key: 'elevation', label: 'Elevasi (SRTM)' },
  { key: 'ndwi', label: 'NDWI (indeks air)' },
  { key: 'ndvi', label: 'NDVI (vegetasi)' },
  { key: 'bangunan', label: 'Bangunan' },
  { key: 'sungai', label: 'Aliran air (garis)' },
  { key: 'jalan', label: 'Jalan (garis)' },
];

const GEE_LEGEND: Record<string, { label: string; box: CSSProperties }> = {
  elevation: { label: 'Elevasi (SRTM)', box: { background: 'linear-gradient(90deg,#006633,#E5FFCC,#662A00,#F5F5F5)', border: '1px solid #475569' } },
  ndwi: { label: 'NDWI (indeks air)', box: { background: 'linear-gradient(90deg,#ffffff,#9ecae1,#3182bd,#08306b)', border: '1px solid #475569' } },
  ndvi: { label: 'NDVI (vegetasi)', box: { background: 'linear-gradient(90deg,#ffffff,#ffffb2,#a1d99b,#006d2c)', border: '1px solid #475569' } },
  bangunan: { label: 'Bangunan (Google Open Buildings)', box: { backgroundColor: 'rgba(234,88,12,0.6)', border: '1px solid #7c2d12' } },
  sungai: { label: 'Aliran air', box: { height: '0px', borderTop: '2px solid #2563eb' } },
  jalan: { label: 'Jalan', box: { height: '0px', borderTop: '2px solid #334155' } },
};

const GEE_MASK_SRC = 'gee-mask-src';
const GEE_MASK_LAYER = 'gee-mask-layer';
const geeSrcId = (key: string) => `gee-src-${key}`;
const geeLayerId = (key: string) => `gee-layer-${key}`;
// Layer peta yang harus tetap berada DI ATAS layer GEE
const GEE_ABOVE = [GEE_MASK_LAYER, 'wilayah-fill', 'neighbor-desa-layer', 'selected-desa-layer'];

const removeGeeLayer = (map: maplibregl.Map | null, key: string) => {
  if (!map) return;
  try {
    if (map.getLayer(geeLayerId(key))) map.removeLayer(geeLayerId(key));
    if (map.getSource(geeSrcId(key))) map.removeSource(geeSrcId(key));
  } catch (_) {
    /* style peta belum siap */
  }
};

const addGeeLayer = (map: maplibregl.Map, key: string, tileUrl: string, opacity: number) => {
  removeGeeLayer(map, key);
  map.addSource(geeSrcId(key), { type: 'raster', tiles: [tileUrl], tileSize: 256 });
  const idx = GEE_LAYERS.findIndex((l) => l.key === key);
  const nextGee = GEE_LAYERS.slice(idx + 1).map((l) => geeLayerId(l.key)).find((id) => map.getLayer(id));
  const before = nextGee || GEE_ABOVE.find((id) => map.getLayer(id));
  map.addLayer(
    { id: geeLayerId(key), type: 'raster', source: geeSrcId(key), paint: { 'raster-opacity': opacity } },
    before
  );
};

// Penutup putih di luar batas desa terpilih, supaya layer GEE hanya terlihat di dalam desa
const updateGeeMask = (map: maplibregl.Map | null, feature: any, on: boolean) => {
  if (!map) return;
  try {
    if (map.getLayer(GEE_MASK_LAYER)) map.removeLayer(GEE_MASK_LAYER);
    if (!on || !feature) {
      if (map.getSource(GEE_MASK_SRC)) map.removeSource(GEE_MASK_SRC);
      return;
    }
    const masked = turf.mask(feature, turf.bboxPolygon([-180, -85, 180, 85]) as any);
    const src = map.getSource(GEE_MASK_SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(masked as any);
    else map.addSource(GEE_MASK_SRC, { type: 'geojson', data: masked as any });
    const before = ['wilayah-fill', 'neighbor-desa-layer', 'selected-desa-layer'].find((id) => map.getLayer(id));
    map.addLayer(
      { id: GEE_MASK_LAYER, type: 'fill', source: GEE_MASK_SRC, paint: { 'fill-color': '#ffffff', 'fill-opacity': 1 } },
      before
    );
  } catch (e) {
    console.warn('Gagal membuat penutup di luar desa:', e);
  }
};

// ===================== HELPER EKSPOR =====================
const ensureScript = (globalName: string, src: string): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any)[globalName]) return resolve(true);
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve(!!(window as any)[globalName]);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });

const waitMapIdle = (map: maplibregl.Map | null): Promise<void> =>
  new Promise((resolve) => {
    if (!map) return resolve();
    if (map.loaded() && !map.isMoving()) return resolve();
    const t = setTimeout(() => resolve(), 4000);
    map.once('idle', () => {
      clearTimeout(t);
      resolve();
    });
  });

const captureMapCanvas = (map: maplibregl.Map | null): Promise<string> =>
  new Promise((resolve) => {
    if (!map) return resolve('');
    let done = false;
    const grab = () => {
      if (done) return;
      done = true;
      try {
        resolve(map.getCanvas().toDataURL('image/png'));
      } catch (_) {
        resolve('');
      }
    };
    map.once('render', grab);
    map.triggerRepaint();
    setTimeout(grab, 1500);
  });

const overlayMapSnapshot = async (selector: string, url: string): Promise<() => void> => {
  if (!url) return () => {};
  const container = document.querySelector(selector) as HTMLElement | null;
  if (!container) return () => {};
  const glCanvas = container.querySelector('canvas.maplibregl-canvas') as HTMLCanvasElement | null;
  const img = document.createElement('img');
  img.setAttribute('data-export-snapshot', 'true');
  img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;';
  img.src = url;
  try { await img.decode(); } catch (_) {}
  if (glCanvas && glCanvas.parentNode) glCanvas.parentNode.insertBefore(img, glCanvas);
  else container.insertBefore(img, container.firstChild);
  const prevVisibility = glCanvas ? glCanvas.style.visibility : '';
  if (glCanvas) glCanvas.style.visibility = 'hidden';
  return () => {
    img.remove();
    if (glCanvas) glCanvas.style.visibility = prevVisibility;
  };
};

// ===================== MARKER AOI & KARTU FOTO =====================
const buildPinHtml = (aoi: AoiItem) => `
  <div style="background:${aoi.color};color:#fff;font-size:18px;width:32px;height:32px;border:2.5px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">${aoi.icon || '📍'}</div>
  <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${aoi.color};margin-top:-1px;"></div>
`;

// Kartu foto: foto di atas, keterangan di kotak putih tepat di bawah foto.
// Bila keterangan kosong, kotak putih memakai nama titik AOI.
const buildCalloutHtml = (a: AoiItem) => {
  const caption = (a.imageCaption || '').trim() || (a.title || '').trim();
  const radius = a.imageUrl ? '0 0 5px 5px' : '5px';
  return `
    ${a.imageUrl ? `<img src="${a.imageUrl}" alt="" style="display:block;width:100%;height:96px;object-fit:cover;border-radius:5px 5px 0 0;" />` : ''}
    <div style="background:#fff;color:#0f172a;padding:6px 8px;font-size:9.5px;line-height:1.4;font-weight:500;text-align:center;white-space:pre-wrap;word-break:break-word;border-radius:${radius};">${escapeHtml(caption)}</div>
  `;
};

const CALLOUT_FRAME_CSS = (color: string) => `
  background:${color};
  padding:3px;
  border-radius:8px;
  box-shadow:0 6px 18px rgba(0,0,0,.28);
  width:168px;
  font-family:Inter,system-ui,sans-serif;
  cursor:grab;
  user-select:none;
`;

// ===================== IKON UI (SVG INLINE) =====================
const ICON_PATHS: Record<string, ReactNode> = {
  chevron: <polyline points="6 9 12 15 18 9" />,
  map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>,
  layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
  trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  sliders: <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  'arrow-left': <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
  rotate: <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></>,
  search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  printer: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
  crosshair: <><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></>,
  menu: <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  compass: <><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></>
};

const Icon = ({ name, size = 16 }: { name: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {ICON_PATHS[name]}
  </svg>
);

// Simbol AOI di legenda: gambar buatan sendiri bila ada, jika tidak memakai ikon dan warna pin
const LegendSymbol = ({ aoi, size = 16 }: { aoi: AoiItem; size?: number }) =>
  aoi.legendImageUrl ? (
    <img src={aoi.legendImageUrl} alt="" style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  ) : (
    <span style={{ width: size, height: size, borderRadius: '50%', background: aoi.color, border: '1.5px solid #000', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.55), lineHeight: 1 }}>
      {aoi.icon || '📍'}
    </span>
  );

const legendName = (a: AoiItem, i: number) => (a.legendLabel || '').trim() || (a.title || '').trim() || `Titik ${i + 1}`;

// ===================== KOMPONEN FORM =====================
const Section = ({ step, title, badge, open, onToggle, children }: {
  step: number; title: string; badge?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode;
}) => (
  <section className={`gl-sec ${open ? 'is-open' : ''}`}>
    <button type="button" className="gl-sec__head" onClick={onToggle} aria-expanded={open}>
      <span className="gl-sec__step">{step}</span>
      <span className="gl-sec__title">{title}</span>
      {badge}
      <span className="gl-sec__chev"><Icon name="chevron" size={16} /></span>
    </button>
    {open && <div className="gl-sec__body">{children}</div>}
  </section>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="gl-toggle">
    <span>{label}</span>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <i aria-hidden="true" />
  </label>
);

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="gl-field">
    <span className="gl-label">{label}</span>
    <span className="gl-color">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="gl-color__sw" style={{ background: value }} />
      <code>{value.toUpperCase()}</code>
    </span>
  </label>
);

const RangeField = ({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void;
}) => (
  <label className="gl-field">
    <span className="gl-label gl-label--row"><span>{label}</span><b>{display}</b></span>
    <input type="range" className="gl-range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);

function SearchSelect({ label, value, options, placeholder, disabled, onChange }: {
  label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  const shown = filtered.slice(0, 200);
  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); };

  return (
    <div className="gl-field" ref={ref}>
      <span className="gl-label">{label}</span>
      <button type="button" className={`gl-select ${open ? 'is-open' : ''}`} disabled={disabled} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className={value ? 'gl-select__val' : 'gl-select__ph'}>{value || placeholder}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div className="gl-pop" role="listbox">
          <div className="gl-pop__search">
            <Icon name="search" size={14} />
            <input autoFocus placeholder="Ketik untuk mencari" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="gl-pop__list">
            {value && <button type="button" className="gl-pop__item gl-pop__item--clear" onClick={() => pick('')}>Kosongkan pilihan</button>}
            {shown.length === 0 && <div className="gl-pop__empty">Tidak ada hasil</div>}
            {shown.map((o) => (
              <button type="button" role="option" aria-selected={o === value} key={o} className={`gl-pop__item ${o === value ? 'is-on' : ''}`} onClick={() => pick(o)}>{o}</button>
            ))}
            {filtered.length > shown.length && <div className="gl-pop__empty">Menampilkan 200 dari {filtered.length}. Persempit pencarian.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// Panel formal pada lembar peta cetak (tidak diubah)
const Panel = ({ title, children, bodyStyle, style }: { title: string; children: ReactNode; bodyStyle?: CSSProperties; style?: CSSProperties }) => (
  <div style={{ border: '1.5px solid #000', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
    <div style={{ fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '1px', textAlign: 'center', textTransform: 'uppercase', borderBottom: '1px solid #ccc', margin: '6px 6px 0', paddingBottom: '2px' }}>
      {title}
    </div>
    <div style={{ padding: '5px 6px 6px', flex: 1, minHeight: 0, ...bodyStyle }}>{children}</div>
  </div>
);

// ===================== KONTEN HALAMAN UTAMA =====================
const FEATURES = [
  { icon: 'pin', title: 'Wilayah bertingkat', text: 'Pilih provinsi, kabupaten/kota, lalu desa atau kelurahan. Batas desa di sekitarnya ikut tampil sebagai konteks.' },
  { icon: 'file', title: 'Lembar peta otomatis', text: 'Judul, arah utara, skala, legenda, dan metadata tersusun mengikuti wilayah yang Anda pilih.' },
  { icon: 'layers', title: 'Banyak pilihan peta dasar', text: 'Citra satelit, peta terang, mode gelap (dark mode), jalan, dan topografi. Peta Carto tersedia bila API key gratisnya diisi.' },
  { icon: 'image', title: 'Titik AOI dan foto', text: 'Tandai lokasi, tempel foto lapangan dengan keterangannya, lalu hubungkan dengan garis penunjuk yang bisa digeser.' },
  { icon: 'compass', title: 'Peta inset', text: 'Inset menunjukkan letak desa terhadap wilayah sekitarnya. Peta dasarnya bisa dipilih sendiri, terpisah dari peta utama.' },
  { icon: 'download', title: 'Ekspor siap cetak', text: 'Unduh PNG resolusi tinggi atau PDF A4 lanskap langsung dari lembar peta.' }
];

const STEPS = [
  { title: 'Pilih wilayah', text: 'Tentukan provinsi, kabupaten/kota, dan desa yang ingin dipetakan.' },
  { title: 'Atur tampilan', text: 'Pilih peta dasar, warna isi, garis batas, dan label.' },
  { title: 'Tambah titik dan foto', text: 'Tandai lokasi penting dan lampirkan foto beserta keterangannya.' },
  { title: 'Unduh hasil', text: 'Periksa lembar peta, lalu ekspor sebagai PNG atau PDF.' }
];

const SPECS = [
  { k: 'Batas wilayah', v: 'Batas administrasi desa/kelurahan dari Badan Informasi Geospasial (BIG).' },
  { k: 'Penyimpanan data', v: 'PostgreSQL/PostGIS di Aiven, diakses melalui server API.' },
  { k: 'Peta dasar', v: 'Esri (citra, jalan, topografi, kanvas abu-abu), OpenStreetMap, OpenTopoMap, serta Carto (Positron, Voyager, Dark Matter) bila memakai API key.' },
  { k: 'Penggambaran peta', v: 'MapLibre GL JS. Luas dan batas tampilan dihitung dengan Turf.js.' },
  { k: 'Koordinat', v: 'Geografis WGS 84, ditulis dalam derajat, menit, dan detik.' },
  { k: 'Skala', v: 'Dihitung dari zoom dan lintang dengan asumsi layar 96 DPI. Anggap sebagai perkiraan.' },
  { k: 'Luas wilayah', v: 'Memakai atribut LUAS bila tersedia. Jika tidak, dihitung dari geometri.' },
  { k: 'Ekspor', v: 'PNG lewat html2canvas, PDF A4 lanskap lewat jsPDF.' }
];

const FAQS = [
  { q: 'Apakah titik AOI dan foto saya tersimpan?', a: 'Belum. Titik, foto, dan pengaturan hanya ada di browser selama halaman terbuka. Ekspor ke PNG atau PDF sebelum menutup atau memuat ulang halaman.' },
  { q: 'Seberapa akurat skala pada peta?', a: 'Skala dihitung dari zoom dan lintang peta dengan asumsi layar 96 DPI, jadi bersifat perkiraan. Ukuran akhir di kertas bergantung pada hasil ekspor dan pengaturan cetak.' },
  { q: 'Dari mana data batas desa berasal?', a: 'Dari Badan Informasi Geospasial (BIG), disimpan di basis data PostGIS dan disajikan lewat server API.' },
  { q: 'Daftar provinsi tidak muncul. Apa yang harus dilakukan?', a: 'Aplikasi mengambil data wilayah dari server API. Pastikan server berjalan, lalu tekan Coba lagi di panel pengaturan.' },
  { q: 'Format apa saja yang bisa diunduh?', a: 'PNG resolusi tinggi dan PDF A4 lanskap.' }
];

// ===================== STYLESHEET =====================
const APP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap');

.gl-root{
  --ink:#0f1b2d; --ink-2:#334155; --muted:#64748b; --line:#dde4ea; --line-2:#eef2f5;
  --paper:#f3f6f8; --surface:#ffffff; --brand:#0e7490; --brand-d:#155e75; --brand-soft:#e0f4f8;
  --sea:#0b3445; --danger:#dc2626; --danger-soft:#fee2e2;
  --shadow:0 1px 2px rgba(15,27,45,.06),0 10px 28px rgba(15,27,45,.12);
  position:fixed; inset:0; overflow:hidden; color:var(--ink); background:var(--paper);
  font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif; -webkit-font-smoothing:antialiased;
}
.gl-root *,.gl-root *::before,.gl-root *::after{box-sizing:border-box}
.gl-root button{font-family:inherit}
.gl-root :focus-visible{outline:2px solid var(--brand); outline-offset:2px}
@media (prefers-reduced-motion:reduce){
  .gl-root *{transition:none!important; animation:none!important; scroll-behavior:auto!important}
}

/* ---------- tombol ---------- */
.gl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,transform .1s;white-space:nowrap}
.gl-btn:hover{background:var(--line-2)}
.gl-btn:active{transform:translateY(1px)}
.gl-btn:disabled{opacity:.55;cursor:not-allowed}
.gl-btn--primary{background:var(--brand);border-color:var(--brand);color:#fff}
.gl-btn--primary:hover{background:var(--brand-d)}
.gl-btn--dark{background:var(--ink);border-color:var(--ink);color:#fff}
.gl-btn--dark:hover{background:#1e2c44}
.gl-btn--danger{background:var(--danger-soft);border-color:#fecaca;color:#b91c1c}
.gl-btn--danger:hover{background:#fecaca}
.gl-btn--block{width:100%}
.gl-btn--sm{height:32px;padding:0 10px;font-size:12px;border-radius:8px}
.gl-iconbtn{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer;flex-shrink:0;transition:background .15s}
.gl-iconbtn:hover{background:var(--line-2)}
.gl-iconbtn--danger:hover{background:var(--danger-soft);color:var(--danger);border-color:#fecaca}

/* ---------- aplikasi pembuat peta ---------- */
.gl-app{position:absolute;inset:0;display:flex}
.gl-side{width:392px;flex-shrink:0;display:flex;flex-direction:column;min-height:0;background:var(--surface);border-right:1px solid var(--line);z-index:30}
.gl-side__head{display:flex;align-items:center;gap:12px;padding:14px 14px 12px;border-bottom:1px solid var(--line)}
.gl-side__titles{flex:1;min-width:0}
.gl-side__title{font-family:Poppins,Inter,sans-serif;font-size:15px;font-weight:600;line-height:1.2}
.gl-side__sub{font-size:12px;color:var(--muted);margin-top:2px}
.gl-side__close{display:none}
.gl-side__body{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--paper);scrollbar-width:thin}
.gl-side__foot{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;border-top:1px solid var(--line);background:var(--surface)}

.gl-sec{background:var(--surface);border:1px solid var(--line);border-radius:14px;flex-shrink:0}
.gl-sec__head{width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;background:none;border:0;border-radius:14px;cursor:pointer;text-align:left;color:var(--ink)}
.gl-sec__step{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--brand-soft);color:var(--brand-d);font-size:12px;font-weight:700;flex-shrink:0}
.gl-sec__title{flex:1;font-size:14px;font-weight:600}
.gl-sec__chev{display:grid;color:var(--muted);transition:transform .2s}
.gl-sec.is-open .gl-sec__chev{transform:rotate(180deg)}
.gl-sec__body{display:flex;flex-direction:column;gap:14px;padding:2px 14px 14px}

.gl-field{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0}
.gl-label{font-size:12px;font-weight:600;color:var(--ink-2)}
.gl-label--row{display:flex;justify-content:space-between;gap:8px}
.gl-label--row b{font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}
.gl-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.gl-divider{height:1px;background:var(--line-2)}
.gl-input,.gl-textarea,.gl-select{width:100%;min-height:38px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px;transition:border-color .15s,box-shadow .15s}
.gl-input:focus,.gl-textarea:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(14,116,144,.18)}
.gl-textarea{min-height:68px;resize:vertical;line-height:1.4}
.gl-select{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;text-align:left}
.gl-select.is-open{border-color:var(--brand);box-shadow:0 0 0 3px rgba(14,116,144,.18)}
.gl-select:disabled{background:var(--paper);color:#94a3b8;cursor:not-allowed}
.gl-select__val{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-select__ph{color:#8493a6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-pop{position:absolute;left:0;right:0;top:100%;z-index:60;margin-top:4px;padding:6px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
.gl-pop__search{display:flex;align-items:center;gap:8px;padding:0 8px;margin-bottom:4px;border:1px solid var(--line);border-radius:8px;color:var(--muted)}
.gl-pop__search input{flex:1;min-width:0;height:34px;border:0;outline:0;background:none;font:inherit;font-size:13px;color:var(--ink)}
.gl-pop__list{max-height:220px;overflow-y:auto}
.gl-pop__item{display:block;width:100%;padding:8px 10px;border:0;border-radius:8px;background:none;font-size:13px;text-align:left;color:var(--ink);cursor:pointer}
.gl-pop__item:hover{background:var(--line-2)}
.gl-pop__item.is-on{background:var(--brand-soft);color:var(--brand-d);font-weight:600}
.gl-pop__item--clear{color:var(--muted);font-size:12px}
.gl-pop__empty{padding:10px;font-size:12px;color:var(--muted)}

.gl-basemaps{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gl-basemap{display:flex;flex-direction:column;gap:7px;padding:6px 6px 8px;border:1px solid var(--line);border-radius:12px;background:#fff;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.gl-basemap:hover{border-color:#b7c4d0}
.gl-basemap.is-on{border-color:var(--brand);box-shadow:0 0 0 2px rgba(14,116,144,.25)}
.gl-basemap__thumb{height:46px;border-radius:8px;border:1px solid rgba(15,27,45,.08)}
.gl-basemap__name{padding:0 4px;font-size:12px;font-weight:600;line-height:1.25;color:var(--ink)}
.gl-basemap__desc{padding:0 4px;margin-top:-4px;font-size:11px;line-height:1.3;color:var(--muted)}

.gl-bmgroup{display:flex;flex-direction:column;gap:8px}
.gl-subhead{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.gl-chips{display:flex;flex-wrap:wrap;gap:6px}
.gl-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 11px 5px 6px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink-2);font-size:12px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s}
.gl-chip:hover{border-color:#b7c4d0}
.gl-chip.is-on{border-color:var(--brand);background:var(--brand-soft);color:var(--brand-d);font-weight:600}
.gl-chip__dot{width:16px;height:16px;border-radius:50%;border:1px solid rgba(15,27,45,.15);flex-shrink:0}
.gl-legrow{display:flex;align-items:center;gap:8px}
.gl-legrow__sym{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:#fff;flex-shrink:0}
.gl-legrow__up{height:36px;padding:0 12px;font-size:12px}
.gl-color{position:relative;display:flex;align-items:center;gap:8px;height:38px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:#fff;cursor:pointer}
.gl-color input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.gl-color__sw{width:20px;height:20px;border-radius:6px;border:1px solid rgba(15,27,45,.2);flex-shrink:0}
.gl-color code{font:500 12px ui-monospace,Menlo,Consolas,monospace;color:var(--ink-2)}
.gl-range{width:100%;accent-color:var(--brand)}

.gl-toggle{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:var(--ink-2);cursor:pointer}
.gl-toggle input{position:absolute;opacity:0;width:1px;height:1px}
.gl-toggle i{position:relative;flex-shrink:0;width:36px;height:20px;border-radius:999px;background:#cbd5e1;transition:background .15s}
.gl-toggle i::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s}
.gl-toggle input:checked + i{background:var(--brand)}
.gl-toggle input:checked + i::after{transform:translateX(16px)}
.gl-toggle input:focus-visible + i{outline:2px solid var(--brand);outline-offset:2px}

.gl-note{padding:9px 11px;border-radius:10px;background:var(--paper);font-size:12px;line-height:1.5;color:var(--muted)}
.gl-note--warn{background:#fff6dc;color:#7a5200}
.gl-note--err{background:var(--danger-soft);color:#991b1b;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.gl-badge{padding:2px 9px;border-radius:999px;background:var(--brand-soft);color:var(--brand-d);font-size:11px;font-weight:600}

.gl-aoi-list{display:flex;flex-direction:column;gap:8px}
.gl-aoi{border:1px solid var(--line);border-radius:12px;background:#fff}
.gl-aoi.is-open{border-color:var(--brand);box-shadow:0 0 0 2px rgba(14,116,144,.12)}
.gl-aoi__head{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 6px}
.gl-aoi__toggle{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:2px;border:0;background:none;text-align:left;cursor:pointer;color:var(--ink);border-radius:8px}
.gl-aoi__chip{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;font-size:15px;flex-shrink:0;color:#fff}
.gl-aoi__name{flex:1;min-width:0;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-aoi__body{display:flex;flex-direction:column;gap:14px;padding:12px;border-top:1px solid var(--line-2)}
.gl-icons{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.gl-icons button{display:grid;place-items:center;aspect-ratio:1;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:18px;cursor:pointer;transition:background .15s}
.gl-icons button:hover{background:var(--line-2)}
.gl-icons button.is-on{border-width:2px}
.gl-coords{padding:7px 10px;border-radius:8px;background:var(--paper);font:500 12px ui-monospace,Menlo,Consolas,monospace;color:var(--ink-2)}
.gl-upload{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:92px;padding:12px;border:1.5px dashed #a9cfda;border-radius:12px;background:#f3fafc;color:var(--brand-d);font-size:12px;font-weight:600;text-align:center;cursor:pointer}
.gl-upload:hover{background:#e7f5f9}
.gl-upload input{display:none}
.gl-cardprev{position:relative;border-radius:10px;padding:3px;width:168px;max-width:100%;box-shadow:0 4px 12px rgba(15,27,45,.2)}
.gl-cardprev img{display:block;width:100%;height:96px;object-fit:cover;border-radius:7px 7px 0 0}
.gl-cardprev__cap{padding:6px 8px;background:#fff;color:#0f172a;font-size:10px;line-height:1.4;font-weight:500;text-align:center;white-space:pre-wrap;word-break:break-word;border-radius:0 0 7px 7px}
.gl-cardprev__cap--solo{border-radius:7px}
.gl-cardprev__x{position:absolute;top:8px;right:8px;width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:6px;background:rgba(15,27,45,.72);color:#fff;cursor:pointer}
.gl-cardprev__x:hover{background:var(--danger)}

/* ---------- area peta ---------- */
.gl-stage{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--paper)}
.gl-toolbar{display:flex;align-items:center;gap:12px;min-height:58px;padding:8px 16px;background:var(--surface);border-bottom:1px solid var(--line)}
.gl-toolbar__text{flex:1;min-width:0}
.gl-toolbar__title{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-toolbar__sub{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-toolbar__chips{display:flex;gap:8px}
.gl-chip{display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:var(--paper);font-size:12px;font-weight:500;color:var(--ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.gl-menu-btn{display:none}
.gl-paper{flex:1;min-height:0;overflow:auto;display:grid;place-items:center;padding:20px;background-color:#e8edf1;background-image:radial-gradient(#cdd6de 1px,transparent 1px);background-size:18px 18px}
.gl-backdrop{display:none}

@media (max-width:900px){
  .gl-side{position:fixed;top:0;bottom:0;left:0;width:min(420px,92vw);visibility:hidden;transform:translateX(-102%);transition:transform .25s ease,visibility .25s;box-shadow:var(--shadow)}
  .gl-side.is-open{visibility:visible;transform:none}
  .gl-side__close{display:inline-grid}
  .gl-backdrop{display:block;position:fixed;inset:0;z-index:25;background:rgba(15,27,45,.45)}
  .gl-menu-btn{display:inline-flex}
  .gl-toolbar__chips .gl-chip:last-child{display:none}
  .gl-paper{padding:12px}
}

/* ---------- halaman utama ---------- */
.gl-home{position:absolute;inset:0;overflow-x:hidden;overflow-y:auto;background:var(--surface);scroll-behavior:smooth}
.gl-nav{position:sticky;top:0;z-index:40;height:72px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 clamp(16px,5vw,64px);color:#fff;transition:background .2s,box-shadow .2s}
.gl-nav.is-solid{background:rgba(7,32,47,.94);backdrop-filter:blur(10px);box-shadow:0 1px 0 rgba(255,255,255,.08)}
.gl-brand{display:flex;align-items:center;gap:10px;padding:0;border:0;background:none;color:inherit;text-align:left;cursor:pointer}
.gl-brand__mark{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#2cc3df,#0e7490);color:#fff}
.gl-brand__name{font-family:Poppins,Inter,sans-serif;font-size:17px;font-weight:600;line-height:1.1}
.gl-brand__sub{margin-top:2px;font-size:11px;opacity:.72}
.gl-nav__links{display:flex;align-items:center;gap:28px}
.gl-link{padding:6px 0;border:0;border-bottom:2px solid transparent;background:none;color:inherit;font:inherit;font-size:15px;font-weight:500;cursor:pointer;opacity:.92}
.gl-link:hover{border-bottom-color:rgba(255,255,255,.8);opacity:1}
.gl-btn--light{height:40px;border:1px solid rgba(255,255,255,.75);background:transparent;color:#fff}
.gl-btn--light:hover{background:#fff;color:var(--sea)}
.gl-nav__toggle{display:none;border-color:rgba(255,255,255,.4);background:transparent;color:#fff}
.gl-nav__toggle:hover{background:rgba(255,255,255,.12)}

.gl-hero{position:relative;margin-top:-72px;min-height:100vh;min-height:100svh;padding:96px clamp(16px,5vw,64px) clamp(20px,4vh,48px);display:flex;flex-direction:column;justify-content:flex-end;gap:clamp(24px,6vh,64px);color:#fff;
  background:
    linear-gradient(180deg,rgba(5,22,33,.5) 0%,rgba(5,22,33,.1) 45%,rgba(5,22,33,.5) 100%),
    url('/hero.jpg') center/cover no-repeat,
    radial-gradient(circle at 78% 22%,rgba(44,195,223,.3),transparent 42%),
    repeating-radial-gradient(circle at 20% 36%,transparent 0 26px,rgba(255,255,255,.07) 27px 28px),
    repeating-radial-gradient(circle at 84% 72%,transparent 0 34px,rgba(255,255,255,.05) 35px 36px),
    linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px) 0 0/72px 72px,
    linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px) 0 0/72px 72px,
    linear-gradient(160deg,#07202f 0%,#0b3a4a 55%,#0f4f5e 100%)}
.gl-hero__copy{max-width:760px}
.gl-hero h1{margin:0 0 16px;font-family:Poppins,Inter,sans-serif;font-size:clamp(32px,5.2vw,62px);font-weight:600;line-height:1.08;letter-spacing:-.015em}
.gl-hero p{margin:0;max-width:56ch;font-size:clamp(16px,1.6vw,19px);line-height:1.55;color:rgba(255,255,255,.86)}
.gl-split{display:grid;grid-template-columns:1fr 1fr;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.gl-card{display:flex;flex-direction:column;gap:18px;min-height:300px;padding:clamp(24px,3.2vw,48px)}
.gl-card--light{background:rgba(236,242,245,.93);color:var(--ink);backdrop-filter:blur(6px)}
.gl-card--dark{background:rgba(8,50,64,.93);color:#fff}
.gl-card h2{margin:0;font-family:Poppins,Inter,sans-serif;font-size:clamp(28px,3.6vw,48px);font-weight:600;line-height:1.05;letter-spacing:-.01em}
.gl-card--light h2{color:var(--brand)}
.gl-card p{margin:0;max-width:34ch;font-size:clamp(16px,1.6vw,21px);line-height:1.4}
.gl-card__actions{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:14px}
.gl-ghost{height:52px;padding:0 12px;border:1px solid currentColor;border-radius:4px;background:transparent;color:inherit;font:inherit;font-size:16px;cursor:pointer;transition:background .15s,color .15s}
.gl-card--light .gl-ghost{border-color:var(--brand)}
.gl-card--light .gl-ghost:hover{background:var(--brand);color:#fff}
.gl-card--light .gl-ghost--fill{background:var(--brand);color:#fff}
.gl-card--light .gl-ghost--fill:hover{background:var(--brand-d)}
.gl-card--dark .gl-ghost{border-color:rgba(255,255,255,.85)}
.gl-card--dark .gl-ghost:hover{background:#fff;color:var(--sea)}

.gl-sect{scroll-margin-top:72px;padding:clamp(48px,8vw,96px) clamp(16px,5vw,64px)}
.gl-sect--tint{background:var(--paper)}
.gl-wrap{max-width:1120px;margin:0 auto}
.gl-sect h2{margin:0 0 14px;font-family:Poppins,Inter,sans-serif;font-size:clamp(26px,3.2vw,40px);font-weight:600;line-height:1.12;letter-spacing:-.01em}
.gl-lead{max-width:62ch;margin:0 0 14px;font-size:17px;line-height:1.65;color:var(--ink-2)}
.gl-about{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(28px,6vw,80px);align-items:start}
.gl-facts{margin:0;padding:0}
.gl-facts div{display:flex;justify-content:space-between;gap:16px;padding:15px 0;border-top:1px solid var(--line)}
.gl-facts div:last-child{border-bottom:1px solid var(--line)}
.gl-facts dt{color:var(--muted);font-size:15px}
.gl-facts dd{margin:0;font-size:15px;font-weight:600;text-align:right}
.gl-feats{display:grid;grid-template-columns:repeat(3,1fr);gap:0 clamp(24px,4vw,56px);margin-top:32px}
.gl-feat{padding:24px 0 28px;border-top:1px solid var(--line)}
.gl-feat__ic{display:inline-grid;place-items:center;width:42px;height:42px;margin-bottom:14px;border-radius:12px;background:var(--brand-soft);color:var(--brand-d)}
.gl-feat h3{margin:0 0 6px;font-size:17px;font-weight:600}
.gl-feat p{margin:0;font-size:15px;line-height:1.6;color:var(--ink-2)}
.gl-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(20px,3vw,40px);margin:36px 0 0;padding:0;list-style:none}
.gl-step{padding-top:18px;border-top:2px solid var(--brand)}
.gl-step__n{display:grid;place-items:center;width:30px;height:30px;margin-bottom:12px;border-radius:50%;background:var(--brand);color:#fff;font-size:14px;font-weight:700}
.gl-step h3{margin:0 0 6px;font-size:17px;font-weight:600}
.gl-step p{margin:0;font-size:15px;line-height:1.6;color:var(--ink-2)}
.gl-spec{margin:28px 0 0;padding:0}
.gl-spec div{display:grid;grid-template-columns:220px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--line)}
.gl-spec div:last-child{border-bottom:1px solid var(--line)}
.gl-spec dt{font-size:15px;font-weight:600}
.gl-spec dd{margin:0;font-size:15px;line-height:1.6;color:var(--ink-2)}
.gl-faq{max-width:780px;margin-top:24px}
.gl-faq details{padding:18px 0;border-top:1px solid var(--line)}
.gl-faq details:last-child{border-bottom:1px solid var(--line)}
.gl-faq summary{display:flex;justify-content:space-between;gap:16px;font-size:17px;font-weight:600;cursor:pointer;list-style:none}
.gl-faq summary::-webkit-details-marker{display:none}
.gl-faq summary::after{content:'+';color:var(--brand);font-size:22px;line-height:1}
.gl-faq details[open] summary::after{content:'\\2212'}
.gl-faq details p{margin:10px 0 0;max-width:62ch;font-size:15px;line-height:1.65;color:var(--ink-2)}
.gl-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;padding:36px clamp(16px,5vw,64px);background:#07202f;color:#cfe3ea}
.gl-foot b{display:block;color:#fff;font-family:Poppins,Inter,sans-serif;font-weight:600;font-size:16px}
.gl-foot span{font-size:14px}

@media (max-width:1000px){
  .gl-feats{grid-template-columns:repeat(2,1fr)}
  .gl-steps{grid-template-columns:repeat(2,1fr)}
}
@media (max-width:860px){
  .gl-nav__toggle{display:inline-grid}
  .gl-nav__links{display:none;position:absolute;top:72px;left:12px;right:12px;flex-direction:column;align-items:stretch;gap:0;padding:8px;border-radius:14px;background:rgba(7,32,47,.97);box-shadow:var(--shadow)}
  .gl-nav__links.is-open{display:flex}
  .gl-nav__links .gl-link{padding:13px 14px;border:0;text-align:left}
  .gl-nav__links .gl-btn--light{margin:6px}
  .gl-split{grid-template-columns:1fr}
  .gl-card{min-height:0}
  .gl-about{grid-template-columns:1fr}
  .gl-spec div{grid-template-columns:1fr;gap:4px}
}
@media (max-width:600px){
  .gl-feats,.gl-steps{grid-template-columns:1fr}
  .gl-card__actions{grid-template-columns:1fr}
  .gl-side__foot{grid-template-columns:1fr}
}
`;

// ===================== APLIKASI =====================
export default function App() {
  // Halaman aktif disimpan di URL (#/peta) supaya refresh tetap di halaman yang sama
  const [activePage, setActivePage] = useState<'home' | 'admin-map'>(() =>
    window.location.hash === '#/peta' ? 'admin-map' : 'home'
  );
  useEffect(() => {
    const want = activePage === 'admin-map' ? '#/peta' : '';
    if (window.location.hash !== want) {
      window.history.pushState(null, '', window.location.pathname + window.location.search + want);
    }
  }, [activePage]);
  useEffect(() => {
    const onPop = () => setActivePage(window.location.hash === '#/peta' ? 'admin-map' : 'home');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [navOpen, setNavOpen] = useState<boolean>(false);
  const [navSolid, setNavSolid] = useState<boolean>(false);
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
      const res = await fetch(`${API}/api/gee-tiles?layer=${encodeURIComponent(key)}`);
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
  const patchAoi = (id: string, patch: Partial<AoiItem>) =>
    setAoiList((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const goTo = (id: string) => {
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openApp = () => {
    setNavOpen(false);
    setActivePage('admin-map');
  };

  // Konversi Derajat Desimal ke Format DMS
  const toDMS = (val: number, isLat: boolean) => {
    if (isNaN(val)) return '-';
    const abs = Math.abs(val);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = Math.round(((abs - d) * 60 - m) * 60);
    const dir = isLat ? (val >= 0 ? 'LU' : 'LS') : (val >= 0 ? 'BT' : 'BB');
    return `${d}° ${m.toString().padStart(2, '0')}' ${s.toString().padStart(2, '0')}" ${dir}`;
  };

  const getFeatureName = (props: any) => {
    if (!props) return '';
    return (
      props.WADMKD || props.wadmkd ||
      props.NAMOBJ || props.namobj ||
      props.DESA || props.desa || ''
    );
  };

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
    fetch(`${API}/api/get-desa?kabupaten=${encodeURIComponent(kab)}`)
      .then((res) => res.json())
      .then((geoJsonData) => {
        if (!geoJsonData || !geoJsonData.features) return;
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

      const canvas: HTMLCanvasElement = await (window as any).html2canvas(sheetRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });
      return canvas;
    } finally {
      cleanups.reverse().forEach((fn) => fn());
    }
  };

  const exportFileBase = () => `Peta-Administrasi-${(selectedDesa || selectedKab || 'Wilayah').replace(/\s+/g, '-')}`;

  const handleExportPNG = async () => {
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

  return (
    <div className="gl-root">
      <style>{APP_CSS}</style>

      {/* ----------------- HALAMAN UTAMA ----------------- */}
      {activePage === 'home' && (
        <div className="gl-home" onScroll={(e) => setNavSolid(e.currentTarget.scrollTop > 24)}>
          <header className={`gl-nav ${navSolid || navOpen ? 'is-solid' : ''}`}>
            <button type="button" className="gl-brand" onClick={() => document.querySelector('.gl-home')?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="GeoLayout, kembali ke atas">
              <span className="gl-brand__mark"><Icon name="globe" size={20} /></span>
              <span>
                <span className="gl-brand__name" style={{ display: 'block' }}>GeoLayout</span>
                <span className="gl-brand__sub" style={{ display: 'block' }}>Modern WebGIS Cartographic Suite</span>
              </span>
            </button>

            <button type="button" className="gl-iconbtn gl-nav__toggle" onClick={() => setNavOpen((o) => !o)} aria-label={navOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={navOpen}>
              <Icon name={navOpen ? 'x' : 'menu'} size={20} />
            </button>

            <nav className={`gl-nav__links ${navOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
              <button type="button" className="gl-link" onClick={() => goTo('tentang')}>Tentang</button>
              <button type="button" className="gl-link" onClick={() => goTo('fitur')}>Fitur</button>
              <button type="button" className="gl-link" onClick={() => goTo('cara-kerja')}>Cara kerja</button>
              <button type="button" className="gl-link" onClick={() => goTo('metodologi')}>Metodologi</button>
              <button type="button" className="gl-link" onClick={() => goTo('faq')}>FAQ</button>
              <button type="button" className="gl-btn gl-btn--light" onClick={openApp}>Buka aplikasi</button>
            </nav>
          </header>

          <section className="gl-hero">
            <div className="gl-hero__copy">
              <h1>Susun peta administrasi desa yang siap cetak</h1>
              <p>GeoLayout menyusun lembar peta desa atau kelurahan lengkap dengan judul, arah utara, skala, legenda, dan metadata. Pilih wilayah, atur tampilan, lalu unduh sebagai PNG atau PDF A4.</p>
            </div>

            <div className="gl-split">
              <article className="gl-card gl-card--light">
                <h2>Peta administrasi</h2>
                <p>Buat lembar peta desa atau kelurahan, lengkap dengan titik AOI dan foto lapangan.</p>
                <div className="gl-card__actions">
                  <button type="button" className="gl-ghost" onClick={() => goTo('fitur')}>Fitur</button>
                  <button type="button" className="gl-ghost gl-ghost--fill" onClick={openApp}>Buka aplikasi</button>
                </div>
              </article>
              <article className="gl-card gl-card--dark">
                <h2>Data dan metodologi</h2>
                <p>Batas wilayah dari BIG, disimpan di PostGIS, digambar dengan MapLibre.</p>
                <div className="gl-card__actions">
                  <button type="button" className="gl-ghost" onClick={() => goTo('metodologi')}>Metodologi</button>
                  <button type="button" className="gl-ghost" onClick={() => goTo('faq')}>Tanya jawab</button>
                </div>
              </article>
            </div>
          </section>

          <section id="tentang" className="gl-sect">
            <div className="gl-wrap gl-about">
              <div>
                <h2>Tentang GeoLayout</h2>
                <p className="gl-lead">GeoLayout adalah aplikasi web untuk membuat peta administrasi desa dan kelurahan dengan tata letak kartografi, mengikuti gaya lembar peta cetak seperti pada QGIS Print Composer.</p>
                <p className="gl-lead">Seluruh proses berjalan di browser: dari memilih wilayah, mengatur simbologi, menambahkan foto lapangan, sampai mengunduh hasilnya. Proyek S1 Informatika, Universitas Bengkulu.</p>
              </div>
              <dl className="gl-facts">
                <div><dt>Koordinat</dt><dd>Geografis WGS 84</dd></div>
                <div><dt>Peta dasar</dt><dd>{AVAILABLE_KEYS.length} pilihan</dd></div>
                <div><dt>Skala</dt><dd>Otomatis dari zoom peta</dd></div>
                <div><dt>Ekspor</dt><dd>PNG dan PDF A4 lanskap</dd></div>
              </dl>
            </div>
          </section>

          <section id="fitur" className="gl-sect gl-sect--tint">
            <div className="gl-wrap">
              <h2>Fitur</h2>
              <p className="gl-lead">Semua yang dibutuhkan untuk satu lembar peta administrasi, tanpa perangkat lunak tambahan.</p>
              <div className="gl-feats">
                {FEATURES.map((f) => (
                  <div className="gl-feat" key={f.title}>
                    <span className="gl-feat__ic"><Icon name={f.icon} size={22} /></span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="cara-kerja" className="gl-sect">
            <div className="gl-wrap">
              <h2>Cara kerja</h2>
              <p className="gl-lead">Empat langkah dari wilayah kosong sampai peta siap cetak.</p>
              <ol className="gl-steps">
                {STEPS.map((s, i) => (
                  <li className="gl-step" key={s.title}>
                    <span className="gl-step__n">{i + 1}</span>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="metodologi" className="gl-sect gl-sect--tint">
            <div className="gl-wrap">
              <h2>Data dan metodologi</h2>
              <p className="gl-lead">Dari mana data berasal dan bagaimana hasilnya dihitung.</p>
              <dl className="gl-spec">
                {SPECS.map((s) => (
                  <div key={s.k}><dt>{s.k}</dt><dd>{s.v}</dd></div>
                ))}
              </dl>
            </div>
          </section>

          <section id="faq" className="gl-sect">
            <div className="gl-wrap">
              <h2>Pertanyaan yang sering diajukan</h2>
              <div className="gl-faq">
                {FAQS.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <footer className="gl-foot">
            <div>
              <b>GeoLayout</b>
              <span>Informatika, Universitas Bengkulu</span>
            </div>
            <button type="button" className="gl-btn gl-btn--light" onClick={openApp}>Buka aplikasi</button>
          </footer>
        </div>
      )}

      {/* ----------------- APLIKASI PEMBUAT PETA ADMINISTRASI ----------------- */}
      <div className="gl-app" style={{ display: activePage === 'admin-map' ? 'flex' : 'none' }}>
        {sidebarOpen && <div className="gl-backdrop" onClick={() => setSidebarOpen(false)} />}

        <aside className={`gl-side ${sidebarOpen ? 'is-open' : ''}`} aria-label="Panel pengaturan peta">
          <div className="gl-side__head">
            <button type="button" className="gl-iconbtn" onClick={() => setActivePage('home')} aria-label="Kembali ke beranda" title="Kembali ke beranda">
              <Icon name="arrow-left" size={18} />
            </button>
            <div className="gl-side__titles">
              <div className="gl-side__title">Pembuat peta administrasi</div>
              <div className="gl-side__sub">Hasil tampil langsung di lembar peta</div>
            </div>
            <button type="button" className="gl-iconbtn gl-side__close" onClick={() => setSidebarOpen(false)} aria-label="Tutup panel">
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className="gl-side__body">
            {/* 1. LOKASI */}
            <Section step={1} title="Lokasi wilayah" open={!!openSec.lokasi} onToggle={() => toggleSec('lokasi')}>
              {apiError && (
                <div className="gl-note gl-note--err">
                  <span>{apiError}</span>
                  <button type="button" className="gl-btn gl-btn--sm" onClick={loadProvinsi}>
                    <Icon name="rotate" size={14} /> Coba lagi
                  </button>
                </div>
              )}
              <SearchSelect label="Provinsi" value={selectedProv} options={listProvinsi} placeholder="Pilih provinsi" onChange={handleSelectProvinsi} />
              <SearchSelect label="Kabupaten / kota" value={selectedKab} options={listKabupaten} disabled={!selectedProv} placeholder={selectedProv ? 'Pilih kabupaten / kota' : 'Pilih provinsi dahulu'} onChange={handleSelectKabupaten} />
              <SearchSelect label="Desa / kelurahan" value={selectedDesa} options={listDesa} disabled={!selectedKab || loadingKab} placeholder={loadingKab ? 'Memuat data desa...' : selectedKab ? 'Pilih desa / kelurahan' : 'Pilih kabupaten dahulu'} onChange={handleSelectDesa} />
            </Section>

            {/* 2. PETA DASAR */}
            <Section step={2} title="Peta dasar" open={!!openSec.dasar} onToggle={() => toggleSec('dasar')}>
              {BASEMAP_GROUPS.filter((g) => AVAILABLE_KEYS.some((k) => BASEMAP_TILES[k].group === g)).map((g) => (
                <div className="gl-bmgroup" key={g}>
                  <div className="gl-subhead">{g}</div>
                  <div className="gl-basemaps">
                    {Object.entries(BASEMAP_TILES).filter(([key, item]) => item.group === g && isBasemapAvailable(key)).map(([key, item]) => (
                      <button type="button" key={key} className={`gl-basemap ${basemapKey === key ? 'is-on' : ''}`} onClick={() => handleBasemapChange(key)} aria-pressed={basemapKey === key}>
                        <span className="gl-basemap__thumb" style={{ background: item.thumb }} />
                        <span className="gl-basemap__name">{item.name}</span>
                        <span className="gl-basemap__desc">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {!CARTO_KEY && (
                <div className="gl-note">Peta Carto (Positron, Voyager, Dark Matter) disembunyikan karena sekarang butuh API key. Key-nya gratis. Isi <code>VITE_CARTO_KEY=key_anda</code> di file <code>.env</code> frontend, lalu jalankan ulang <code>npm run dev</code> atau build ulang.</div>
              )}

              <div className="gl-divider" />

              <div className="gl-bmgroup">
                <div className="gl-subhead">Peta dasar inset</div>
                <div className="gl-chips" role="group" aria-label="Peta dasar inset">
                  {INSET_CHOICES.map((key) => {
                    const isSync = key === INSET_SYNC;
                    const label = isSync ? 'Ikuti peta utama' : BASEMAP_TILES[key].name;
                    const thumb = isSync ? basemapThumb(basemapKey) : BASEMAP_TILES[key].thumb;
                    return (
                      <button type="button" key={key} className={`gl-chip ${insetBasemapKey === key ? 'is-on' : ''}`} onClick={() => setInsetBasemapKey(key)} aria-pressed={insetBasemapKey === key}>
                        <span className="gl-chip__dot" style={{ background: thumb }} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="gl-note">Peta inset di lembar peta bebas dipilih terpisah dari peta utama. Bawaannya peta terang tanpa label, seperti peta letak pada umumnya.</div>
              </div>
            </Section>

            {/* 3. SIMBOLOGI */}
            <Section step={3} title="Simbologi batas wilayah" open={!!openSec.simbol} onToggle={() => toggleSec('simbol')}>
              <div className="gl-row">
                <ColorField label="Warna isi" value={fillColor} onChange={setFillColor} />
                <RangeField label="Opasitas isi" value={opacityVal} min={0.1} max={1} step={0.05} display={`${Math.round(opacityVal * 100)}%`} onChange={setOpacityVal} />
              </div>
              <div className="gl-row">
                <ColorField label="Garis batas desa" value={strokeColor} onChange={setStrokeColor} />
                <RangeField label="Tebal garis" value={strokeWidth} min={1} max={8} step={0.5} display={`${strokeWidth} px`} onChange={setStrokeWidth} />
              </div>
              <div className="gl-divider" />
              <ColorField label="Warna garis batas sekitar" value={neighborStrokeColor} onChange={setNeighborStrokeColor} />
              <Toggle label="Tampilkan batas desa sekitar" checked={showNeighbors} onChange={setShowNeighbors} />
              <Toggle label="Tampilkan label nama desa" checked={showLabels} onChange={setShowLabels} />
              {selectedDesa && showLabels && (
                <button type="button" className="gl-btn gl-btn--sm" style={{ alignSelf: 'flex-start' }} onClick={resetLabelPosition}>
                  <Icon name="rotate" size={14} /> Kembalikan posisi label
                </button>
              )}
              <Toggle label="Tampilkan grid dan koordinat" checked={showCoordinateGrid} onChange={setShowCoordinateGrid} />
            </Section>

            {/* 4. LAYER GOOGLE EARTH ENGINE */}
            <Section step={4} title="Layer Google Earth Engine" open={!!openSec.gee} onToggle={() => toggleSec('gee')} badge={Object.values(geeActive).some(Boolean) ? <span className="gl-badge">{Object.values(geeActive).filter(Boolean).length} aktif</span> : undefined}>
              <div className="gl-subhead">Layer (boleh lebih dari satu)</div>
              {GEE_LAYERS.map((l) => (
                <Toggle
                  key={l.key}
                  label={geeLoading[l.key] ? `${l.label} (memuat...)` : l.label}
                  checked={!!geeActive[l.key]}
                  onChange={(v) => toggleGeeLayer(l.key, v)}
                />
              ))}
              <div className="gl-divider" />
              <Toggle label="Tampilkan hanya di dalam batas desa" checked={geeMask} onChange={setGeeMask} />
              <RangeField label="Opasitas layer" value={geeOpacity} min={0.1} max={1} step={0.05} display={`${Math.round(geeOpacity * 100)}%`} onChange={setGeeOpacity} />
              {geeMask && Object.values(geeActive).some(Boolean) && !selectedDesa && (
                <div className="gl-note">Pilih desa dulu agar layer dipotong mengikuti batas desa.</div>
              )}
              {geeMsg && <div className={`gl-note ${geeErr ? 'gl-note--err' : ''}`}>{geeMsg}</div>}
              <div className="gl-note">Saat dipotong ke batas desa, area di luar desa tampil putih (peta dasar disembunyikan). Matikan opsi itu untuk melihat peta dasar utuh. Kurangi "Opasitas isi" di bagian Simbologi bila warna isi desa menutupi layer.</div>
            </Section>

            {/* 5. AOI */}
            <Section step={5} title="Titik AOI dan foto" open={!!openSec.aoi} onToggle={() => toggleSec('aoi')} badge={<span className="gl-badge">{aoiList.length} titik</span>}>
              <button type="button" className={`gl-btn gl-btn--block ${isAddingAoi ? 'gl-btn--danger' : 'gl-btn--primary'}`} onClick={toggleAddAoi}>
                {isAddingAoi ? <><Icon name="x" size={16} /> Batalkan tambah titik</> : <><Icon name="plus" size={16} /> Tambah titik AOI</>}
              </button>

              {isAddingAoi && <div className="gl-note gl-note--warn">Mode tambah aktif. Klik lokasi mana saja di peta untuk menaruh titik.</div>}

              {aoiList.length === 0 && !isAddingAoi && (
                <div className="gl-note">Belum ada titik. Tekan tombol di atas, lalu klik peta untuk menaruh titik dan menambahkan foto.</div>
              )}

              <div className="gl-aoi-list">
                {aoiList.map((aoi, index) => {
                  const isOpen = selectedAoiId === aoi.id;
                  const cap = (aoi.imageCaption || '').trim() || aoi.title;
                  return (
                    <div key={aoi.id} className={`gl-aoi ${isOpen ? 'is-open' : ''}`}>
                      <div className="gl-aoi__head">
                        <button type="button" className="gl-aoi__toggle" onClick={() => setSelectedAoiId(isOpen ? null : aoi.id)} aria-expanded={isOpen}>
                          <span className="gl-aoi__chip" style={{ background: aoi.color }}>{aoi.icon || '📍'}</span>
                          <span className="gl-aoi__name">{aoi.title || `Titik ${index + 1}`}</span>
                          {aoi.imageUrl && <span className="gl-badge">Foto</span>}
                        </button>
                        <button type="button" className="gl-iconbtn gl-iconbtn--danger" aria-label={`Hapus ${aoi.title || 'titik'}`} title="Hapus titik" onClick={() => {
                          setAoiList((prev) => prev.filter((it) => it.id !== aoi.id));
                          if (selectedAoiId === aoi.id) setSelectedAoiId(null);
                        }}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="gl-aoi__body">
                          <label className="gl-field">
                            <span className="gl-label">Nama titik</span>
                            <input type="text" className="gl-input" value={aoi.title} onChange={(e) => patchAoi(aoi.id, { title: e.target.value })} />
                          </label>

                          <div className="gl-field">
                            <span className="gl-label">Ikon</span>
                            <div className="gl-icons">
                              {AOI_ICONS.map((ic) => (
                                <button
                                  key={ic.emoji}
                                  type="button"
                                  title={ic.label}
                                  aria-label={ic.label}
                                  aria-pressed={aoi.icon === ic.emoji}
                                  className={aoi.icon === ic.emoji ? 'is-on' : ''}
                                  style={aoi.icon === ic.emoji ? { borderColor: aoi.color, background: `${aoi.color}18` } : undefined}
                                  onClick={() => patchAoi(aoi.id, { icon: ic.emoji })}
                                >
                                  {ic.emoji}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="gl-row">
                            <ColorField label="Warna" value={aoi.color} onChange={(c) => patchAoi(aoi.id, { color: c })} />
                            <div className="gl-field">
                              <span className="gl-label">Koordinat</span>
                              <div className="gl-coords">{aoi.lng.toFixed(5)}, {aoi.lat.toFixed(5)}</div>
                            </div>
                          </div>

                          <div className="gl-divider" />

                          <div className="gl-subhead">Legenda</div>
                          <Toggle label="Tampilkan titik ini di legenda" checked={aoi.showInLegend} onChange={(v) => patchAoi(aoi.id, { showInLegend: v })} />
                          {aoi.showInLegend && (
                            <>
                              <label className="gl-field">
                                <span className="gl-label">Nama di legenda</span>
                                <input type="text" className="gl-input" placeholder={aoi.title || 'Nama titik'} value={aoi.legendLabel} onChange={(e) => patchAoi(aoi.id, { legendLabel: e.target.value })} />
                              </label>
                              <div className="gl-field">
                                <span className="gl-label">Gambar simbol legenda</span>
                                <div className="gl-legrow">
                                  <span className="gl-legrow__sym"><LegendSymbol aoi={aoi} size={22} /></span>
                                  <label className="gl-btn gl-legrow__up">
                                    <Icon name="upload" size={14} /> {aoi.legendImageUrl ? 'Ganti gambar' : 'Unggah gambar'}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => patchAoi(aoi.id, { legendImageUrl: ev.target?.result as string });
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                  </label>
                                  {aoi.legendImageUrl && (
                                    <button type="button" className="gl-iconbtn gl-iconbtn--danger" aria-label="Hapus gambar legenda" title="Hapus gambar legenda" onClick={() => patchAoi(aoi.id, { legendImageUrl: '' })}>
                                      <Icon name="trash" size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="gl-note">Tanpa gambar, legenda memakai ikon dan warna titik ini. Tanpa nama khusus, legenda memakai nama titik.</div>
                            </>
                          )}

                          <div className="gl-divider" />

                          {!aoi.imageUrl && (
                            <label className="gl-upload">
                              <Icon name="upload" size={20} />
                              <span>Unggah foto lapangan</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = '';
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => patchAoi(aoi.id, { imageUrl: ev.target?.result as string, showCallout: true });
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          )}

                          <label className="gl-field">
                            <span className="gl-label">Keterangan foto</span>
                            <textarea
                              className="gl-textarea"
                              rows={2}
                              placeholder="Contoh: Pantai Panjang saat matahari terbenam"
                              value={aoi.imageCaption}
                              onChange={(e) => patchAoi(aoi.id, { imageCaption: e.target.value, showCallout: true })}
                            />
                          </label>

                          {(aoi.imageUrl || aoi.imageCaption) && (
                            <div className="gl-field">
                              <span className="gl-label">Pratinjau kartu di peta</span>
                              <div className="gl-cardprev" style={{ background: aoi.color }}>
                                {aoi.imageUrl && <img src={aoi.imageUrl} alt="Pratinjau foto" />}
                                {aoi.imageUrl && (
                                  <button type="button" className="gl-cardprev__x" aria-label="Hapus foto" title="Hapus foto" onClick={() => patchAoi(aoi.id, { imageUrl: '' })}>
                                    <Icon name="x" size={14} />
                                  </button>
                                )}
                                <div className={`gl-cardprev__cap ${aoi.imageUrl ? '' : 'gl-cardprev__cap--solo'}`}>{cap}</div>
                              </div>
                            </div>
                          )}

                          <Toggle label="Tampilkan foto dan garis penunjuk" checked={aoi.showCallout} onChange={(v) => patchAoi(aoi.id, { showCallout: v })} />
                          <div className="gl-note">Keterangan tampil di kotak putih di bawah foto. Kosongkan untuk memakai nama titik. Geser pin atau kartu foto di peta untuk mengatur garis penunjuk.</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* 5. IDENTITAS */}
            <Section step={6} title="Identitas dan judul peta" open={!!openSec.identitas} onToggle={() => toggleSec('identitas')}>
              <label className="gl-field">
                <span className="gl-label">Judul utama</span>
                <input type="text" className="gl-input" value={judulUtama} onChange={(e) => setJudulUtama(e.target.value)} />
              </label>
              <label className="gl-field">
                <span className="gl-label">Nama wilayah / desa</span>
                <input type="text" className="gl-input" value={namaWilayahJudul} placeholder="Otomatis mengikuti desa" onChange={(e) => setNamaWilayahJudul(e.target.value)} />
              </label>
              <label className="gl-field">
                <span className="gl-label">Sub judul</span>
                <input type="text" className="gl-input" value={subJudul} onChange={(e) => setSubJudul(e.target.value)} />
              </label>
              <label className="gl-field">
                <span className="gl-label">Sumber data</span>
                <input type="text" className="gl-input" value={sumberData} onChange={(e) => setSumberData(e.target.value)} />
              </label>
              <div className="gl-row" style={{ gridTemplateColumns: '1fr 88px' }}>
                <label className="gl-field">
                  <span className="gl-label">Instansi / penyusun</span>
                  <input type="text" className="gl-input" value={pembuatPeta} onChange={(e) => setPembuatPeta(e.target.value)} />
                </label>
                <label className="gl-field">
                  <span className="gl-label">Tahun</span>
                  <input type="text" className="gl-input" value={tahunPeta} onChange={(e) => setTahunPeta(e.target.value)} />
                </label>
              </div>
              <Toggle label="Tampilkan info peta dasar di legenda" checked={showLegendBasemap} onChange={setShowLegendBasemap} />
            </Section>
          </div>

          <div className="gl-side__foot">
            <button type="button" className="gl-btn gl-btn--primary" onClick={handleExportPNG} disabled={!!exporting}>
              <Icon name="download" size={16} /> {exporting === 'png' ? 'Memproses...' : 'Unduh PNG'}
            </button>
            <button type="button" className="gl-btn gl-btn--dark" onClick={handleExportPDF} disabled={!!exporting}>
              <Icon name="printer" size={16} /> {exporting === 'pdf' ? 'Memproses...' : 'Ekspor PDF A4'}
            </button>
          </div>
        </aside>

        {/* AREA LEMBAR PETA */}
        <main className="gl-stage">
          <div className="gl-toolbar">
            <button type="button" className="gl-btn gl-btn--sm gl-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Icon name="sliders" size={14} /> Pengaturan
            </button>
            <div className="gl-toolbar__text">
              <div className="gl-toolbar__title">{regionTitle}</div>
              <div className="gl-toolbar__sub">{regionSub}</div>
            </div>
            <div className="gl-toolbar__chips">
              <span className="gl-chip">Zoom {zoom}</span>
              <span className="gl-chip">1 : {mapScale.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="gl-paper" ref={paperRef}>
            <div style={{ width: SHEET_W * sheetScale, height: SHEET_H * sheetScale }}>
              <div ref={scalerRef} style={{ width: SHEET_W, height: SHEET_H, transform: `scale(${sheetScale})`, transformOrigin: 'top left' }}>

                {/* SHEET LEMBAR PETA KARTOGRAFI */}
                <div
                  ref={sheetRef}
                  style={{
                    width: SHEET_W,
                    height: SHEET_H,
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    boxShadow: '0 18px 50px rgba(15,27,45,0.28)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 270px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    color: '#000000',
                    fontFamily: SHEET_FONT
                  }}
                >
                  {/* KOLOM KIRI: JENDELA PETA */}
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '2.5px solid #000', boxSizing: 'border-box', padding: '8px', position: 'relative', backgroundColor: '#ffffff' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1.5px solid #000', boxSizing: 'border-box', position: 'relative' }}>

                      {showCoordinateGrid && (
                        <div style={{ height: '16px', borderBottom: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', fontSize: '8px', fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#1e293b' }}>
                          <span>{coordsDMS.west}</span>
                          <span>▲ GRID GEOGRAFIS WGS 84 ▲</span>
                          <span>{coordsDMS.east}</span>
                        </div>
                      )}

                      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
                        <div data-map-container="true" ref={mapContainer} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

                        {isAddingAoi && (
                          <div data-export-hide="true" style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, backgroundColor: '#dc2626', color: '#ffffff', padding: '6px 14px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', fontFamily: 'Inter, system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
                            <span>Klik pada peta untuk menaruh titik AOI</span>
                            <button type="button" onClick={() => setIsAddingAoi(false)} style={{ background: '#ffffff', color: '#dc2626', border: 'none', borderRadius: '10px', padding: '2px 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}>
                              Batal
                            </button>
                          </div>
                        )}

                        {showCoordinateGrid && (
                          <>
                            <div style={{ position: 'absolute', top: '12px', left: '4px', zIndex: 10, fontSize: '8px', fontFamily: 'monospace', fontWeight: 'bold', background: 'rgba(255,255,255,0.85)', padding: '1px 3px', border: '1px solid #000' }}>
                              {coordsDMS.north}
                            </div>
                            <div style={{ position: 'absolute', bottom: '28px', left: '4px', zIndex: 10, fontSize: '8px', fontFamily: 'monospace', fontWeight: 'bold', background: 'rgba(255,255,255,0.85)', padding: '1px 3px', border: '1px solid #000' }}>
                              {coordsDMS.south}
                            </div>
                          </>
                        )}
                      </div>

                      {showCoordinateGrid && (
                        <div style={{ height: '16px', borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', fontSize: '8px', fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#1e293b' }}>
                          <span>{coordsDMS.west}</span>
                          <span>Titik Pusat: {coordsDMS.centerLng}, {coordsDMS.centerLat}</span>
                          <span>{coordsDMS.east}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KOLOM KANAN: INFORMASI KARTOGRAFI */}
                  <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '7px', height: '100%', boxSizing: 'border-box', backgroundColor: '#ffffff', overflow: 'hidden', fontFamily: SHEET_FONT }}>

                    <div style={{ border: '1.5px solid #000', padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>{judulUtama}</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: '#000', textTransform: 'uppercase', margin: '3px 0', borderBottom: '1.5px solid #000', paddingBottom: '3px', letterSpacing: '0.5px' }}>
                        {namaWilayahJudul || selectedDesa || 'WILAYAH INDONESIA'}
                      </div>
                      <div style={{ fontSize: '8.5px', color: '#333', textTransform: 'uppercase', lineHeight: 1.2 }}>{subJudul}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '62px 1fr', gap: '7px' }}>
                      <Panel title="Utara" bodyStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px 0 5px' }}>
                        <svg width="38" height="38" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="#000" strokeWidth="1.5" />
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#000" strokeWidth="0.8" strokeDasharray="2,2" />
                          <polygon points="50,14 45,50 50,45" fill="#000" />
                          <polygon points="50,14 55,50 50,45" fill="#fff" stroke="#000" strokeWidth="0.5" />
                          <polygon points="50,86 55,50 50,55" fill="#000" />
                          <polygon points="50,86 45,50 50,55" fill="#fff" stroke="#000" strokeWidth="0.5" />
                          <polygon points="86,50 50,55 55,50" fill="#000" />
                          <polygon points="86,50 50,45 55,50" fill="#fff" stroke="#000" strokeWidth="0.5" />
                          <polygon points="14,50 50,45 45,50" fill="#000" />
                          <polygon points="14,50 50,55 45,50" fill="#fff" stroke="#000" strokeWidth="0.5" />
                          <text x="50" y="10" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#000" fontFamily="sans-serif">U</text>
                        </svg>
                      </Panel>

                      <Panel title="Skala Peta" bodyStyle={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }}>1 : {mapScale.toLocaleString('id-ID')}</div>
                        <div style={{ width: '128px' }}>
                          <div style={{ display: 'flex', height: '5px', border: '1px solid #000' }}>
                            <div style={{ flex: 1, backgroundColor: '#000' }} />
                            <div style={{ flex: 1, backgroundColor: '#fff' }} />
                            <div style={{ flex: 1, backgroundColor: '#000' }} />
                            <div style={{ flex: 1, backgroundColor: '#fff' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', fontWeight: 'bold', marginTop: '2px', fontFamily: 'sans-serif' }}>
                            <span>0</span>
                            <span>{scaleBarMeters >= 1000 ? `${(scaleBarMeters / 2000).toFixed(1)} km` : `${scaleBarMeters / 2} m`}</span>
                            <span>{scaleBarMeters >= 1000 ? `${scaleBarMeters / 1000} km` : `${scaleBarMeters} m`}</span>
                            <span>{scaleBarMeters >= 1000 ? `${(scaleBarMeters * 2) / 1000} km` : `${scaleBarMeters * 2} m`}</span>
                          </div>
                        </div>
                      </Panel>
                    </div>

                    <Panel title="Legenda" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '9px', fontFamily: 'sans-serif' }}>
                        {selectedDesa && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', height: '12px', backgroundColor: fillColor, border: `2px solid ${strokeColor}`, opacity: 0.9, boxSizing: 'border-box', flexShrink: 0 }} />
                            <span style={{ fontWeight: 'bold', color: '#000' }}>Batas Desa {selectedDesa}</span>
                          </div>
                        )}
                        {!selectedDesa && selectedKab && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', height: '12px', backgroundColor: fillColor, border: '1.5px solid #1e293b', opacity: 0.6, boxSizing: 'border-box', flexShrink: 0 }} />
                            <span style={{ fontWeight: 'bold', color: '#000' }}>Wilayah {selectedKab}</span>
                          </div>
                        )}
                        {selectedDesa && showNeighbors && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', height: '12px', border: `1.5px dashed ${neighborStrokeColor}`, backgroundColor: 'rgba(100,116,139,0.1)', boxSizing: 'border-box', flexShrink: 0 }} />
                            <span style={{ color: '#334155' }}>Batas Desa Sekitar</span>
                          </div>
                        )}
                        {aoiList.map((aoi, i) => aoi.showInLegend !== false && (
                          <div key={aoi.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', height: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                              <LegendSymbol aoi={aoi} size={15} />
                            </div>
                            <span style={{ color: '#334155' }}>{legendName(aoi, i)}</span>
                          </div>
                        ))}
                        {GEE_LAYERS.filter((l) => geeActive[l.key]).map((l) => (
                          <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', height: '10px', boxSizing: 'border-box', flexShrink: 0, ...GEE_LEGEND[l.key].box }} />
                            <span style={{ color: '#334155' }}>{GEE_LEGEND[l.key].label}</span>
                          </div>
                        ))}
                        {aoiList.some(hasCallout) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', borderTop: '2px dashed #0f172a', flexShrink: 0 }} />
                            <span style={{ color: '#334155' }}>Foto Dokumentasi & Garis Penunjuk</span>
                          </div>
                        )}
                        {showLegendBasemap && (
                          <div style={{ marginTop: '2px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0', fontSize: '8px', color: '#64748b' }}>
                            Peta Dasar: <b>{BASEMAP_TILES[basemapKey].name}</b>
                            <div style={{ fontSize: '6.5px', marginTop: '1px', lineHeight: 1.3 }}>{BASEMAP_TILES[basemapKey].attr}</div>
                          </div>
                        )}
                        {Object.values(geeActive).some(Boolean) && (
                          <div style={{ fontSize: '6.5px', color: '#64748b', lineHeight: 1.3 }}>Data: Google Earth Engine (SRTM, Sentinel-2, Open Buildings, HydroSHEDS, GRIP4)</div>
                        )}
                      </div>
                    </Panel>

                    <Panel title="Keterangan & Metadata">
                      <table style={{ width: '100%', fontSize: '8px', borderCollapse: 'collapse', lineHeight: 1.4, fontFamily: 'sans-serif' }}>
                        <tbody>
                          <tr>
                            <td style={{ color: '#64748b', width: '58px' }}>Wilayah:</td>
                            <td style={{ fontWeight: 'bold' }}>{selectedDesa || selectedKab || 'Indonesia'}</td>
                          </tr>
                          {selectedProps?.WADMKC && (
                            <tr>
                              <td style={{ color: '#64748b' }}>Kecamatan:</td>
                              <td>{selectedProps.WADMKC}</td>
                            </tr>
                          )}
                          <tr>
                            <td style={{ color: '#64748b' }}>Luas Est.:</td>
                            <td>{luasDesaKm2} km²</td>
                          </tr>
                          <tr>
                            <td style={{ color: '#64748b' }}>Proyeksi:</td>
                            <td>Geografis (WGS 84)</td>
                          </tr>
                          <tr>
                            <td style={{ color: '#64748b' }}>Sumber:</td>
                            <td style={{ fontSize: '7.5px' }}>{sumberData}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div style={{ marginTop: '4px', paddingTop: '3px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: '7.5px', color: '#444', fontFamily: 'sans-serif' }}>
                        Disusun oleh <b>{pembuatPeta}</b> · {tahunPeta}
                      </div>
                    </Panel>

                    {/* PETA INSET: langsung peta tanpa judul, menunjukkan letak desa terhadap wilayah sekitar */}
                    <div style={{ border: '1.5px solid #000', backgroundColor: '#ffffff', flexShrink: 0, position: 'relative' }}>
                      <div data-inset-container="true" ref={insetContainer} style={{ position: 'relative', width: '100%', height: '150px' }} />
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

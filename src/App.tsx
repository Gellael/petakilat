import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import * as turf from '@turf/turf';
import { useHomeMotion, useHeroMap } from './motion';
import { UserCircle} from 'lucide-react';
import { SiteFooter } from './SiteFooter';
import { useAuth, AuthModal, AccountModal, apiFetch, PAKET_KREDIT, hemat, rupiah, linkWaPaket } from './auth';
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
  iconImageUrl: string; // gambar ikon buatan sendiri: dipakai di pin peta DAN di legenda
  lineTone: 'white' | 'black'; // warna garis penunjuk dan bingkai foto (tidak ikut warna titik)
  bendLng: number | null; // titik belokan garis penunjuk (null = garis lurus)
  bendLat: number | null;
}

export interface Penandatangan {
  id: string;
  jabatan: string; // contoh: "Dosen Pembimbing", "Kepala Desa"
  nama: string;
  nip: string;     // NIP / NIM / keterangan lain (opsional)
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


const rasterSource = (key: string, tileSize: number = 256, maxzoomCap?: number) => {
  const b = BASEMAP_TILES[key] && isBasemapAvailable(key) ? BASEMAP_TILES[key] : BASEMAP_TILES.citra;
  return {
    type: 'raster' as const,
    tiles: [basemapUrl(b)],
    tileSize,
    maxzoom: Math.min(b.maxzoom ?? 19, maxzoomCap ?? 99)
  };
};

const BASE_SRC = 'raster-tiles';
const BASE_LAYER = 'simple-tile-layer';
const SHEET_W = 1020;
const SHEET_H = 680;
const SHEET_FONT = "'Times New Roman', Times, 'Liberation Serif', serif";
const SHEET_SANS = "Arial, Helvetica, 'Liberation Sans', sans-serif";
const SHEET_MONO = "'Courier New', Courier, 'Liberation Mono', monospace";
const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as any[] };

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hasCallout = (a: AoiItem) => a.showCallout && !!(a.imageUrl || a.imageCaption);

// Garis penunjuk dan bingkai foto hanya putih atau hitam; 'casing' adalah garis tipis lawannya agar tetap terbaca di peta terang maupun gelap
const LINE_TONES = {
  white: { main: '#ffffff', casing: '#0f172a' },
  black: { main: '#0f172a', casing: '#ffffff' }
} as const;
const toneOf = (a: AoiItem): 'white' | 'black' => (a.lineTone === 'black' ? 'black' : 'white');
const hasBend = (a: AoiItem) => a.bendLng != null && a.bendLat != null;
const bendHandlePos = (a: AoiItem): [number, number] =>
  hasBend(a) ? [a.bendLng as number, a.bendLat as number] : [(a.lng + a.calloutLng) / 2, (a.lat + a.calloutLat) / 2];
const leaderCoords = (a: AoiItem): number[][] =>
  hasBend(a)
    ? [[a.lng, a.lat], [a.bendLng as number, a.bendLat as number], [a.calloutLng, a.calloutLat]]
    : [[a.lng, a.lat], [a.calloutLng, a.calloutLat]];

// Baca gambar ikon, kecilkan (maks 160 px) agar ringan
const readIconFile = (file: File, done: (dataUrl: string) => void, maxPx: number = 160) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const src = ev.target?.result as string;
    const img = new Image();
    img.onload = () => {
      try {
        const w0 = img.naturalWidth || 128;
        const h0 = img.naturalHeight || 128;
        const k = Math.min(1, maxPx / Math.max(w0, h0));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w0 * k));
        c.height = Math.max(1, Math.round(h0 * k));
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        done(c.toDataURL('image/png'));
      } catch (_) {
        done(src);
      }
    };
    img.onerror = () => done(src);
    img.src = src;
  };
  reader.readAsDataURL(file);
};
const expandBbox = (b: number[], f: number): [number, number, number, number] => {
  const dx = (b[2] - b[0]) * f;
  const dy = (b[3] - b[1]) * f;
  return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy];
};

const swapBasemap = (map: maplibregl.Map | null, key: string, tileSize: number = 256, maxzoomCap?: number) => {
  if (!map) return;
  const run = () => {
    if (map.getLayer(BASE_LAYER)) map.removeLayer(BASE_LAYER);
    if (map.getSource(BASE_SRC)) map.removeSource(BASE_SRC);
    map.addSource(BASE_SRC, rasterSource(key, tileSize, maxzoomCap));
    const beforeId = map.getStyle().layers.find((l) => l.id !== BASE_LAYER)?.id;
    map.addLayer(
      { id: BASE_LAYER, type: 'raster', source: BASE_SRC, paint: { 'raster-fade-duration': 0 } },
      beforeId
    );
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

const addGeeLayer = (map: maplibregl.Map, key: string, tileUrl: string, opacity: number, tileSize: number = 256) => {
  removeGeeLayer(map, key);
  map.addSource(geeSrcId(key), { type: 'raster', tiles: [tileUrl], tileSize });
  const idx = GEE_LAYERS.findIndex((l) => l.key === key);
  const nextGee = GEE_LAYERS.slice(idx + 1).map((l) => geeLayerId(l.key)).find((id) => map.getLayer(id));
  const before = nextGee || GEE_ABOVE.find((id) => map.getLayer(id));
  map.addLayer(
    {
      id: geeLayerId(key),
      type: 'raster',
      source: geeSrcId(key),
      paint: { 'raster-opacity': opacity, 'raster-fade-duration': 0 }
    },
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

// Pilihan resolusi ekspor (seperti dialog ekspor layout QGIS). Lembar peta = 1020 px lebar = A4 lanskap 297 mm
const EXPORT_DPI_OPTIONS: { dpi: number; label: string }[] = [
  { dpi: 150, label: '150 dpi - ringan, untuk layar / WhatsApp' },
  { dpi: 300, label: '300 dpi - standar cetak (disarankan)' },
  { dpi: 600, label: '600 dpi - sangat tajam (berat)' }
];
const A4_LANDSCAPE_INCH = 297 / 25.4;
const dpiToPixelRatio = (dpi: number) => Math.min(8, dpi / (SHEET_W / A4_LANDSCAPE_INCH));

// Tanam metadata DPI (chunk pHYs) ke PNG agar Word / Photoshop / printer membaca ukuran cetak yang benar
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const canvasToPngBlob = (canvas: HTMLCanvasElement, dpi: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(async (b) => {
      if (!b) return reject(new Error('Gagal membuat berkas PNG (gambar terlalu besar untuk browser).'));
      try {
        const buf = new Uint8Array(await b.arrayBuffer());
        const ppm = Math.round(dpi / 0.0254);
        const chunk = new Uint8Array(21);
        const dv = new DataView(chunk.buffer);
        dv.setUint32(0, 9);
        chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
        dv.setUint32(8, ppm);
        dv.setUint32(12, ppm);
        chunk[16] = 1; // satuan: meter
        dv.setUint32(17, crc32(chunk.subarray(4, 17)));
        const out = new Uint8Array(buf.length + 21);
        out.set(buf.subarray(0, 33), 0); // signature (8) + IHDR (25)
        out.set(chunk, 33);
        out.set(buf.subarray(33), 54);
        resolve(new Blob([out], { type: 'image/png' }));
      } catch (_) {
        resolve(b);
      }
    }, 'image/png');
  });

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Tunggu sampai semua tile selesai dimuat dan peta stabil beberapa kali berturut-turut
const waitMapIdle = (map: maplibregl.Map | null, timeoutMs: number = 25000): Promise<void> =>
  new Promise((resolve) => {
    if (!map) return resolve();
    let finished = false;
    let stable = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearInterval(poll);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const poll = setInterval(() => {
      const ready = map.loaded() && map.areTilesLoaded() && !map.isMoving();
      stable = ready ? stable + 1 : 0;
      if (stable >= 3) finish(); // 3 x 200 ms stabil
    }, 200);
    map.triggerRepaint();
  });

// ===== Ekspor resolusi tinggi: tile detail asli + pixelRatio tinggi =====
const MAP_EXPORT_MAX_RATIO = 4;      // batas pixel ratio kanvas peta
const EXPORT_MAX_TILE_ZOOM = 18;     // turunkan ke 17 bila muncul tile "Map data not yet available"
const EXPORT_MAX_CANVAS_PX = 8192;   // batas aman ukuran kanvas WebGL

interface ExportMapJob {
  map: maplibregl.Map | null;
  basemapKey: string;
  geeUrls?: Record<string, string>;
  geeOpacity?: number;
}

// Mengecilkan tileSize membuat MapLibre mengambil tile 1-2 level zoom lebih tinggi;
// pixelRatio dinaikkan setara agar tile detail itu terpetakan 1:1 ke piksel kanvas.
const prepareMapsForExport = async (
  jobs: ExportMapJob[],
  sheetPr: number
): Promise<{ ratio: number; factor: number; restore: () => void }> => {
  const live = jobs.filter((j): j is ExportMapJob & { map: maplibregl.Map } => !!j.map);

  const maxCss = Math.max(
    1,
    ...live.map((j) => {
      const c = j.map.getContainer();
      return Math.max(c.clientWidth, c.clientHeight);
    })
  );
  const ratio = Math.max(1, Math.min(MAP_EXPORT_MAX_RATIO, sheetPr, EXPORT_MAX_CANVAS_PX / maxCss));

  // Kelipatan detail tile: 1x, 2x, atau 4x (tileSize 256, 128, 64)
  const factor = ratio > 2 ? 4 : ratio > 1 ? 2 : 1;
  const tileSize = 256 / factor;
  const cap = factor > 1 ? EXPORT_MAX_TILE_ZOOM : undefined;

  const restores: Array<() => void> = [];

  for (const j of live) {
    const map = j.map;
    const mm = map as any;
    const prev = typeof mm.getPixelRatio === 'function' ? mm.getPixelRatio() : window.devicePixelRatio || 1;
    try {
      mm.setPixelRatio(ratio);
      restores.push(() => { try { mm.setPixelRatio(prev); } catch (_) {} });
    } catch (_) {}

    if (factor > 1) {
      swapBasemap(map, j.basemapKey, tileSize, cap);

      const activeGee = GEE_LAYERS.filter((l) => j.geeUrls?.[l.key] && map.getLayer(geeLayerId(l.key)));
      activeGee.forEach((l) => addGeeLayer(map, l.key, j.geeUrls![l.key], j.geeOpacity ?? 0.8, tileSize));

      restores.push(() => {
        swapBasemap(map, j.basemapKey);
        activeGee.forEach((l) => {
          try { addGeeLayer(map, l.key, j.geeUrls![l.key], j.geeOpacity ?? 0.8, 256); } catch (_) {}
        });
      });
    }
  }

  await sleep(400); // beri waktu MapLibre mulai meminta tile baru
  await Promise.all(live.map((j) => waitMapIdle(j.map)));

  return { ratio, factor, restore: () => restores.reverse().forEach((fn) => fn()) };
};

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
const buildPinHtml = (aoi: AoiItem) => {
  const head = aoi.iconImageUrl
    ? `<div style="background:#fff;width:32px;height:32px;border:2.5px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="${aoi.iconImageUrl}" alt="" style="width:100%;height:100%;object-fit:contain;display:block;" /></div>`
    : `<div style="background:${aoi.color};color:#fff;font-size:18px;width:32px;height:32px;border:2.5px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">${aoi.icon || '📍'}</div>`;
  return `
  ${head}
  <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${aoi.color};margin-top:-1px;"></div>
`;
};

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

const calloutFrameStyle = (a: AoiItem) => {
  const t = LINE_TONES[toneOf(a)];
  return { background: t.main, boxShadow: `0 0 0 1px ${t.casing}99, 0 6px 18px rgba(0,0,0,.28)` };
};

const CALLOUT_FRAME_CSS = (a: AoiItem) => {
  const f = calloutFrameStyle(a);
  return `
  background:${f.background};
  box-shadow:${f.boxShadow};
  padding:3px;
  border-radius:8px;
  width:168px;
  font-family:Inter,system-ui,sans-serif;
  cursor:grab;
  user-select:none;
`;
};

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
  bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  globe: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  printer: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
  crosshair: <><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></>,
  menu: <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  check: <polyline points="20 6 9 17 4 12" />,
  compass: <><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></>
};

const Icon = ({ name, size = 16 }: { name: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {ICON_PATHS[name]}
  </svg>
);

// Simbol AOI di legenda: tampilannya sama dengan pin di peta (ikon/gambar yang sama)
const LegendSymbol = ({ aoi, size = 16 }: { aoi: AoiItem; size?: number }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: aoi.iconImageUrl ? '#fff' : aoi.color,
      border: `${Math.max(1.5, size * 0.08)}px solid #fff`,
      boxShadow: '0 0 0 1px #94a3b8, 0 1px 3px rgba(0,0,0,.35)',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      fontSize: Math.round(size * 0.55),
      lineHeight: 1
    }}
  >
    {aoi.iconImageUrl ? (
      <img src={aoi.iconImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    ) : (
      aoi.icon || '📍'
    )}
  </span>
);

const legendName = (a: AoiItem, i: number) => (a.legendLabel || '').trim() || (a.title || '').trim() || `Titik ${i + 1}`;

// ===================== KOMPONEN FORM =====================
const Section = ({ step, title, badge, open, onToggle, children, locked }: {
  step: number; title: string; badge?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode;
  /** Terkunci: tidak bisa dibuka sebelum wilayah (kabupaten/kota) dipilih. */
  locked?: boolean;
}) => {
  const isOpen = open && !locked;
  return (
    <section className={`gl-sec ${isOpen ? 'is-open' : ''}`} aria-disabled={locked || undefined}>
      <button
        type="button"
        className="gl-sec__head"
        onClick={() => { if (!locked) onToggle(); }}
        aria-expanded={isOpen}
        disabled={locked}
        title={locked ? 'Pilih provinsi dan kabupaten/kota terlebih dahulu' : undefined}
        style={locked ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
      >
        <span className="gl-sec__step">{step}</span>
        <span className="gl-sec__title">{title}</span>
        {locked ? <span style={{ fontSize: 11, fontWeight: 600 }}>Pilih wilayah dahulu</span> : badge}
        <span className="gl-sec__chev"><Icon name="chevron" size={16} /></span>
      </button>
      {isOpen && <div className="gl-sec__body">{children}</div>}
    </section>
  );
};

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

function SearchSelect({ label, value, options, placeholder, disabled, loading, onChange, onBeforeOpen }: {
  label: string; value: string; options: string[]; placeholder: string; disabled?: boolean;
  /** Data pilihan sedang dimuat: tampilkan skeleton sebagai pengganti kolom. */
  loading?: boolean;
  onChange: (v: string) => void;
  /** Dipanggil saat user mengklik untuk membuka daftar. Kembalikan false untuk membatalkan pembukaan. */
  onBeforeOpen?: () => boolean | Promise<boolean>;
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
  const toggle = async () => {
    if (!open && onBeforeOpen && !(await onBeforeOpen())) return;
    setOpen((o) => !o);
  };

  return (
    <div className="gl-field" ref={ref} aria-busy={loading || undefined}>
      <span className="gl-label">{label}</span>
      {loading ? (
        <Skel className="gl-skel--field" />
      ) : (
        <button type="button" className={`gl-select ${open ? 'is-open' : ''}`} disabled={disabled} onClick={toggle} aria-haspopup="listbox" aria-expanded={open}>
          <span className={value ? 'gl-select__val' : 'gl-select__ph'}>{value || placeholder}</span>
          <Icon name="chevron" size={16} />
        </button>
      )}
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

// ===================== SKELETON LOADING =====================
const Skel = ({ w, h, flex, className = '' }: { w?: number | string; h?: number | string; flex?: number; className?: string }) => (
  <span className={`gl-skel ${className}`} style={{ width: w, height: h, flex: flex !== undefined ? `${flex} 1 0` : undefined }} aria-hidden="true" />
);

/** Pengganti isi panel samping saat sesi masuk sedang diperiksa. */
const SideSkeleton = () => (
  <div role="status" aria-label="Memuat panel pengaturan" style={{ display: 'contents' }}>
    <div className="gl-skelsec">
      <div className="gl-skelsec__head"><Skel w={24} h={24} className="gl-skel--circle" /><Skel h={14} flex={1} /></div>
      <Skel className="gl-skel--field" />
      <Skel className="gl-skel--field" />
      <Skel className="gl-skel--field" />
    </div>
    {[0, 1, 2, 3, 4].map((i) => (
      <div className="gl-skelsec" key={i}>
        <div className="gl-skelsec__head"><Skel w={24} h={24} className="gl-skel--circle" /><Skel h={14} flex={1} /></div>
      </div>
    ))}
  </div>
);

/** Bayangan lembar peta: kolom peta di kiri, kotak informasi di kanan. */
const SheetSkeleton = ({ w, h }: { w: number; h: number }) => (
  <div className="gl-skelov" role="status" aria-label="Memuat peta">
    <div className="gl-skelsheet" style={{ width: w, height: h }}>
      <Skel h="100%" />
      <div className="gl-skelsheet__col">
        <Skel flex={1} />
        <Skel flex={1} />
        <Skel flex={2.2} />
        <Skel flex={1.6} />
        <Skel flex={1.8} />
      </div>
    </div>
  </div>
);

// Pola watermark pratinjau: teks miring berulang (ubin SVG). Memuat email user agar screenshot bisa dilacak.
const escXml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' } as Record<string, string>)[c]);
const previewWatermarkBg = (email: string): string => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="150">` +
    `<g transform="rotate(-25 130 75)" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" fill="#000" fill-opacity="0.16">` +
    `<text x="130" y="58" font-size="16">PETAKILAT - PRATINJAU</text>` +
    `<text x="130" y="76" font-size="11">BELUM DIEKSPOR</text>` +
    `<text x="130" y="92" font-size="10">${escXml(email.slice(0, 40))}</text>` +
    `</g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

// Panel formal pada lembar peta cetak (tidak diubah)
const Panel = ({ title, children, bodyStyle, style }: { title: string; children: ReactNode; bodyStyle?: CSSProperties; style?: CSSProperties }) => (
  <div style={{ border: '1.5px solid #000', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
    <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', textAlign: 'center', textTransform: 'uppercase', borderBottom: '1px solid #ccc', margin: '6px 6px 0', paddingBottom: '2px' }}>
      {title}
    </div>
    <div style={{ padding: '5px 6px 6px', flex: 1, minHeight: 0, ...bodyStyle }}>{children}</div>
  </div>
);


// Ilustrasi lembar peta untuk hero (meniru tata letak hasil ekspor)
const HeroSheet = () => (
  <svg viewBox="0 0 560 380" role="img" aria-label="Contoh lembar peta administrasi Desa Betungan dengan batas desa berwarna merah, legenda, skala, dan peta inset" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="glmapclip"><rect x="10" y="24" width="380" height="332" /></clipPath>
      <pattern id="glroads" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0H14M0 0V14" stroke="#e8eef0" strokeOpacity=".28" strokeWidth=".6" fill="none" /></pattern>
      <linearGradient id="glsun" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6b26b" /><stop offset=".45" stopColor="#e98a5b" /><stop offset=".46" stopColor="#5f8fb0" /><stop offset="1" stopColor="#2c4f6e" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="556" height="376" fill="#fff" stroke="#08211a" strokeWidth="2" />
    <line x1="394" y1="2" x2="394" y2="378" stroke="#08211a" strokeWidth="2" />

    {/* jendela peta */}
    <rect x="10" y="10" width="380" height="360" fill="#fff" stroke="#000" strokeWidth="1.2" />
    <rect x="10" y="10" width="380" height="14" fill="#f1f5f9" stroke="#000" strokeWidth=".8" />
    <rect x="10" y="356" width="380" height="14" fill="#f1f5f9" stroke="#000" strokeWidth=".8" />
    <g fontFamily={SHEET_MONO} fontSize="6.5" fontWeight="bold" fill="#1e293b">
      <text x="18" y="20">{'102° 19\' 20" BT'}</text>
      <text x="200" y="20" textAnchor="middle">GRID GEOGRAFIS WGS 84</text>
      <text x="382" y="20" textAnchor="end">{'102° 22\' 36" BT'}</text>
      <text x="18" y="366">{'102° 19\' 20" BT'}</text>
      <text x="200" y="366" textAnchor="middle">{'Titik Pusat: 102° 20\' 58" BT, 3° 52\' 13" LS'}</text>
      <text x="382" y="366" textAnchor="end">{'102° 22\' 36" BT'}</text>
    </g>

    <g className="hm-clip" clipPath="url(#glmapclip)">
      <g className="hm-pan">
      <rect x="-120" y="-100" width="640" height="560" fill="#243f38" />
      <g className="hm-far">
      <ellipse cx="70" cy="90" rx="90" ry="50" fill="#2f5a43" opacity=".8" />
      <ellipse cx="340" cy="320" rx="110" ry="60" fill="#33604a" opacity=".85" />
      <ellipse cx="330" cy="70" rx="70" ry="40" fill="#3b6b4e" opacity=".6" />
      </g>
      <rect x="30" y="250" width="140" height="100" fill="#6b6f6a" opacity=".5" />
      <rect x="30" y="250" width="140" height="100" fill="url(#glroads)" />
      <path className="hm-river" d="M-60 312 C90 280 130 230 190 250 S300 330 390 290" stroke="#6fbfdc" strokeWidth="5" fill="none" opacity=".8" />
      <g className="hm-neigh" fill="rgba(255,255,255,.05)" stroke="#d5dee5" strokeWidth="1" strokeDasharray="4 3">
        <polygon points="20,60 110,40 150,95 100,150 30,140" />
        <polygon points="300,40 385,50 385,150 330,130" />
        <polygon points="30,260 100,250 140,300 120,350 25,350" />
        <polygon points="290,260 385,240 385,350 270,350" />
      </g>
      <polygon className="gl-fillin" points="125,105 205,72 285,92 335,150 325,230 275,292 200,312 140,272 98,200" fill="rgba(123,227,180,.34)" />
      <polygon className="gl-draw" pathLength={1} points="125,105 205,72 285,92 335,150 325,230 275,292 200,312 140,272 98,200" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinejoin="round" />
      <g className="hm-label">
        <rect x="172" y="184" width="76" height="18" rx="9" fill="#fff" />
        <text x="210" y="196.5" textAnchor="middle" fontFamily={SHEET_SANS} fontSize="8" fontWeight="bold" fill="#0f172a" letterSpacing=".5">BETUNGAN</text>
      </g>
      <line className="hm-line" x1="64" y1="96" x2="140" y2="150" stroke="#2f9e6b" strokeWidth="1.4" strokeDasharray="4 3" />
      <circle className="hm-ring" cx="140" cy="150" r="7" fill="none" stroke="#0b7a56" strokeWidth="1.5" />
      <g className="hm-pin"><circle cx="140" cy="150" r="7" fill="#0b7a56" stroke="#fff" strokeWidth="2" /></g>
      <g className="hm-card">
      <rect x="26" y="34" width="76" height="62" rx="4" fill="#2f9e6b" />
      <rect x="29" y="37" width="70" height="40" fill="url(#glsun)" />
      <rect x="29" y="77" width="70" height="16" fill="#fff" />
      <text x="64" y="88.5" textAnchor="middle" fontFamily={SHEET_SANS} fontSize="6.5" fontWeight="bold" fill="#0f172a">AOI 1</text>
      </g>
      </g>
      <rect x="14" y="336" width="60" height="14" fill="#fff" fillOpacity=".85" stroke="#000" strokeWidth=".6" />
      <text x="18" y="346" fontFamily={SHEET_MONO} fontSize="6" fontWeight="bold" fill="#0f172a">500 m</text>
      <g className="hm-hint" pointerEvents="none">
        <rect x="282" y="30" width="102" height="15" rx="7.5" fill="#fff" fillOpacity=".93" />
        <text x="333" y="40.3" textAnchor="middle" fontFamily={SHEET_SANS} fontSize="6.2" fontWeight="bold" fill="#0f172a">Seret untuk menggeser</text>
      </g>
    </g>

    {/* kolom informasi */}
    <g fontFamily={SHEET_FONT} fill="#000">
      <g className="hm-panel">
      <rect x="404" y="16" width="140" height="50" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="474" y="29" textAnchor="middle" fontSize="6.6" fontWeight="bold">PETA ADMINISTRASI DESA</text>
      <text x="474" y="46" textAnchor="middle" fontSize="11" fontWeight="bold">BETUNGAN</text>
      <line x1="410" y1="50" x2="538" y2="50" stroke="#000" strokeWidth="1" />
      <text x="474" y="59" textAnchor="middle" fontSize="4.3" fill="#333">KECAMATAN SELEBAR - KABUPATEN KOTA BENGKULU</text>
      </g>

      <g className="hm-panel">
      <rect x="404" y="72" width="38" height="46" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="423" y="82" textAnchor="middle" fontSize="5" fontWeight="bold">UTARA</text>
      <circle cx="423" cy="101" r="12" fill="none" stroke="#000" strokeWidth="1" />
      <polygon points="423,90 420,101 423,99" fill="#000" /><polygon points="423,90 426,101 423,99" fill="#fff" stroke="#000" strokeWidth=".5" />
      <polygon points="423,112 426,101 423,103" fill="#000" /><polygon points="423,112 420,101 423,103" fill="#fff" stroke="#000" strokeWidth=".5" />
      </g>

      <g className="hm-panel">
      <rect x="448" y="72" width="96" height="46" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="496" y="82" textAnchor="middle" fontSize="5" fontWeight="bold">SKALA PETA</text>
      <text x="496" y="94" textAnchor="middle" fontSize="7" fontWeight="bold" fontFamily={SHEET_MONO}>1 : 63.179</text>
      <rect x="462" y="99" width="68" height="3.5" fill="#fff" stroke="#000" strokeWidth=".7" />
      <rect x="462" y="99" width="17" height="3.5" fill="#000" /><rect x="496" y="99" width="17" height="3.5" fill="#000" />
      <g fontFamily={SHEET_SANS} fontSize="4.5" fontWeight="bold">
        <text x="462" y="110">0</text><text x="496" y="110" textAnchor="middle">2 km</text><text x="530" y="110" textAnchor="end">4 km</text>
      </g>
      </g>

      <g className="hm-panel">
      <rect x="404" y="124" width="140" height="94" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="474" y="135" textAnchor="middle" fontSize="6" fontWeight="bold">LEGENDA</text>
      <line x1="410" y1="138" x2="538" y2="138" stroke="#ccc" strokeWidth=".8" />
      <g fontFamily={SHEET_SANS} fontSize="5.6">
        <rect x="410" y="145" width="14" height="9" fill="#7be3b4" fillOpacity=".6" stroke="#dc2626" strokeWidth="1.5" />
        <text x="430" y="152.5" fontWeight="bold">Batas Desa Betungan</text>
        <rect x="410" y="161" width="14" height="9" fill="rgba(100,116,139,.1)" stroke="#475569" strokeWidth="1" strokeDasharray="2 1.5" />
        <text x="430" y="168.5" fill="#334155">Batas Desa Sekitar</text>
        <circle cx="417" cy="181" r="5" fill="#0b7a56" stroke="#000" strokeWidth=".8" />
        <text x="430" y="183" fill="#334155">AOI 1</text>
        <text x="410" y="203" fontSize="4.6" fill="#64748b">Peta Dasar: Citra Satelit</text>
      </g>
      </g>

      <g className="hm-panel">
      <rect x="404" y="224" width="140" height="66" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="474" y="235" textAnchor="middle" fontSize="5.2" fontWeight="bold">KETERANGAN &amp; METADATA</text>
      <g fontFamily={SHEET_SANS} fontSize="5">
        <text x="410" y="248" fill="#64748b">Wilayah:</text><text x="452" y="248" fontWeight="bold">Betungan</text>
        <text x="410" y="257" fill="#64748b">Luas Est.:</text><text x="452" y="257">10,89 km²</text>
        <text x="410" y="266" fill="#64748b">Proyeksi:</text><text x="452" y="266">Geografis (WGS 84)</text>
        <text x="410" y="275" fill="#64748b">Sumber:</text><text x="452" y="275">BIG &amp; WebGIS PostGIS</text>
      </g>
      </g>

      <g className="hm-panel">
      <rect x="404" y="296" width="140" height="68" fill="#e8f0eb" stroke="#000" strokeWidth="1.2" />
      <g fill="#fff" stroke="#94a3b8" strokeWidth=".8">
        <polygon points="410,302 450,300 462,330 430,358 410,350" />
        <polygon points="450,300 500,304 504,340 462,330" />
        <polygon points="500,304 538,302 538,352 504,340" />
        <polygon points="430,358 462,330 504,340 490,360" />
      </g>
      <polygon points="466,318 484,314 496,328 488,344 470,346 460,332" fill="#7dd3e8" stroke="#dc2626" strokeWidth="1.6" />
      </g>
    </g>
  </svg>
);

// ===================== KONTEN HALAMAN UTAMA =====================
const FEATURES = [
  { icon: 'pin', title: 'Wilayah bertingkat', text: 'Pilih provinsi, kabupaten/kota, lalu desa atau kelurahan. Batas desa di sekitarnya ikut tampil sebagai konteks.' },
  { icon: 'file', title: 'Lembar peta otomatis', text: 'Judul, arah utara, skala, legenda, dan metadata tersusun mengikuti wilayah yang Anda pilih.' },
  { icon: 'layers', title: 'Banyak peta dasar', text: 'Citra satelit, peta terang, mode gelap, jalan, dan topografi. Carto tersedia bila API key gratisnya diisi.' },
  { icon: 'image', title: 'Titik AOI dan foto', text: 'Tandai lokasi, tempel foto lapangan dengan keterangannya, lalu hubungkan dengan garis penunjuk yang bisa digeser.' },
  { icon: 'compass', title: 'Peta inset', text: 'Inset menunjukkan letak desa terhadap wilayah sekitarnya, dengan peta dasar yang bisa dipilih sendiri.' },
  { icon: 'download', title: 'Ekspor siap cetak', text: 'Unduh PNG resolusi tinggi atau PDF A4 lanskap langsung dari lembar peta.' }
];
const FEAT_CLASS = ['gl-tile--w4 gl-tile--dark gl-tile--split', '', '', '', '', 'gl-tile--w6 gl-tile--tint gl-tile--split'];
const FEAT_TONE = ['red', 'teal', 'blue', 'green', 'teal', 'ink'];

const STEPS = [
  { title: 'Pilih wilayah', text: 'Tentukan provinsi, kabupaten/kota, dan desa yang ingin dipetakan.' },
  { title: 'Atur tampilan', text: 'Pilih peta dasar, warna isi, garis batas, dan label.' },
  { title: 'Tambah titik dan foto', text: 'Tandai lokasi penting dan lampirkan foto beserta keterangannya.' },
  { title: 'Unduh hasil', text: 'Periksa lembar peta, lalu ekspor sebagai PNG atau PDF.' }
];

// Harga dan isi paket diambil dari PAKET_KREDIT di auth.tsx (satu sumber), jadi cukup ubah di sana.
interface PackItem { id: string; n: string; p: string; tag?: string; best?: boolean }
const PACK_ITEMS: PackItem[] = PAKET_KREDIT.map((p) => ({
  id: p.id,
  n: `${p.kredit} kredit`,
  p: rupiah(p.harga),
  tag: hemat(p) > 0 ? `Hemat ${rupiah(hemat(p))}` : undefined,
  best: !!p.badge
}));
const RINGKAS_PAKET = PAKET_KREDIT.map((p) => `${rupiah(p.harga)} untuk ${p.kredit} kredit`).join(', ');
const PLANS = [
  {
    id: 'kredit', name: 'Paket kredit', price: 'Rp20.000', unit: 'per kredit', hi: true, badge: 'Paling hemat',
    blurb: 'Bayar sesuai pemakaian. Satu kredit untuk satu kali ekspor PNG atau PDF. Menyusun peta tidak mengurangi kredit, tetapi saldo minimal 1 kredit dibutuhkan untuk memilih wilayah.',
    feats: ['Ekspor tanpa watermark', 'Resolusi cetak penuh', 'Kredit berlaku 12 bulan'],
    packs: PACK_ITEMS,
    cta: 'Pesan lewat WhatsApp'
  }
];

const SPECS = [
  { k: 'Batas wilayah', v: 'Batas administrasi desa/kelurahan dari Badan Informasi Geospasial (BIG).' },
  { k: 'Penyimpanan data', v: 'PostgreSQL/PostGIS di Aiven, diakses melalui server API.' },
  { k: 'Peta dasar', v: 'Esri (citra, jalan, topografi, kanvas abu-abu), OpenStreetMap, OpenTopoMap, serta Carto (Positron, Voyager, Dark Matter) bila memakai API key.' },
  { k: 'Penggambaran peta', v: 'MapLibre GL JS. Luas dan batas tampilan dihitung dengan Turf.js.' },
  { k: 'Koordinat', v: 'Geografis WGS 84, ditulis dalam derajat, menit, dan detik.' },
  { k: 'Skala', v: 'Dihitung dari zoom dan lintang dengan asumsi layar 96 DPI. Anggap sebagai perkiraan.' },
  { k: 'Luas wilayah', v: 'Memakai atribut LUAS bila tersedia. Jika tidak, dihitung dari geometri.' },
  { k: 'Ekspor', v: 'PNG lewat html-to-image (cadangan html2canvas), PDF A4 lanskap lewat jsPDF.' }
];

const FAQS = [
  { q: 'Apakah titik AOI dan foto saya tersimpan?', a: 'Belum. Titik, foto, dan pengaturan hanya ada di browser selama halaman terbuka. Ekspor ke PNG atau PDF sebelum menutup atau memuat ulang halaman.' },
  { q: 'Seberapa akurat skala pada peta?', a: 'Skala dihitung dari zoom dan lintang peta dengan asumsi layar 96 DPI, jadi bersifat perkiraan. Ukuran akhir di kertas bergantung pada hasil ekspor dan pengaturan cetak.' },
  { q: 'Dari mana data batas desa berasal?', a: 'Dari Badan Informasi Geospasial (BIG), disimpan di basis data PostGIS dan disajikan lewat server API.' },
  { q: 'Daftar provinsi tidak muncul. Apa yang harus dilakukan?', a: 'Aplikasi mengambil data wilayah dari server API. Pastikan server berjalan, lalu tekan Coba lagi di panel pengaturan.' },
  { q: 'Format apa saja yang bisa diunduh?', a: 'PNG resolusi tinggi dan PDF A4 lanskap.' },
  { q: 'Berapa harga kredit?', a: `Satu kredit Rp20.000. Paket yang tersedia: ${RINGKAS_PAKET}. Semakin besar paketnya, semakin murah harga per kredit.` },
  { q: 'Bagaimana cara membeli kredit?', a: 'Pilih paket di halaman ini atau di dalam akun Anda. Chat WhatsApp ke admin terbuka dengan pesan pesanan yang sudah terisi. Setelah pembayaran dikonfirmasi, admin menambahkan kredit ke akun Anda.' },
  { q: 'Apa yang dihitung sebagai satu kredit?', a: 'Satu kali ekspor PNG atau PDF A4 dari satu lembar peta.' },
  { q: 'Apakah kredit bisa kedaluwarsa?', a: 'Kredit berlaku 12 bulan sejak tanggal pembelian.' }
];

// ===================== STYLESHEET =====================
const APP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap');

.gl-root{
  --ink:#0c1f19; --ink-2:#2f4a40; --muted:#647a70; --line:#d5e3db; --line-2:#e8f0eb;
  --paper:#f1f6f3; --surface:#ffffff; --brand:#0b7a56; --brand-d:#086146; --brand-soft:#dcf1e7;
  --sea:#0a2e25; --bolt:#7be3b4; --bolt-d:#3fc08b; --bolt-soft:#d8f5e8; --danger:#dc2626; --danger-soft:#fee2e2;
  --shadow:0 1px 2px rgba(12,31,25,.06),0 10px 28px rgba(12,31,25,.12);
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
.gl-btn:disabled{opacity:.55;cursor:not-allowed}
.gl-btn--primary{background:var(--brand);border-color:var(--brand);color:#fff}
.gl-btn--primary:hover{background:var(--brand-d)}
.gl-btn--dark{background:var(--ink);border-color:var(--ink);color:#fff}
.gl-btn--dark:hover{background:#17352b}
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
.gl-input:focus,.gl-textarea:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(11,122,86,.18)}
.gl-textarea{min-height:68px;resize:vertical;line-height:1.4}
.gl-select{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;text-align:left}
.gl-select.is-open{border-color:var(--brand);box-shadow:0 0 0 3px rgba(11,122,86,.18)}
.gl-select:disabled{background:var(--paper);color:#8aa196;cursor:not-allowed}
.gl-select__val{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-select__ph{color:#7f968b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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
.gl-basemap:hover{border-color:#b3c9bc}
.gl-basemap.is-on{border-color:var(--brand);box-shadow:0 0 0 2px rgba(11,122,86,.25)}
.gl-basemap__thumb{height:46px;border-radius:8px;border:1px solid rgba(12,31,25,.08)}
.gl-basemap__name{padding:0 4px;font-size:12px;font-weight:600;line-height:1.25;color:var(--ink)}
.gl-basemap__desc{padding:0 4px;margin-top:-4px;font-size:11px;line-height:1.3;color:var(--muted)}

.gl-bmgroup{display:flex;flex-direction:column;gap:8px}
.gl-subhead{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.gl-basemap--wide{grid-column:1/-1}
.gl-legrow{display:flex;align-items:center;gap:8px}
.gl-legrow__sym{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:#fff;flex-shrink:0}
.gl-legrow__up{height:36px;padding:0 12px;font-size:12px}
.gl-color{position:relative;display:flex;align-items:center;gap:8px;height:38px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:#fff;cursor:pointer}
.gl-color input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.gl-color__sw{width:20px;height:20px;border-radius:6px;border:1px solid rgba(12,31,25,.2);flex-shrink:0}
.gl-color code{font:500 12px ui-monospace,Menlo,Consolas,monospace;color:var(--ink-2)}
.gl-range{width:100%;accent-color:var(--brand)}

.gl-toggle{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:var(--ink-2);cursor:pointer}
.gl-toggle input{position:absolute;opacity:0;width:1px;height:1px}
.gl-toggle i{position:relative;flex-shrink:0;width:36px;height:20px;border-radius:999px;background:#c3d3ca;transition:background .15s}
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
.gl-aoi.is-open{border-color:var(--brand);box-shadow:0 0 0 2px rgba(11,122,86,.12)}
.gl-aoi__head{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 6px}
.gl-aoi__toggle{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:2px;border:0;background:none;text-align:left;cursor:pointer;color:var(--ink);border-radius:8px}
.gl-aoi__chip{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;font-size:15px;flex-shrink:0;color:#fff}
.gl-aoi__name{flex:1;min-width:0;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-aoi__body{display:flex;flex-direction:column;gap:14px;padding:12px;border-top:1px solid var(--line-2)}
.gl-icons{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.gl-icons button{display:grid;place-items:center;aspect-ratio:1;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:18px;cursor:pointer;transition:background .15s}
.gl-icons button:hover{background:var(--line-2)}
.gl-icons button.is-on{border-width:2px}
.gl-icons__up{display:grid;place-items:center;aspect-ratio:1;border:1px dashed var(--muted);border-radius:10px;background:#fff;color:var(--muted);cursor:pointer;overflow:hidden}
.gl-icons__up:hover{background:var(--line-2)}
.gl-icons__up.is-on{border:2px solid var(--brand)}
.gl-icons__up img{width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box}
.gl-icons__up input{display:none}
.gl-tone{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.gl-tone button{display:flex;align-items:center;justify-content:center;gap:8px;height:36px;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:12px;font-weight:600;color:var(--ink);cursor:pointer}
.gl-tone button.is-on{border:2px solid var(--brand)}
.gl-tone i{display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #0c1f19}
.gl-coords{padding:7px 10px;border-radius:8px;background:var(--paper);font:500 12px ui-monospace,Menlo,Consolas,monospace;color:var(--ink-2)}
.gl-upload{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:92px;padding:12px;border:1.5px dashed #a6d1bd;border-radius:12px;background:#f0f9f4;color:var(--brand-d);font-size:12px;font-weight:600;text-align:center;cursor:pointer}
.gl-upload:hover{background:#e2f3ea}
.gl-upload input{display:none}
.gl-cardprev{position:relative;border-radius:10px;padding:3px;width:168px;max-width:100%;box-shadow:0 4px 12px rgba(12,31,25,.2)}
.gl-cardprev img{display:block;width:100%;height:96px;object-fit:cover;border-radius:7px 7px 0 0}
.gl-cardprev__cap{padding:6px 8px;background:#fff;color:#0c1f19;font-size:10px;line-height:1.4;font-weight:500;text-align:center;white-space:pre-wrap;word-break:break-word;border-radius:0 0 7px 7px}
.gl-cardprev__cap--solo{border-radius:7px}
.gl-cardprev__x{position:absolute;top:8px;right:8px;width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:6px;background:rgba(12,31,25,.72);color:#fff;cursor:pointer}
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
.gl-paper{flex:1;min-height:0;overflow:auto;display:grid;place-items:center;padding:20px;background-color:#e4ede8;background-image:radial-gradient(#c3d6cb 1px,transparent 1px);background-size:18px 18px}
.gl-backdrop{display:none}

@media (max-width:900px){
  .gl-side{position:fixed;top:0;bottom:0;left:0;width:min(420px,92vw);visibility:hidden;transform:translateX(-102%);transition:transform .25s ease,visibility .25s;box-shadow:var(--shadow)}
  .gl-side.is-open{visibility:visible;transform:none}
  .gl-side__close{display:inline-grid}
  .gl-backdrop{display:block;position:fixed;inset:0;z-index:25;background:rgba(12,31,25,.45)}
  .gl-menu-btn{display:inline-flex}
  .gl-toolbar__chips .gl-chip:last-child{display:none}
  .gl-paper{padding:12px}
}

/* ---------- halaman utama ---------- */
.gl-home{
  --h-ink:#08211a; --h-sea:#0b3a2e; --h-sea2:#115240; --h-teal:#0b7a56; --h-aqua:#7be3b4;
  --h-paper:#f1f6f3; --h-line:#d5e3db; --h-text:#173329; --h-mute:#566e63; --h-red:#dc2626; --h-green:#2f9e6b;
  position:absolute;inset:0;overflow-x:hidden;overflow-y:auto;background:#fff;color:var(--h-text);scroll-behavior:smooth
}
.gl-home h1,.gl-home h2,.gl-home h3,.gl-brand__name{font-family:'Newsreader','Cormorant Garamond',Georgia,serif}
.gl-nav{position:sticky;top:0;z-index:40;height:72px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 clamp(16px,5vw,64px);color:#fff;transition:background .2s,box-shadow .2s}
.gl-nav.is-solid{background:rgba(7,32,26,.94);backdrop-filter:blur(10px);box-shadow:0 1px 0 rgba(255,255,255,.08)}
.gl-brand{display:flex;align-items:center;gap:10px;padding:0;border:0;background:none;color:inherit;text-align:left;cursor:pointer}
.gl-brand__mark2{display:flex;justify-content:center;align-items:center;width:38px;height:38px;border-radius:10px;background-color: rgba(128, 128, 128, 0.2);
;color:#0a2e25;}
.gl-brand__mark svg{fill:#0a2e25}
.gl-brand__acc{font-style:normal;color:#7be3b4}
.gl-brand__name{font-size:18px;font-weight:700;line-height:1.1;letter-spacing:-.01em}
.gl-brand__sub{margin-top:2px;font-size:11px;opacity:.72}
.gl-nav__links{display:flex;align-items:center;gap:28px}
.gl-link{padding:6px 0;border:0;border-bottom:2px solid transparent;background:none;color:inherit;font:inherit;font-size:15px;font-weight:500;cursor:pointer;opacity:.9}
.gl-link:hover{border-bottom-color:var(--h-aqua);opacity:1}
.gf__cta1{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 15px;border:0;border-radius:12px;background:#7be3b4;color:#06281d;font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:filter .15s}
.gf__cta1:hover{filter:brightness(1.06)}
.gl-btn--light{height:40px;border:1px solid rgba(255,255,255,.7);background:transparent;color:#fff}
.gl-btn--light:hover{background:#fff;color:var(--h-ink)}
.gl-btn--white{background:#fff;border-color:#fff;color:var(--h-ink)}
.gl-btn--white:hover{background:#ddf3e8}
.gl-btn--outline{background:transparent;border-color:rgba(255,255,255,.5);color:#fff}
.gl-btn--outline:hover{background:rgba(255,255,255,.1)}
.gl-nav__toggle{display:none;border-color:rgba(255,255,255,.4);background:transparent;color:#fff}
.gl-nav__toggle:hover{background:rgba(255,255,255,.12)}

.gl-hero{position:relative;margin-top:-72px;min-height:100vh;min-height:100svh;padding:112px clamp(16px,5vw,64px) 56px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.12fr);gap:clamp(28px,5vw,72px);align-items:center;color:#fff;
  background:
    linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px) 0 0/64px 64px,
    linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px) 0 0/64px 64px,
    radial-gradient(60% 70% at 85% 40%,rgba(123,227,180,.2),transparent 70%),
    linear-gradient(rgba(7,32,26,.88),rgba(7,32,26,.88)),
    url('/hero.jpg') center/cover no-repeat,
    linear-gradient(160deg,#07201a 0%,#0b3a2e 60%,#0f4a3a 100%)}
.gl-hero__copy{max-width:560px}
.gl-hero h1{margin:0 0 18px;font-size:clamp(34px,4.6vw,58px);font-weight:700;line-height:1.06;letter-spacing:-.02em}
.gl-hero p{margin:0;max-width:50ch;font-size:clamp(16px,1.5vw,18px);line-height:1.6;color:rgba(255,255,255,.84)}
.gl-hero{overflow:hidden}
.gl-hero__copy,.gl-hero .gl-sheet{position:relative;z-index:2}
.gl-hero__bolt{position:absolute;z-index:1;right:5%;top:6%;height:72%;opacity:.13;pointer-events:none;filter:drop-shadow(0 0 30px rgba(123,227,180,.75));animation:gl-flash 7s infinite}
.gl-hero__bolt--2{right:auto;left:1%;top:auto;bottom:3%;height:38%;transform:rotate(-14deg) scaleX(-1);animation-delay:2.6s}
.gl-hero__tag{display:inline-flex;align-items:center;gap:6px;margin-bottom:16px;padding:5px 12px;border-radius:999px;border:1px solid rgba(123,227,180,.45);background:rgba(123,227,180,.12);color:#b4f0d3;font-size:12px;font-weight:600;letter-spacing:.02em}
.gl-hero__tag svg{fill:#7be3b4;stroke:#7be3b4}
@keyframes gl-flash{0%,84%,100%{opacity:.12}86%{opacity:.55}88%{opacity:.14}90%{opacity:.4}93%{opacity:.12}}
@keyframes gl-glow{0%,100%{box-shadow:0 0 0 1px rgba(123,227,180,.45),0 0 14px rgba(123,227,180,.35)}50%{box-shadow:0 0 0 1px rgba(123,227,180,.7),0 0 24px rgba(123,227,180,.7)}}
.gl-bolt-anim{animation:gl-glow 3.2s ease-in-out infinite}
.gl-side__head{position:relative}
.gl-side__head::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,transparent,#7be3b4 25%,#3fc08b 75%,transparent)}
.gl-side__title{display:flex;align-items:center;gap:6px}
.gl-side__title svg{fill:#7be3b4;stroke:#3fc08b}
.gl-sec.is-open .gl-sec__step{background:linear-gradient(135deg,#b4f0d3,#3fc08b);color:#0a2e25}
.gl-credit{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.gl-credit svg{fill:#7be3b4;stroke:#3fc08b}
@media (max-width:860px){.gl-hero__bolt{height:46%;right:-3%}.gl-hero__bolt--2{display:none}}
@media (prefers-reduced-motion:reduce){.gl-hero__bolt,.gl-bolt-anim{animation:none}}
.gl-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.gl-cta .gl-btn{height:48px;padding:0 22px;font-size:15px;border-radius:12px}
.gl-hero__facts{display:flex;flex-wrap:wrap;gap:10px 26px;margin:34px 0 0;padding:0;list-style:none;font-size:14px;color:rgba(255,255,255,.78)}
.gl-hero__facts li{display:inline-flex;align-items:center;gap:8px}
.gl-hero__facts svg{color:var(--h-aqua)}
.gl-sheet{width:100%;max-width:660px;justify-self:end;border-radius:6px;background:#fff;box-shadow:0 30px 70px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.14);overflow:hidden}
.gl-sheet svg{display:block;width:100%;height:auto}
.gl-draw{stroke-dasharray:1;stroke-dashoffset:0}
.hm-clip{cursor:grab}
.hm-card,.hm-label{cursor:grab}
.gl-sheet svg{touch-action:none;user-select:none;-webkit-user-select:none}

.gl-sect{scroll-margin-top:72px;padding:clamp(56px,8vw,104px) clamp(16px,5vw,64px)}
.gl-sect--tint{background:var(--h-paper)}
.gl-wrap{max-width:1120px;margin:0 auto}
.gl-sect h2{margin:0 0 14px;font-size:clamp(28px,3.4vw,42px);font-weight:700;line-height:1.1;letter-spacing:-.02em;color:var(--h-ink)}
.gl-head{max-width:640px;margin-bottom:36px}
.gl-lead{max-width:62ch;margin:0 0 14px;font-size:17px;line-height:1.65;color:var(--h-mute)}
.gl-head .gl-lead{margin-bottom:0}
.gl-about{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(28px,6vw,80px);align-items:start}
.gl-facts{margin:0;padding:0}
.gl-facts div{display:flex;justify-content:space-between;gap:16px;padding:15px 0;border-top:1px solid var(--h-line)}
.gl-facts div:last-child{border-bottom:1px solid var(--h-line)}
.gl-facts dt{color:var(--h-mute);font-size:15px}
.gl-facts dd{margin:0;font-size:15px;font-weight:600;text-align:right;color:var(--h-ink)}

.gl-bento{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.gl-tile{grid-column:span 2;display:flex;flex-direction:column;gap:6px;padding:26px;border:1px solid var(--h-line);border-radius:18px;background:#fff}
.gl-tile--w4{grid-column:span 4}
.gl-tile--w6{grid-column:span 6}
.gl-tile--split{flex-direction:row;align-items:center;justify-content:space-between;gap:28px}
.gl-tile--dark{background:var(--h-sea);border-color:var(--h-sea);color:#fff}
.gl-tile--tint{background:#e3f2ea;border-color:#c6e0d3}
.gl-tile__txt{max-width:46ch}
.gl-tile h3{margin:0 0 6px;font-size:19px;font-weight:700;letter-spacing:-.01em;color:var(--h-ink)}
.gl-tile--dark h3{color:#fff}
.gl-tile p{margin:0;font-size:15px;line-height:1.6;color:var(--h-mute)}
.gl-tile--dark p{color:rgba(255,255,255,.8)}
.gl-ic{display:inline-grid;place-items:center;width:42px;height:42px;margin-bottom:12px;border-radius:12px}
.gl-ic--red{background:#fde8e8;color:#b91c1c}
.gl-ic--teal{background:#d6f0e4;color:#096b4c}
.gl-ic--blue{background:#e2ede7;color:#2f5648}
.gl-ic--green{background:#dcf3e7;color:#17714a}
.gl-ic--ink{background:#dde8e1;color:var(--h-ink)}
.gl-tile--dark .gl-ic{background:rgba(255,255,255,.12);color:#fff}
.gl-cascade{display:flex;flex-direction:column;gap:8px;min-width:200px}
.gl-cascade div{display:flex;flex-direction:column;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,.08);border-left:3px solid rgba(255,255,255,.25)}
.gl-cascade div:last-child{background:rgba(255,255,255,.16);border-left-color:#ef4444}
.gl-cascade small{font-size:11px;color:rgba(255,255,255,.62)}
.gl-cascade b{font-size:14px;font-weight:600}
.gl-fmt{display:flex;gap:10px}
.gl-fmt span{display:inline-flex;align-items:center;height:40px;padding:0 18px;border-radius:10px;background:#fff;border:1px solid #bcdccd;font-size:14px;font-weight:700;color:var(--h-ink)}

.gl-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;margin:0;padding:0;list-style:none}
.gl-flow li{position:relative;padding-top:46px}
.gl-flow li::before{content:'';position:absolute;top:14px;left:38px;right:-14px;height:2px;background:repeating-linear-gradient(90deg,var(--h-teal) 0 6px,transparent 6px 11px)}
.gl-flow li:last-child::before{display:none}
.gl-step__n{position:absolute;top:0;left:0;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--h-teal);color:#fff;font-size:14px;font-weight:700}
.gl-flow h3{margin:0 0 6px;font-size:18px;font-weight:700;color:var(--h-ink)}
.gl-flow p{margin:0;font-size:15px;line-height:1.6;color:var(--h-mute)}

.gl-plans{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;max-width:980px;margin:0 auto}
.gl-plan{display:flex;flex-direction:column;gap:14px;padding:28px;border:1px solid var(--h-line);border-radius:18px;background:#fff}
.gl-plan--hi{background:var(--h-sea);border-color:var(--h-sea);color:#fff;box-shadow:0 24px 50px rgba(11,58,46,.28)}
.gl-plan h3{margin:0;font-size:18px;font-weight:700;color:var(--h-ink)}
.gl-plan--hi h3{color:#fff}
.gl-plan__price{font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:34px;font-weight:500;letter-spacing:-.02em;line-height:1.1;color:var(--h-ink)}
.gl-plan--hi .gl-plan__price{color:#fff}
.gl-plan__unit{font-size:14px;font-weight:500;color:var(--h-mute);font-family:Inter,system-ui,sans-serif;letter-spacing:0}
.gl-plan--hi .gl-plan__unit{color:rgba(255,255,255,.7)}
.gl-plan__blurb{margin:0;font-size:15px;line-height:1.55;color:var(--h-mute)}
.gl-plan--hi .gl-plan__blurb{color:rgba(255,255,255,.8)}
.gl-plan ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;font-size:15px}
.gl-plan li{display:flex;gap:10px;align-items:flex-start;line-height:1.45}
.gl-plan li svg{flex-shrink:0;margin-top:2px;color:var(--h-green)}
.gl-plan--hi li svg{color:var(--h-aqua)}
.gl-plan{position:relative;transition:transform .2s,box-shadow .2s}
.gl-plan:hover{transform:translateY(-6px);box-shadow:0 22px 44px rgba(11,58,46,.16)}
.gl-plan--hi{overflow:hidden;background:radial-gradient(120% 90% at 100% 0%,rgba(123,227,180,.35),transparent 55%),linear-gradient(160deg,#08211a,#0b3a2e 55%,#115240)}
.gl-plan--hi{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:36px;padding:40px 36px;align-items:center}
.gl-plan__main{display:flex;flex-direction:column;gap:14px}
.gl-plan__buy{display:flex;flex-direction:column;gap:14px}
.gl-plan--hi .gl-plan__price{font-size:46px}
.gl-plan--hi .gl-plan__buy .gl-btn{margin-top:6px}
.gl-plan--hi:hover{box-shadow:0 30px 60px rgba(11,58,46,.38)}
.gl-plan__badge{position:absolute;top:0;right:0;padding:7px 16px 7px 18px;border-radius:0 0 0 16px;background:linear-gradient(135deg,#7be3b4,#3fc08b);color:#06281d;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.gl-packs{display:flex;flex-direction:column;gap:10px}
.gl-pack{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:15px;text-align:left;cursor:pointer;transition:background .15s,transform .15s,border-color .15s}
.gl-pack:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.5);transform:translateY(-2px)}
.gl-pack--best{border:2px solid #7be3b4;background:linear-gradient(135deg,rgba(123,227,180,.24),rgba(123,227,180,.06))}
.gl-pack--best:hover{border-color:#b4f0d3;background:linear-gradient(135deg,rgba(123,227,180,.34),rgba(123,227,180,.1))}
.gl-pack__n{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-weight:600}
.gl-pack__n i{font-style:normal;font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;background:#7be3b4;color:#06281d}
.gl-pack b{font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:500}
.gl-plan .gl-btn{margin-top:auto;height:46px;border-radius:12px}

.gl-faq{max-width:780px}
.gl-faq details{padding:18px 0;border-top:1px solid var(--h-line)}
.gl-faq details:last-child{border-bottom:1px solid var(--h-line)}
.gl-faq summary{display:flex;justify-content:space-between;gap:16px;font-size:17px;font-weight:600;color:var(--h-ink);cursor:pointer;list-style:none}
.gl-faq summary::-webkit-details-marker{display:none}
.gl-faq summary::after{content:'+';color:var(--h-teal);font-size:22px;line-height:1}
.gl-faq details[open] summary::after{content:'\\2212'}
.gl-faq details p{margin:10px 0 0;max-width:62ch;font-size:15px;line-height:1.65;color:var(--h-mute)}
.gl-spec{margin:0;padding:0}
.gl-spec div{display:grid;grid-template-columns:220px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--h-line)}
.gl-spec div:last-child{border-bottom:1px solid var(--h-line)}
.gl-spec dt{font-size:15px;font-weight:600;color:var(--h-ink)}
.gl-spec dd{margin:0;font-size:15px;line-height:1.6;color:var(--h-mute)}

.gl-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;padding:40px clamp(16px,5vw,64px);background:#07201a;color:#bcd9cc}
.gl-foot b{display:block;color:#fff;font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:18px}
.gl-foot span{font-size:14px}
.gl-foot__links{display:flex;flex-wrap:wrap;gap:6px 22px}
.gl-foot__links .gl-link{font-size:14px;color:#bcd9cc}

@media (max-width:1000px){
  .gl-hero{grid-template-columns:1fr;min-height:0;padding-top:104px}
  .gl-sheet{justify-self:stretch;max-width:none}
  .gl-bento{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gl-tile,.gl-tile--w4,.gl-tile--w6{grid-column:span 1}
  .gl-tile--w4,.gl-tile--w6{grid-column:span 2}
  .gl-flow{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gl-flow li::before{display:none}
}
@media (max-width:860px){
  .gl-nav__toggle{display:inline-grid}
  .gl-nav__links{display:none;position:absolute;top:72px;left:12px;right:12px;flex-direction:column;align-items:stretch;gap:0;padding:8px;border-radius:14px;background:rgba(7,32,26,.97);box-shadow:var(--shadow)}
  .gl-nav__links.is-open{display:flex}
  .gl-nav__links .gl-link{padding:13px 14px;border:0;text-align:left}
  .gl-nav__links .gl-btn--light{margin:6px}
  .gl-about{grid-template-columns:1fr}
  .gl-plans{grid-template-columns:1fr}
  .gl-plan--hi{grid-template-columns:1fr;gap:24px;padding:32px 22px}
  .gl-spec div{grid-template-columns:1fr;gap:4px}
}
@media (max-width:600px){
  .gl-bento{grid-template-columns:1fr}
  .gl-tile,.gl-tile--w4,.gl-tile--w6{grid-column:span 1}
  .gl-tile--split{flex-direction:column;align-items:stretch}
  .gl-flow{grid-template-columns:1fr}
  .gl-cta .gl-btn{flex:1 1 100%}
  .gl-side__foot{grid-template-columns:1fr}
}

/* ---------- penyempurnaan mobile (hanya layar <= 900px, desktop tidak terpengaruh) ---------- */
@media (max-width:900px){
  /* target sentuh minimal 44px */
  .gl-btn{min-height:44px}
  .gl-iconbtn{width:44px;height:44px}
  .gl-link{min-height:44px;display:inline-flex;align-items:center}
  .gl-sec__head{min-height:48px}
  .gl-pop__item{padding:12px}
  .gl-toggle{min-height:44px}
  /* 16px mencegah iOS Safari memperbesar layar otomatis saat kolom diisi */
  .gl-input,.gl-textarea,.gl-select,.gl-pop__search input{font-size:16px}
}
@media (max-width:600px){
  .gl-hero{padding-bottom:40px}
  .gl-hero__facts{gap:8px 16px}
  .gl-tile{padding:20px}
  .gl-plan{padding:22px 18px}
  .gl-plan--hi{padding:52px 18px 26px}
  .gl-plan--hi .gl-plan__price{font-size:38px}
  .gl-pack{padding:12px 14px}
  .gl-foot{flex-direction:column;align-items:flex-start}
  .gl-foot .gl-btn{width:100%}
}
@media (max-width:360px){
  .gl-brand__sub{display:none}
  .gl-basemaps{grid-template-columns:1fr}
}


/* =====================================================================
   JADE: penyempurnaan dashboard dan animasi masking
   ===================================================================== */
.gl-root{--ease:cubic-bezier(.77,0,.18,1);--ease-out:cubic-bezier(.16,1,.3,1);--jade-ink:#07241c}

/* --- panel samping: kepala gelap jade --- */
.gl-side{border-right-color:#c9ddd2}
.gl-side__head{padding:16px 14px;color:#fff;border-bottom:0;background:linear-gradient(160deg,#06211a 0%,#0b3a2e 65%,#0f4a3a 100%)}
.gl-side__head .gl-iconbtn{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.18);color:#e8f7f0}
.gl-side__head .gl-iconbtn:hover{background:rgba(255,255,255,.16)}
.gl-side__head .gl-credit{background:rgba(123,227,180,.12);border-color:rgba(123,227,180,.42);color:#d9f7e8}
.gl-side__head .gl-credit:hover{background:rgba(123,227,180,.24)}
.gl-side__title{font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:600;letter-spacing:-.01em;color:#fff}
.gl-side__sub{color:rgba(224,244,234,.68)}
.gl-side__body{background:linear-gradient(180deg,#f1f6f3,#e9f1ec)}
.gl-side__foot{background:#fff;border-top-color:#d5e3db}

/* --- kartu bagian --- */
.gl-sec{border-color:#d5e3db}
.gl-sec.is-open{border-color:#b4d9c5;box-shadow:0 10px 26px -14px rgba(11,122,86,.45)}
.gl-sec__title{letter-spacing:-.005em}
.gl-sec__step{font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:14px;font-weight:600}

/* --- toolbar dan area peta --- */
.gl-toolbar{min-height:64px;background:var(--surface)}
.gl-toolbar__title{font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:21px;font-weight:500;line-height:1.25;letter-spacing:-.01em}
.gl-toolbar__sub{font-size:12.5px}
.gl-chip{background:var(--brand-soft);border-color:#c4e3d3;color:var(--brand-d)}
.gl-paper{position:relative;background-color:#e3ede7;background-image:radial-gradient(#c3d6cb 1px,transparent 1px);background-size:18px 18px}

/* --- tipografi halaman utama --- */
.gl-home h1{font-weight:500;letter-spacing:-.02em}
.gl-home h2,.gl-home h3{font-weight:500;letter-spacing:-.012em}
.gl-brand__name{font-weight:600}
.gl-brand__mark{background:linear-gradient(135deg,#b4f0d3,#3fc08b);box-shadow:0 0 0 1px rgba(123,227,180,.5),0 0 18px rgba(123,227,180,.4)}
.gl-hero__tag{border-color:rgba(123,227,180,.45);background:rgba(123,227,180,.12);color:#b4f0d3}

@media (max-width:900px){
  .gl-toolbar__title{font-size:18px}
}

/* =====================================================================
   PENYEMPURNAAN TAMPILAN DASHBOARD: gaya diam, tanpa animasi
   ===================================================================== */

/* panel samping: judul bagian bergaya serif, lebih tenang dari kartu bergaris tebal */
.gl-sec{position:relative;border-radius:14px;border-color:#dbe8e0}
.gl-sec::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;
  background:linear-gradient(180deg,var(--bolt-d),var(--brand));transform:scaleY(0);transform-origin:top}
.gl-sec.is-open::before{transform:scaleY(1)}
.gl-sec__head{padding:14px 16px}
.gl-sec__head:hover .gl-sec__title{color:var(--brand-d)}
.gl-sec__title{font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:17px;font-weight:500;letter-spacing:-.01em}
.gl-sec__step{width:auto;height:auto;background:none;border-radius:0;color:var(--brand);font-size:19px;font-weight:500;font-variant-numeric:lining-nums;min-width:14px}
.gl-sec__body{padding:2px 16px 16px}

/* subjudul kelompok: huruf biasa, bukan kapital berjarak */
.gl-subhead{font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink-2)}

/* tombol utama: sedikit kedalaman, tanpa gradasi dekoratif */
.gl-btn--primary{box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 18px -10px rgba(11,122,86,.85)}
.gl-btn--dark{box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 18px -10px rgba(7,36,28,.8)}
.gl-btn--primary:hover,.gl-btn--dark:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 12px 22px -10px rgba(11,122,86,.7)}

/* toolbar dan scrollbar */
.gl-toolbar{border-bottom:0;box-shadow:0 1px 0 #d5e3db,0 10px 30px -22px rgba(12,31,25,.5)}
.gl-side__body{scrollbar-color:#b9d0c5 transparent}
.gl-paper::-webkit-scrollbar{width:10px;height:10px}
.gl-paper::-webkit-scrollbar-thumb{background:#b9d0c5;border-radius:10px;border:2px solid #e3ede7}

/* ---------- skeleton loading (hanya transform, ringan) ---------- */
.gl-skel{display:block;position:relative;overflow:hidden;border-radius:8px;background:#dce8e1}
.gl-skel::after{content:'';position:absolute;inset:0;transform:translateX(-100%);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);animation:gl-skel 1.4s ease-in-out infinite}
@keyframes gl-skel{to{transform:translateX(100%)}}
.gl-skel--field{height:38px;border-radius:10px}
.gl-skel--circle{border-radius:50%}
.gl-skelsec{display:flex;flex-direction:column;gap:12px;padding:14px 16px;background:var(--surface);border:1px solid #dbe8e0;border-radius:14px;flex-shrink:0}
.gl-skelsec__head{display:flex;align-items:center;gap:12px}
.gl-skelov{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:#e3ede7}
.gl-skelsheet{display:grid;grid-template-columns:1fr 26%;gap:8px;padding:8px;background:#fff;border:2px solid #cfdad4;box-shadow:0 18px 50px rgba(12,31,25,.18)}
.gl-skelsheet .gl-skel{border-radius:3px}
.gl-skelsheet__col{display:flex;flex-direction:column;gap:8px;min-height:0}

/* kartu peta dasar: pilihan aktif lebih jelas */
.gl-basemap.is-on{box-shadow:0 0 0 2px rgba(11,122,86,.35),0 10px 20px -12px rgba(11,122,86,.6)}
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
  const auth = useAuth();
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [showAccount, setShowAccount] = useState<boolean>(false);

  // Judul tab dan favicon petir (tidak perlu mengubah index.html)
  useEffect(() => {
  document.title = 'Petakilat ';
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.type = 'image/png';
  link.href = `${import.meta.env.BASE_URL}logo1.png`;
}, []);

  // Kalau belum login tapi membuka #/peta langsung, kembalikan ke beranda + tampilkan form login
  useEffect(() => {
  if (!auth.loading && !auth.user && activePage === 'admin-map') {
    setActivePage('home');
    setShowAuth(true);
  }
  }, [auth.loading, auth.user, activePage]);
  const [navSolid, setNavSolid] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({ lokasi: true, dasar: false, simbol: false, gee: false, aoi: false, identitas: false, layout: false });
  const [exporting, setExporting] = useState<'' | 'png' | 'pdf'>('');
  const [exportDpi, setExportDpi] = useState<number>(300);
  const [apiError, setApiError] = useState<string>('');
  const [loadingKab, setLoadingKab] = useState<boolean>(false);
  const [loadingProv, setLoadingProv] = useState<boolean>(true); // daftar provinsi
  const [loadingKabList, setLoadingKabList] = useState<boolean>(false); // daftar kabupaten/kota
  const [sheetScale, setSheetScale] = useState<number>(1);

  // --- IDENTITAS & KARTOGRAFI ---
  const [judulUtama, setJudulUtama] = useState<string>('PETA ADMINISTRASI DESA');
  const [namaWilayahJudul, setNamaWilayahJudul] = useState<string>('');
  const [subJudul, setSubJudul] = useState<string>('KABUPATEN BENGKULU UTARA - PROVINSI BENGKULU');
  const [sumberData, setSumberData] = useState<string>('Badan Informasi Geospasial (BIG) & WebGIS');
  const [pembuatPeta, setPembuatPeta] = useState<string>('Laboratorium SIG & Informatika');
  const [tahunPeta, setTahunPeta] = useState<string>('2026');

  // --- LOGO & TANDA TANGAN (opsional) ---
  const [logoInstansi, setLogoInstansi] = useState<string>('');
  const [logoMitra, setLogoMitra] = useState<string>('');
  const [showTtd, setShowTtd] = useState<boolean>(false);
  const [ttdTempatTanggal, setTtdTempatTanggal] = useState<string>('');
  const [penandatangan, setPenandatangan] = useState<Penandatangan[]>([
    { id: 'ttd-1', jabatan: 'Mengetahui', nama: '', nip: '' }
  ]);

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
  const geeTileUrlRef = useRef<Record<string, string>>({});

  const toggleGeeLayer = async (key: string, on: boolean) => {
    const map = mapInstance.current;
    if (!on) {
      setGeeActive((p) => ({ ...p, [key]: false }));
      delete geeTileUrlRef.current[key];
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
      geeTileUrlRef.current[key] = data.tileUrl;
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
  const homeRef = useRef<HTMLDivElement>(null);
  // Animasi GSAP hanya di halaman beranda (lihat motion.tsx)
  useHomeMotion(homeRef, activePage === 'home');
  useHeroMap(homeRef, activePage === 'home');
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

  const aoiMarkersMapRef = useRef<Map<string, { pointMarker: maplibregl.Marker; calloutMarker?: maplibregl.Marker; bendMarker?: maplibregl.Marker }>>(new Map());

  const toggleSec = (k: string) => setOpenSec((p) => ({ ...p, [k]: !p[k] }));

  const addTtd = () =>
    setPenandatangan((p) => [...p, { id: `ttd-${Date.now()}-${p.length}`, jabatan: '', nama: '', nip: '' }]);
  const patchTtd = (id: string, patch: Partial<Penandatangan>) =>
    setPenandatangan((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeTtd = (id: string) => setPenandatangan((p) => p.filter((x) => x.id !== id));
  // Fitur lain baru terbuka setelah kabupaten/kota dipilih dan datanya berhasil dimuat
  const wilayahSiap = !!selectedKab && !loadingKab && listDesa.length > 0;
  const patchAoi = (id: string, patch: Partial<AoiItem>) =>
    setAoiList((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const goTo = (id: string) => {
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openApp = () => {
    setNavOpen(false);
    if (!auth.user) { setShowAuth(true); return; }
    setActivePage('admin-map');
  };

  // Tombol utama di kartu harga: belum login -> form masuk, sudah login -> pesan paket yang ditandai paling hemat
  const choosePlan = (planId: string) => {
    if (planId === 'kredit') {
      const best = PAKET_KREDIT.find((p) => p.badge) || PAKET_KREDIT[0];
      pilihPaket(best.id);
      return;
    }
    openApp();
  };

  // Pilih satu paket kredit: belum login -> buka form masuk, sudah login -> langsung ke WhatsApp admin dengan pesan pesanan terisi
  const pilihPaket = (paketId: string) => {
    setNavOpen(false);
    if (!auth.user) { setShowAuth(true); return; }
    const p = PAKET_KREDIT.find((x) => x.id === paketId) || PAKET_KREDIT[0];
    window.open(linkWaPaket(p, auth.user), '_blank', 'noopener,noreferrer');
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
    setLoadingProv(true);
    fetch(`${API}/api/get-wilayah`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((provinces) => {
        if (Array.isArray(provinces)) setListProvinsi(provinces);
      })
      .catch(() => setApiError('Server data wilayah tidak dapat dihubungi.'))
      .finally(() => setLoadingProv(false));
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
        iconImageUrl: '',
        lineTone: 'white',
        bendLng: null,
        bendLat: null
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

  // Garis penunjuk (leader lines): putih atau hitam, bisa dibelokkan lewat titik pegangan di tengah garis
  const updateLeaderLinesGeoJson = (items: AoiItem[]) => {
    const map = mapInstance.current;
    if (!map) return;

    const active = items.filter(hasCallout);
    const fc = {
      type: 'FeatureCollection' as const,
      features: active.map((a) => {
        const tone = LINE_TONES[toneOf(a)];
        return {
          type: 'Feature' as const,
          properties: { id: a.id, color: tone.main, casing: tone.casing },
          geometry: { type: 'LineString' as const, coordinates: leaderCoords(a) }
        };
      })
    };

    // Titik pegangan selalu mengikuti garis (di tengah bila belum dibelokkan)
    active.forEach((a) => {
      const handle = aoiMarkersMapRef.current.get(a.id)?.bendMarker;
      if (handle) handle.setLngLat(bendHandlePos(a));
    });

    if (map.getSource('aoi-leader-lines-source')) {
      (map.getSource('aoi-leader-lines-source') as maplibregl.GeoJSONSource).setData(fc as any);
    } else if (map.isStyleLoaded()) {
      map.addSource('aoi-leader-lines-source', { type: 'geojson', data: fc as any });
      if (!map.getLayer('aoi-leader-lines-casing')) {
        map.addLayer({
          id: 'aoi-leader-lines-casing',
          type: 'line',
          source: 'aoi-leader-lines-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['coalesce', ['get', 'casing'], '#0f172a'],
            'line-width': 4.5,
            'line-opacity': 0.55
          }
        });
      }
      if (!map.getLayer('aoi-leader-lines-layer')) {
        map.addLayer({
          id: 'aoi-leader-lines-layer',
          type: 'line',
          source: 'aoi-leader-lines-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#ffffff'],
            'line-width': 2.2
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
        obj.bendMarker?.remove();
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
          cardEl.style.cssText = CALLOUT_FRAME_CSS(aoi);
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
          const frame = calloutFrameStyle(aoi);
          cardEl.style.background = frame.background;
          cardEl.style.boxShadow = frame.boxShadow;
          cardEl.innerHTML = buildCalloutHtml(aoi);
        }

        // Titik pegangan di garis: geser untuk membelokkan garis, klik dua kali untuk meluruskan lagi
        if (!markerObj.bendMarker) {
          const handleEl = document.createElement('div');
          handleEl.setAttribute('data-export-hide', 'true');
          handleEl.title = 'Geser untuk membelokkan garis. Klik dua kali untuk meluruskan.';
          handleEl.style.cssText = 'width:12px;height:12px;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.5);cursor:move;border:2px solid #0f172a;background:#fff;';

          const bendMarker = new maplibregl.Marker({ element: handleEl, draggable: true })
            .setLngLat(bendHandlePos(aoi))
            .addTo(map);

          bendMarker.on('drag', () => {
            const pos = bendMarker.getLngLat();
            const updated = aoiListRef.current.map((it) => (it.id === aoi.id ? { ...it, bendLng: pos.lng, bendLat: pos.lat } : it));
            aoiListRef.current = updated;
            updateLeaderLinesGeoJson(updated);
          });
          bendMarker.on('dragend', () => {
            const pos = bendMarker.getLngLat();
            patchAoi(aoi.id, { bendLng: pos.lng, bendLat: pos.lat });
          });
          handleEl.addEventListener('dblclick', (ev) => {
            ev.stopPropagation();
            patchAoi(aoi.id, { bendLng: null, bendLat: null });
          });

          markerObj.bendMarker = bendMarker;
        } else {
          markerObj.bendMarker.setLngLat(bendHandlePos(aoi));
        }
        const hEl = markerObj.bendMarker.getElement();
        hEl.style.background = hasBend(aoi) ? '#0f172a' : '#ffffff';
        hEl.style.borderColor = hasBend(aoi) ? '#ffffff' : '#0f172a';
      } else {
        if (markerObj.calloutMarker) {
          markerObj.calloutMarker.remove();
          markerObj.calloutMarker = undefined;
        }
        if (markerObj.bendMarker) {
          markerObj.bendMarker.remove();
          markerObj.bendMarker = undefined;
        }
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
        setApiError('Kredit Anda habis. Silakan beli kredit lewat admin (WhatsApp) untuk mengakses peta.');
        setShowAccount(true); // buka panel beli kredit
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

    setLoadingKabList(true);
    fetch(`${API}/api/get-wilayah?provinsi=${encodeURIComponent(prov)}`)
      .then((res) => res.json())
      .then((kabupatens) => {
        if (Array.isArray(kabupatens)) setListKabupaten(kabupatens);
      })
      .catch(() => setApiError('Gagal memuat daftar kabupaten/kota.'))
      .finally(() => setLoadingKabList(false));
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
      if (res.status === 402) setShowAccount(true); // kredit habis -> buka panel beli kredit
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
  const renderSheetToCanvas = async (dpi: number = 300): Promise<HTMLCanvasElement | null> => {
    const sheetPr = dpiToPixelRatio(dpi);
    if (!sheetRef.current) return null;

    const ok = await ensureScript('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if (!ok) {
      alert('Library html2canvas gagal dimuat. Periksa koneksi internet lalu coba lagi.');
      return null;
    }

    const mainMap = mapInstance.current;
    const inset = insetInstance.current;

    // Naikkan detail tile + pixel ratio, lalu tunggu semua tile selesai dimuat
    const prep = await prepareMapsForExport(
      [
        { map: mainMap, basemapKey: basemapKeyRef.current, geeUrls: geeTileUrlRef.current, geeOpacity: geeOpacityRef.current },
        { map: inset, basemapKey: insetKeyRef.current }
      ],
      sheetPr
    );

    let mainUrl = '';
    let insetUrl = '';
    try {
      [mainUrl, insetUrl] = await Promise.all([captureMapCanvas(mainMap), captureMapCanvas(inset)]);
    } finally {
      prep.restore();
    }

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
            pixelRatio: sheetPr,
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
          scale: sheetPr,
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

  const exportFileBase = () => `Petakilat-${(selectedDesa || selectedKab || 'Wilayah').replace(/\s+/g, '-')}`;

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
      const canvas = await renderSheetToCanvas(exportDpi);
      if (!canvas) return;
      const blob = await canvasToPngBlob(canvas, exportDpi);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${exportFileBase()}-${exportDpi}dpi.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
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
      const canvas = await renderSheetToCanvas(exportDpi);
      if (!canvas) return;
      // 600 dpi: pakai JPEG kualitas tinggi agar berkas PDF tidak membengkak
      const useJpeg = exportDpi > 300;
      const imgData = useJpeg ? canvas.toDataURL('image/jpeg', 0.95) : canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, useJpeg ? 'JPEG' : 'PNG', 0, (pdf.internal.pageSize.getHeight() - pdfHeight) / 2, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`${exportFileBase()}-${exportDpi}dpi.pdf`);
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
        <div className="gl-home" ref={homeRef} onScroll={(e) => setNavSolid(e.currentTarget.scrollTop > 24)}>
          <header className={`gl-nav ${navSolid || navOpen ? 'is-solid' : ''}`}>
            <button type="button" className="gl-brand" onClick={() => document.querySelector('.gl-home')?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Petakilat, kembali ke atas">
              <span className="gl-brand__mark2">
                <img
                  src={`${import.meta.env.BASE_URL}ProjectKalibata1.png`}
                  alt=""
                  width={'78px'}
                  height={'88px'}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '16px' }}
                />
              </span>
              <span>
                <span className="gl-brand__name" style={{ display: 'block' }}>Peta<em className="gl-brand__acc">kilat</em></span>
                <span className="gl-brand__sub" style={{ display: 'block' }}>Buat Peta Secepat Kilat</span>
              </span>
            </button>

            <button type="button" className="gl-iconbtn gl-nav__toggle" onClick={() => setNavOpen((o) => !o)} aria-label={navOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={navOpen}>
              <Icon name={navOpen ? 'x' : 'menu'} size={20} />
            </button>

            <nav className={`gl-nav__links ${navOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
              <button type="button" className="gl-link" onClick={() => goTo('fitur')}>Fitur</button>
              <button type="button" className="gl-link" onClick={() => goTo('cara-kerja')}>Cara kerja</button>
              <button type="button" className="gl-link" onClick={() => goTo('harga')}>Harga</button>
              <button type="button" className="gl-link" onClick={() => goTo('metodologi')}>Metodologi</button>
              <button type="button" className="gl-link" onClick={() => goTo('faq')}>FAQ</button>
            {auth.user ? (
              <button
                type="button"
                className="gl-link gl-credit"
                onClick={() => setShowAccount(true)}
              >
                <UserCircle size={30} /> {auth.user.nama}
              </button>
            ) : (
              <button type="button" className="gf__cta1" onClick={() => setShowAuth(true)}>Masuk</button> 
            )}
            </nav>
          </header>

          <section className="gl-hero">
            <svg className="gl-hero__bolt" viewBox="0 0 200 320" aria-hidden="true" focusable="false">
              <defs><linearGradient id="gl-bolt-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b4f0d3" /><stop offset="1" stopColor="#3fc08b" /></linearGradient></defs>
              <polygon points="125,0 20,170 95,170 70,320 185,120 108,120" fill="url(#gl-bolt-g)" />
            </svg>
            <svg className="gl-hero__bolt gl-hero__bolt--2" viewBox="0 0 200 320" aria-hidden="true" focusable="false">
              <polygon points="125,0 20,170 95,170 70,320 185,120 108,120" fill="url(#gl-bolt-g)" />
            </svg>
            <div className="gl-hero__copy">
              <h1>Susun peta administrasi desa yang siap cetak</h1>
              <p>Petakilat menyusun lembar peta desa atau kelurahan lengkap dengan judul, arah utara, skala, legenda, dan metadata. Pilih wilayah, atur tampilan, lalu unduh sebagai PNG atau PDF A4.</p>
              <div className="gl-cta">
                <button
                  type="button"
                  className={`gl-btn gl-btn--white gl-btn--highlight`}
                  onClick={openApp}
                >
                  Buat peta sekarang
                </button>
              </div>
              <ul className="gl-hero__facts">
                <li><Icon name="check" size={16} /> Koordinat WGS 84</li>
                <li><Icon name="check" size={16} /> {AVAILABLE_KEYS.length} pilihan peta dasar</li>
                <li><Icon name="check" size={16} /> PNG dan PDF A4</li>
              </ul>
            </div>
            <div className="gl-sheet"><HeroSheet /></div>
          </section>

          <section id="tentang" className="gl-sect">
            <div className="gl-wrap gl-about">
              <div>
                <h2>Tentang Petakilat</h2>
                <p className="gl-lead">Petakilat adalah aplikasi web untuk membuat peta administrasi desa dan kelurahan dengan tata letak kartografi, mengikuti gaya lembar peta cetak seperti pada QGIS Print Composer.</p>
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
              <div className="gl-head">
                <h2>Semua yang dibutuhkan satu lembar peta</h2>
                <p className="gl-lead">Dari pemilihan wilayah sampai berkas siap cetak, tanpa perangkat lunak tambahan.</p>
              </div>
              <div className="gl-bento">
                {FEATURES.map((f, i) => (
                  <div className={`gl-tile ${FEAT_CLASS[i]}`} key={f.title}>
                    <div className="gl-tile__txt">
                      <span className={`gl-ic gl-ic--${FEAT_TONE[i]}`}><Icon name={f.icon} size={22} /></span>
                      <h3>{f.title}</h3>
                      <p>{f.text}</p>
                    </div>
                    {i === 0 && (
                      <div className="gl-cascade" aria-hidden="true">
                        <div><small>Provinsi</small><b>Bengkulu</b></div>
                        <div><small>Kabupaten/kota</small><b>Kota Bengkulu</b></div>
                        <div><small>Desa/kelurahan</small><b>Betungan</b></div>
                      </div>
                    )}
                    {i === 5 && (
                      <div className="gl-fmt" aria-hidden="true"><span>PNG</span><span>PDF A4</span></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="cara-kerja" className="gl-sect">
            <div className="gl-wrap">
              <div className="gl-head">
                <h2>Cara kerja</h2>
                <p className="gl-lead">Empat langkah dari wilayah kosong sampai peta siap cetak.</p>
              </div>
              <ol className="gl-flow">
                {STEPS.map((st, i) => (
                  <li key={st.title}>
                    <span className="gl-step__n">{i + 1}</span>
                    <h3>{st.title}</h3>
                    <p>{st.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="harga" className="gl-sect gl-sect--tint">
            <div className="gl-wrap">
              <div className="gl-head">
                <h2>Bayar sesuai pemakaian</h2>
                <p className="gl-lead">Tanpa langganan. Kredit hanya berkurang ketika Anda mengekspor peta tanpa watermark.</p>
              </div>
              <div className="gl-plans">
                {PLANS.map((pl) => (
                  <article className={`gl-plan ${pl.hi ? 'gl-plan--hi' : ''}`} key={pl.id}>
                    {pl.badge && <span className="gl-plan__badge">{pl.badge}</span>}
                    <div className="gl-plan__main">
                      <h3>{pl.name}</h3>
                      <div className="gl-plan__price">{pl.price} <span className="gl-plan__unit">{pl.unit}</span></div>
                      <p className="gl-plan__blurb">{pl.blurb}</p>
                      <ul>
                        {pl.feats.map((ft) => (<li key={ft}><Icon name="check" size={16} /> <span>{ft}</span></li>))}
                      </ul>
                    </div>
                    <div className="gl-plan__buy">
                    {pl.packs.length > 0 && (
                      <div className="gl-packs">
                        {pl.packs.map((pk) => (
                          <button type="button" key={pk.id} className={`gl-pack ${pk.best ? 'gl-pack--best' : ''}`} onClick={() => pilihPaket(pk.id)}>
                            <span className="gl-pack__n">{pk.n}{pk.tag && <i>{pk.tag}</i>}</span>
                            <b>{pk.p}</b>
                          </button>
                        ))}
                      </div>
                    )}
                    <button type="button" className={`gl-btn ${pl.hi ? 'gl-btn--white' : 'gl-btn--primary'}`} onClick={() => choosePlan(pl.id)}>{pl.cta}</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="metodologi" className="gl-sect">
            <div className="gl-wrap">
              <div className="gl-head">
                <h2>Data dan metodologi</h2>
                <p className="gl-lead">Dari mana data berasal dan bagaimana hasilnya dihitung.</p>
              </div>
              <dl className="gl-spec">
                {SPECS.map((sp) => (
                  <div key={sp.k}><dt>{sp.k}</dt><dd>{sp.v}</dd></div>
                ))}
              </dl>
            </div>
          </section>

          <section id="faq" className="gl-sect gl-sect--tint">
            <div className="gl-wrap">
              <div className="gl-head"><h2>Pertanyaan yang sering diajukan</h2></div>
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

          <SiteFooter goTo={goTo} openApp={openApp} />
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
              <div className="gl-side__title"><Icon name="bolt" size={15} /> Peta<span className="gl-brand__acc" style={{ color: 'var(--bolt-d)' }}>kilat</span></div>
              <div className="gl-side__sub">Pembuat peta administrasi, hasil tampil langsung</div>
            </div>
            <button type="button" className="gl-btn gl-btn--sm gl-credit" onClick={() => setShowAccount(true)}>
              <Icon name="bolt" size={13} /> {auth.user?.role === 'admin' ? '∞' : auth.user?.kredit ?? 0} kredit
            </button>
            <button type="button" className="gl-iconbtn gl-side__close" onClick={() => setSidebarOpen(false)} aria-label="Tutup panel">
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className="gl-side__body" aria-busy={auth.loading || undefined}>
            {auth.loading ? <SideSkeleton /> : (<>
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
              <SearchSelect label="Provinsi" value={selectedProv} options={listProvinsi} loading={loadingProv} placeholder="Pilih provinsi" onChange={handleSelectProvinsi} onBeforeOpen={cekKreditProvinsi} />
              <SearchSelect label="Kabupaten / kota" value={selectedKab} options={listKabupaten} loading={loadingKabList} disabled={!selectedProv} placeholder={selectedProv ? 'Pilih kabupaten / kota' : 'Pilih provinsi dahulu'} onChange={handleSelectKabupaten} />
              <SearchSelect label="Desa / kelurahan" value={selectedDesa} options={listDesa} loading={loadingKab} disabled={!selectedKab || loadingKab} placeholder={loadingKab ? 'Memuat data desa...' : selectedKab ? 'Pilih desa / kelurahan' : 'Pilih kabupaten dahulu'} onChange={handleSelectDesa} />
            </Section>

            {/* 2. PETA DASAR */}
            <Section step={2} locked={!wilayahSiap} title="Peta dasar" open={!!openSec.dasar} onToggle={() => toggleSec('dasar')}>
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
                <div className="gl-basemaps" role="group" aria-label="Peta dasar inset">
                  {INSET_CHOICES.map((key) => {
                    const isSync = key === INSET_SYNC;
                    const item = BASEMAP_TILES[isSync ? basemapKey : key] || BASEMAP_TILES.citra;
                    return (
                      <button
                        type="button" key={key}
                        className={`gl-basemap ${isSync ? 'gl-basemap--wide' : ''} ${insetBasemapKey === key ? 'is-on' : ''}`}
                        onClick={() => setInsetBasemapKey(key)} aria-pressed={insetBasemapKey === key}
                      >
                        <span className="gl-basemap__thumb" style={{ background: item.thumb }} />
                        <span className="gl-basemap__name">{isSync ? 'Ikuti peta utama' : item.name}</span>
                        <span className="gl-basemap__desc">{isSync ? `Sama dengan peta dasar utama (${item.name})` : item.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="gl-note">Peta inset di lembar peta bebas dipilih terpisah dari peta utama. Bawaannya peta terang tanpa label, seperti peta letak pada umumnya.</div>
              </div>
            </Section>

            {/* 3. SIMBOLOGI */}
            <Section step={3} locked={!wilayahSiap} title="Simbologi batas wilayah" open={!!openSec.simbol} onToggle={() => toggleSec('simbol')}>
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
            <Section step={4} locked={!wilayahSiap} title="Layer Google Earth Engine" open={!!openSec.gee} onToggle={() => toggleSec('gee')} badge={Object.values(geeActive).some(Boolean) ? <span className="gl-badge">{Object.values(geeActive).filter(Boolean).length} aktif</span> : undefined}>
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
            <Section step={5} locked={!wilayahSiap} title="Titik AOI dan foto" open={!!openSec.aoi} onToggle={() => toggleSec('aoi')} badge={<span className="gl-badge">{aoiList.length} titik</span>}>
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
                              {AOI_ICONS.map((ic) => {
                                const on = !aoi.iconImageUrl && aoi.icon === ic.emoji;
                                return (
                                  <button
                                    key={ic.emoji}
                                    type="button"
                                    title={ic.label}
                                    aria-label={ic.label}
                                    aria-pressed={on}
                                    className={on ? 'is-on' : ''}
                                    style={on ? { borderColor: aoi.color, background: `${aoi.color}18` } : undefined}
                                    onClick={() => patchAoi(aoi.id, { icon: ic.emoji, iconImageUrl: '' })}
                                  >
                                    {ic.emoji}
                                  </button>
                                );
                              })}
                              <label
                                className={`gl-icons__up ${aoi.iconImageUrl ? 'is-on' : ''}`}
                                title={aoi.iconImageUrl ? 'Ganti gambar ikon' : 'Unggah gambar ikon sendiri'}
                              >
                                {aoi.iconImageUrl ? <img src={aoi.iconImageUrl} alt="Ikon unggahan" /> : <Icon name="upload" size={18} />}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (!file) return;
                                    readIconFile(file, (url) => patchAoi(aoi.id, { iconImageUrl: url }));
                                  }}
                                />
                              </label>
                            </div>
                            {aoi.iconImageUrl && (
                              <button type="button" className="gl-btn gl-legrow__up" onClick={() => patchAoi(aoi.id, { iconImageUrl: '' })}>
                                <Icon name="trash" size={14} /> Hapus gambar ikon
                              </button>
                            )}
                            <div className="gl-note">Kotak paling akhir untuk mengunggah gambar sendiri. Gambar itu dipakai sebagai pin di peta sekaligus simbol di legenda.</div>
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
                              <div className="gl-legrow">
                                <span className="gl-legrow__sym"><LegendSymbol aoi={aoi} size={22} /></span>
                                <div className="gl-note" style={{ flex: 1 }}>Simbol legenda sama dengan pin di peta. Tanpa nama khusus, legenda memakai nama titik.</div>
                              </div>
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
                              <div className="gl-cardprev" style={{ background: LINE_TONES[toneOf(aoi)].main, outline: '1px solid #cbd5e1' }}>
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
                          {aoi.showCallout && (
                            <>
                              <div className="gl-field">
                                <span className="gl-label">Warna garis dan bingkai foto</span>
                                <div className="gl-tone">
                                  <button type="button" className={toneOf(aoi) === 'white' ? 'is-on' : ''} aria-pressed={toneOf(aoi) === 'white'} onClick={() => patchAoi(aoi.id, { lineTone: 'white' })}>
                                    <i style={{ background: '#fff' }} /> Putih
                                  </button>
                                  <button type="button" className={toneOf(aoi) === 'black' ? 'is-on' : ''} aria-pressed={toneOf(aoi) === 'black'} onClick={() => patchAoi(aoi.id, { lineTone: 'black' })}>
                                    <i style={{ background: '#0f172a' }} /> Hitam
                                  </button>
                                </div>
                              </div>
                              {hasBend(aoi) && (
                                <button type="button" className="gl-btn gl-legrow__up" onClick={() => patchAoi(aoi.id, { bendLng: null, bendLat: null })}>
                                  <Icon name="rotate" size={14} /> Luruskan garis
                                </button>
                              )}
                            </>
                          )}
                          <div className="gl-note">Keterangan tampil di kotak putih di bawah foto. Kosongkan untuk memakai nama titik. Geser pin atau kartu foto untuk memindahkannya. Bila garis bertabrakan dengan garis lain, geser titik kecil di tengah garis untuk membelokkannya; klik dua kali titik itu untuk meluruskan lagi.</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* 5. IDENTITAS */}
            <Section step={6} locked={!wilayahSiap} title="Identitas dan judul peta" open={!!openSec.identitas} onToggle={() => toggleSec('identitas')}>
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

            {/* 7. LOGO & TANDA TANGAN (OPSIONAL) */}
            <Section
              step={7}
              locked={!wilayahSiap}
              title="Logo dan tanda tangan"
              open={!!openSec.layout}
              onToggle={() => toggleSec('layout')}
              badge={(logoInstansi || logoMitra || showTtd) ? <span className="gl-badge">aktif</span> : <span className="gl-badge">opsional</span>}
            >
              <div className="gl-label">Logo di kop peta</div>
              <div className="gl-row">
                {([
                  { label: 'Logo instansi', val: logoInstansi, set: setLogoInstansi },
                  { label: 'Logo mitra / kerja sama', val: logoMitra, set: setLogoMitra }
                ] as const).map((slot) => (
                  <div key={slot.label} className="gl-field">
                    <span className="gl-label">{slot.label}</span>
                    {slot.val ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: 8, border: '1px solid #cbd5e1', borderRadius: 10 }}>
                        <img src={slot.val} alt={slot.label} style={{ height: 52, maxWidth: '100%', objectFit: 'contain' }} />
                        <button type="button" className="gl-btn gl-btn--sm" onClick={() => slot.set('')}>
                          <Icon name="trash" size={14} /> Hapus
                        </button>
                      </div>
                    ) : (
                      <label className="gl-upload" style={{ minHeight: 72 }}>
                        <Icon name="upload" size={18} />
                        <span>Unggah</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file) return;
                            readIconFile(file, (url) => slot.set(url), 600);
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div className="gl-note">Satu logo tampil di tengah, di atas judul peta. Bila dua logo terisi, judul berada di antara kedua logo. Gunakan PNG transparan agar rapi.</div>

              <div className="gl-divider" />

              <Toggle label="Tampilkan kolom tanda tangan" checked={showTtd} onChange={setShowTtd} />
              {showTtd && (
                <>
                  <label className="gl-field">
                    <span className="gl-label">Tempat, tanggal (opsional)</span>
                    <input type="text" className="gl-input" placeholder="Contoh: Bengkulu, 14 Oktober 2026" value={ttdTempatTanggal} onChange={(e) => setTtdTempatTanggal(e.target.value)} />
                  </label>

                  {penandatangan.map((t, i) => (
                    <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, border: '1px solid #cbd5e1', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="gl-label">Penandatangan {i + 1}</span>
                        <button type="button" className="gl-btn gl-btn--sm" aria-label={`Hapus penandatangan ${i + 1}`} onClick={() => removeTtd(t.id)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                      <input type="text" className="gl-input" placeholder="Jabatan (mis. Kepala Desa)" value={t.jabatan} onChange={(e) => patchTtd(t.id, { jabatan: e.target.value })} />
                      <input type="text" className="gl-input" placeholder="Nama lengkap" value={t.nama} onChange={(e) => patchTtd(t.id, { nama: e.target.value })} />
                      <input type="text" className="gl-input" placeholder="NIP / NIM (opsional)" value={t.nip} onChange={(e) => patchTtd(t.id, { nip: e.target.value })} />
                    </div>
                  ))}

                  <button type="button" className="gl-btn gl-btn--sm" style={{ alignSelf: 'flex-start' }} onClick={addTtd}>
                    <Icon name="plus" size={14} /> Tambah penandatangan
                  </button>
                  {penandatangan.length > 4 && (
                    <div className="gl-note">Lebih dari 4 penandatangan membuat area legenda menyempit. Periksa pratinjau sebelum mengunduh.</div>
                  )}
                </>
              )}
            </Section>
            </>)}
          </div>

          <div className="gl-side__foot">
            <label className="gl-field" style={{ gridColumn: '1 / -1' }}>
              <span className="gl-label">Resolusi ekspor</span>
              <select className="gl-input" value={exportDpi} onChange={(e) => setExportDpi(Number(e.target.value))} disabled={!!exporting}>
                {EXPORT_DPI_OPTIONS.map((o) => (
                  <option key={o.dpi} value={o.dpi}>{o.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className="gl-btn gl-btn--primary" onClick={handleExportPNG} disabled={!!exporting || !wilayahSiap}>
              <Icon name="download" size={16} /> {exporting === 'png' ? 'Memproses...' : 'Unduh PNG'}
            </button>
            <button type="button" className="gl-btn gl-btn--dark" onClick={handleExportPDF} disabled={!!exporting || !wilayahSiap}>
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

          <div
            className="gl-paper"
            ref={paperRef}
          >
            {(loadingKab || auth.loading) && <SheetSkeleton w={SHEET_W * sheetScale} h={SHEET_H * sheetScale} />}
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
                    boxShadow: '0 18px 50px rgba(12,31,25,0.28)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 270px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    color: '#000000',
                    fontFamily: SHEET_FONT
                  }}
                >
                  {/* WATERMARK PRATINJAU: hanya di layar. Atribut data-export-hide membuatnya dilepas saat ekspor (kredit sudah dipotong). Admin tanpa watermark. */}
                  {auth.user && auth.user.role !== 'admin' && (
                    <div
                      data-export-hide="true"
                      aria-hidden="true"
                      style={{
                        position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none', userSelect: 'none',
                        backgroundImage: previewWatermarkBg(auth.user.email),
                        backgroundRepeat: 'repeat',
                      }}
                    />
                  )}

                  {/* KOLOM KIRI: JENDELA PETA */}
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '2.5px solid #000', boxSizing: 'border-box', padding: '8px', position: 'relative', backgroundColor: '#ffffff' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1.5px solid #000', boxSizing: 'border-box', position: 'relative' }}>

                      {showCoordinateGrid && (
                        <div style={{ height: '16px', borderBottom: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', fontSize: '8px', fontFamily: SHEET_MONO, fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#1e293b' }}>
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
                            <div style={{ position: 'absolute', top: '12px', left: '4px', zIndex: 10, fontSize: '8px', fontFamily: SHEET_MONO, fontWeight: 'bold', background: 'rgba(255,255,255,0.85)', padding: '1px 3px', border: '1px solid #000' }}>
                              {coordsDMS.north}
                            </div>
                            <div style={{ position: 'absolute', bottom: '28px', left: '4px', zIndex: 10, fontSize: '8px', fontFamily: SHEET_MONO, fontWeight: 'bold', background: 'rgba(255,255,255,0.85)', padding: '1px 3px', border: '1px solid #000' }}>
                              {coordsDMS.south}
                            </div>
                          </>
                        )}
                      </div>

                      {showCoordinateGrid && (
                        <div style={{ height: '16px', borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', fontSize: '8px', fontFamily: SHEET_MONO, fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#1e293b' }}>
                          <span>{coordsDMS.west}</span>
                          <span>Titik Pusat: {coordsDMS.centerLng}, {coordsDMS.centerLat}</span>
                          <span>{coordsDMS.east}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KOLOM KANAN: INFORMASI KARTOGRAFI */}
                  <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '7px', height: '100%', boxSizing: 'border-box', backgroundColor: '#ffffff', overflow: 'hidden', fontFamily: SHEET_FONT }}>

                    {(() => {
                      const dua = !!(logoInstansi && logoMitra);
                      const satu = logoInstansi || logoMitra;
                      const logoImg = (src: string, h: number) => (
                        <img src={src} alt="" style={{ height: `${h}px`, width: `${h}px`, objectFit: 'contain', display: 'block', flexShrink: 0 }} />
                      );
                      const teks = (
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: dua ? '9px' : '11px', fontWeight: 'bold', letterSpacing: dua ? '0.5px' : '1px', textTransform: 'uppercase', lineHeight: 1.2 }}>{judulUtama}</div>
                          <div style={{ fontSize: dua ? '12px' : '14px', fontWeight: 900, color: '#000', textTransform: 'uppercase', margin: '3px 0', borderBottom: '1.5px solid #000', paddingBottom: '3px', letterSpacing: '0.3px', lineHeight: 1.15 }}>
                            {namaWilayahJudul || selectedDesa || 'WILAYAH INDONESIA'}
                          </div>
                          <div style={{ fontSize: dua ? '7px' : '9px', color: '#333', textTransform: 'uppercase', lineHeight: 1.2 }}>{subJudul}</div>
                        </div>
                      );
                      return (
                        <div style={{ border: '1.5px solid #000', padding: '8px 6px', textAlign: 'center' }}>
                          {dua ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {logoImg(logoInstansi, 54)}
                              {teks}
                              {logoImg(logoMitra, 54)}
                            </div>
                          ) : (
                            <>
                              {satu && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{logoImg(satu, 70)}</div>}
                              {teks}
                            </>
                          )}
                        </div>
                      );
                    })()}

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
                          <text x="50" y="10" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#000" fontFamily="Arial, Helvetica, sans-serif">U</text>
                        </svg>
                      </Panel>

                      <Panel title="Skala Peta" bodyStyle={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: SHEET_MONO }}>1 : {mapScale.toLocaleString('id-ID')}</div>
                        <div style={{ width: '128px' }}>
                          <div style={{ display: 'flex', height: '5px', border: '1px solid #000' }}>
                            <div style={{ flex: 1, backgroundColor: '#000' }} />
                            <div style={{ flex: 1, backgroundColor: '#fff' }} />
                            <div style={{ flex: 1, backgroundColor: '#000' }} />
                            <div style={{ flex: 1, backgroundColor: '#fff' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', fontWeight: 'bold', marginTop: '2px', fontFamily: SHEET_SANS }}>
                            <span>0</span>
                            <span>{scaleBarMeters >= 1000 ? `${(scaleBarMeters / 2000).toFixed(1)} km` : `${scaleBarMeters / 2} m`}</span>
                            <span>{scaleBarMeters >= 1000 ? `${scaleBarMeters / 1000} km` : `${scaleBarMeters} m`}</span>
                            <span>{scaleBarMeters >= 1000 ? `${(scaleBarMeters * 2) / 1000} km` : `${scaleBarMeters * 2} m`}</span>
                          </div>
                        </div>
                      </Panel>
                    </div>

                    <Panel title="Legenda" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '9px', fontFamily: SHEET_SANS }}>
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
                        {showLegendBasemap && (
                          <div style={{ marginTop: '2px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0', fontSize: '8px', color: '#64748b' }}>
                            Peta Dasar: <b>{BASEMAP_TILES[basemapKey].name}</b>
                            <div style={{ fontSize: '7px', marginTop: '1px', lineHeight: 1.3 }}>{BASEMAP_TILES[basemapKey].attr}</div>
                          </div>
                        )}
                        {Object.values(geeActive).some(Boolean) && (
                          <div style={{ fontSize: '7px', color: '#64748b', lineHeight: 1.3 }}>Data: Google Earth Engine (SRTM, Sentinel-2, Open Buildings, HydroSHEDS, GRIP4)</div>
                        )}
                      </div>
                    </Panel>

                    <Panel title="Keterangan & Metadata">
                      <table style={{ width: '100%', fontSize: '8px', borderCollapse: 'collapse', lineHeight: 1.4, fontFamily: SHEET_SANS }}>
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
                            <td style={{ fontSize: '8px' }}>{sumberData}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div style={{ marginTop: '4px', paddingTop: '3px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: '8px', color: '#444', fontFamily: SHEET_SANS }}>
                        Disusun oleh <b>{pembuatPeta}</b> · {tahunPeta}
                      </div>
                    </Panel>

                    {/* PETA INSET: langsung peta tanpa judul, menunjukkan letak desa terhadap wilayah sekitar */}
                    <div style={{ border: '1.5px solid #000', backgroundColor: '#ffffff', flexShrink: 0, position: 'relative' }}>
                      <div data-inset-container="true" ref={insetContainer} style={{ position: 'relative', width: '100%', height: '150px' }} />
                    </div>

                    {/* TANDA TANGAN (opsional, jumlah bebas) */}
                    {showTtd && penandatangan.length > 0 && (
                      <div style={{ border: '1.5px solid #000', padding: '5px 6px 6px', flexShrink: 0, fontFamily: SHEET_SANS, fontSize: '8px', lineHeight: 1.3 }}>
                        {ttdTempatTanggal.trim() && <div style={{ textAlign: 'center', marginBottom: '3px' }}>{ttdTempatTanggal}</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: penandatangan.length === 1 ? '1fr' : '1fr 1fr', gap: '4px 8px' }}>
                          {penandatangan.map((t, i) => (
                            <div
                              key={t.id}
                              style={{ textAlign: 'center', gridColumn: penandatangan.length % 2 === 1 && i === penandatangan.length - 1 && penandatangan.length > 1 ? '1 / -1' : undefined }}
                            >
                              <div>{t.jabatan}</div>
                              <div style={{ height: '26px' }} />
                              <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{t.nama || '(.........................)'}</div>
                              {t.nip.trim() && <div style={{ fontSize: '7px' }}>{t.nip}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>
      {showAuth && (
        <AuthModal
          auth={auth}
          onClose={() => setShowAuth(false)}
          onSuccess={() => { setShowAuth(false); setActivePage('admin-map'); }}
        />
      )}
      {showAccount && auth.user && (
        <AccountModal auth={auth} onClose={() => setShowAccount(false)} />
      )}
    </div>
  );
}
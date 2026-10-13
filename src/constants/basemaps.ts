import { CARTO_KEY } from './config';
import type { BasemapDef } from '../types';

export const BASEMAP_GROUPS = ['Satelit', 'Terang', 'Gelap', 'Jalan & topografi'];

const CARTO_ATTR = '© OpenStreetMap contributors © CARTO';

export const BASEMAP_TILES: Record<string, BasemapDef> = {
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

export const isBasemapAvailable = (key: string) => !!BASEMAP_TILES[key] && (!BASEMAP_TILES[key].needsKey || !!CARTO_KEY);
export const AVAILABLE_KEYS = Object.keys(BASEMAP_TILES).filter(isBasemapAvailable);
const basemapUrl = (b: BasemapDef) => (b.needsKey === 'carto' ? `${b.url}?key=${encodeURIComponent(CARTO_KEY)}` : b.url);

// Pilihan peta dasar khusus inset. 'sync' = ikut peta utama. Bawaan: peta terang polos yang lazim dipakai peta letak.
export const INSET_SYNC = 'sync';
export const DEFAULT_INSET_BASEMAP = CARTO_KEY ? 'positron_nolabels' : 'esri_lightgray';
export const INSET_CHOICES: string[] = [
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

export const basemapThumb = (key: string) => (BASEMAP_TILES[key] || BASEMAP_TILES.citra).thumb;

export const rasterSource = (key: string) => {
  const b = BASEMAP_TILES[key] && isBasemapAvailable(key) ? BASEMAP_TILES[key] : BASEMAP_TILES.citra;
  return { type: 'raster' as const, tiles: [basemapUrl(b)], tileSize: 256, maxzoom: b.maxzoom ?? 19 };
};

export const BASE_SRC = 'raster-tiles';
export const BASE_LAYER = 'simple-tile-layer';

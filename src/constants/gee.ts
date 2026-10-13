import { type CSSProperties } from 'react';

export const GEE_LAYERS: { key: string; label: string }[] = [
  { key: 'elevation', label: 'Elevasi (SRTM)' },
  { key: 'ndwi', label: 'NDWI (indeks air)' },
  { key: 'ndvi', label: 'NDVI (vegetasi)' },
  { key: 'bangunan', label: 'Bangunan' },
  { key: 'sungai', label: 'Aliran air (garis)' },
  { key: 'jalan', label: 'Jalan (garis)' },
];

export const GEE_LEGEND: Record<string, { label: string; box: CSSProperties }> = {
  elevation: { label: 'Elevasi (SRTM)', box: { background: 'linear-gradient(90deg,#006633,#E5FFCC,#662A00,#F5F5F5)', border: '1px solid #475569' } },
  ndwi: { label: 'NDWI (indeks air)', box: { background: 'linear-gradient(90deg,#ffffff,#9ecae1,#3182bd,#08306b)', border: '1px solid #475569' } },
  ndvi: { label: 'NDVI (vegetasi)', box: { background: 'linear-gradient(90deg,#ffffff,#ffffb2,#a1d99b,#006d2c)', border: '1px solid #475569' } },
  bangunan: { label: 'Bangunan (Google Open Buildings)', box: { backgroundColor: 'rgba(234,88,12,0.6)', border: '1px solid #7c2d12' } },
  sungai: { label: 'Aliran air', box: { height: '0px', borderTop: '2px solid #2563eb' } },
  jalan: { label: 'Jalan', box: { height: '0px', borderTop: '2px solid #334155' } },
};

export const GEE_MASK_SRC = 'gee-mask-src';
export const GEE_MASK_LAYER = 'gee-mask-layer';
export const geeSrcId = (key: string) => `gee-src-${key}`;
export const geeLayerId = (key: string) => `gee-layer-${key}`;
// Layer peta yang harus tetap berada DI ATAS layer GEE
export const GEE_ABOVE = [GEE_MASK_LAYER, 'wilayah-fill', 'neighbor-desa-layer', 'selected-desa-layer'];

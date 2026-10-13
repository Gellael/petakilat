import * as maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { rasterSource, BASE_SRC, BASE_LAYER } from '../constants/basemaps';
import { GEE_LAYERS, GEE_MASK_SRC, GEE_MASK_LAYER, geeSrcId, geeLayerId, GEE_ABOVE } from '../constants/gee';

export const swapBasemap = (map: maplibregl.Map | null, key: string) => {
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

export const runWhenReady = (map: maplibregl.Map, fn: () => void) => {
  try {
    fn();
  } catch (_) {
    map.once('load', fn);
  }
};

export const removeGeeLayer = (map: maplibregl.Map | null, key: string) => {
  if (!map) return;
  try {
    if (map.getLayer(geeLayerId(key))) map.removeLayer(geeLayerId(key));
    if (map.getSource(geeSrcId(key))) map.removeSource(geeSrcId(key));
  } catch (_) {
    /* style peta belum siap */
  }
};

export const addGeeLayer = (map: maplibregl.Map, key: string, tileUrl: string, opacity: number) => {
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
export const updateGeeMask = (map: maplibregl.Map | null, feature: any, on: boolean) => {
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

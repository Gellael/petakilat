import type { AoiItem } from '../types';

// Simbol AOI di legenda: gambar buatan sendiri bila ada, jika tidak memakai ikon dan warna pin
export const LegendSymbol = ({ aoi, size = 16 }: { aoi: AoiItem; size?: number }) =>
  aoi.legendImageUrl ? (
    <img src={aoi.legendImageUrl} alt="" style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  ) : (
    <span style={{ width: size, height: size, borderRadius: '50%', background: aoi.color, border: '1.5px solid #000', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.55), lineHeight: 1 }}>
      {aoi.icon || '📍'}
    </span>
  );

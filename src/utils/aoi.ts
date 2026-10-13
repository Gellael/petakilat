import { escapeHtml } from './html';
import type { AoiItem } from '../types';

export const hasCallout = (a: AoiItem) => a.showCallout && !!(a.imageUrl || a.imageCaption);

export const buildPinHtml = (aoi: AoiItem) => `
  <div style="background:${aoi.color};color:#fff;font-size:18px;width:32px;height:32px;border:2.5px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">${aoi.icon || '📍'}</div>
  <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${aoi.color};margin-top:-1px;"></div>
`;

// Kartu foto: foto di atas, keterangan di kotak putih tepat di bawah foto.
// Bila keterangan kosong, kotak putih memakai nama titik AOI.
export const buildCalloutHtml = (a: AoiItem) => {
  const caption = (a.imageCaption || '').trim() || (a.title || '').trim();
  const radius = a.imageUrl ? '0 0 5px 5px' : '5px';
  return `
    ${a.imageUrl ? `<img src="${a.imageUrl}" alt="" style="display:block;width:100%;height:96px;object-fit:cover;border-radius:5px 5px 0 0;" />` : ''}
    <div style="background:#fff;color:#0f172a;padding:6px 8px;font-size:9.5px;line-height:1.4;font-weight:500;text-align:center;white-space:pre-wrap;word-break:break-word;border-radius:${radius};">${escapeHtml(caption)}</div>
  `;
};

export const CALLOUT_FRAME_CSS = (color: string) => `
  background:${color};
  padding:3px;
  border-radius:8px;
  box-shadow:0 6px 18px rgba(0,0,0,.28);
  width:168px;
  font-family:Inter,system-ui,sans-serif;
  cursor:grab;
  user-select:none;
`;

export const legendName = (a: AoiItem, i: number) => (a.legendLabel || '').trim() || (a.title || '').trim() || `Titik ${i + 1}`;

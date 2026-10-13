import { escXml } from './html';

// Pola watermark pratinjau: teks miring berulang (ubin SVG). Memuat email user agar screenshot bisa dilacak.
export const previewWatermarkBg = (email: string): string => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="150">` +
    `<g transform="rotate(-25 130 75)" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" fill="#000" fill-opacity="0.16">` +
    `<text x="130" y="68" font-size="15">PRATINJAU - BELUM DIEKSPOR</text>` +
    `<text x="130" y="90" font-size="11">${escXml(email.slice(0, 40))}</text>` +
    `</g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

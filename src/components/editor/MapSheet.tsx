import { BASEMAP_TILES } from '../../constants/basemaps';
import { SHEET_W, SHEET_H, SHEET_FONT, SHEET_SANS, SHEET_MONO } from '../../constants/sheet';
import { GEE_LAYERS, GEE_LEGEND } from '../../constants/gee';
import { legendName } from '../../utils/aoi';
import { previewWatermarkBg } from '../../utils/watermark';
import { LegendSymbol } from '../LegendSymbol';
import { Panel } from './Panel';
import type { Auth } from '../../types';
import type { MapEditor } from '../../hooks/useMapEditor';

export function MapSheet({ editor, auth }: { editor: MapEditor; auth: Auth }) {
  const {
    judulUtama, namaWilayahJudul, subJudul, sumberData, pembuatPeta, tahunPeta, basemapKey,
    geeActive, fillColor, strokeColor, showNeighbors, neighborStrokeColor, showCoordinateGrid,
    selectedKab, selectedDesa, selectedProps, mapScale, scaleBarMeters, coordsDMS, mapContainer,
    sheetRef, aoiList, isAddingAoi, setIsAddingAoi, showLegendBasemap, insetContainer, luasDesaKm2
  } = editor;
  return (
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

        <div style={{ border: '1.5px solid #000', padding: '8px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>{judulUtama}</div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#000', textTransform: 'uppercase', margin: '3px 0', borderBottom: '1.5px solid #000', paddingBottom: '3px', letterSpacing: '0.5px' }}>
            {namaWilayahJudul || selectedDesa || 'WILAYAH INDONESIA'}
          </div>
          <div style={{ fontSize: '9px', color: '#333', textTransform: 'uppercase', lineHeight: 1.2 }}>{subJudul}</div>
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

      </div>
    </div>
  );
}

import { GEE_LAYERS } from '../../../constants/gee';
import { Section } from '../../ui/Section';
import { Toggle } from '../../ui/Toggle';
import { RangeField } from '../../ui/RangeField';
import type { MapEditor } from '../../../hooks/useMapEditor';

export function GeeSection({ editor }: { editor: MapEditor }) {
  const {
    openSec, geeActive, geeLoading, geeOpacity, setGeeOpacity, geeMask, setGeeMask, geeMsg, geeErr,
    toggleGeeLayer, selectedDesa, toggleSec, wilayahSiap
  } = editor;
  return (
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
  );
}

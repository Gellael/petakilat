import { Section } from '../../ui/Section';
import { Toggle } from '../../ui/Toggle';
import type { MapEditor } from '../../../hooks/useMapEditor';

export function IdentitySection({ editor }: { editor: MapEditor }) {
  const {
    openSec, judulUtama, setJudulUtama, namaWilayahJudul, setNamaWilayahJudul, subJudul,
    setSubJudul, sumberData, setSumberData, pembuatPeta, setPembuatPeta, tahunPeta, setTahunPeta,
    showLegendBasemap, setShowLegendBasemap, toggleSec, wilayahSiap
  } = editor;
  return (
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
  );
}

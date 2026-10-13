import { Icon } from '../../ui/Icon';
import { Section } from '../../ui/Section';
import { SearchSelect } from '../../ui/SearchSelect';
import type { MapEditor } from '../../../hooks/useMapEditor';

export function LocationSection({ editor }: { editor: MapEditor }) {
  const {
    openSec, apiError, loadingKab, listProvinsi, selectedProv, listKabupaten, selectedKab,
    listDesa, selectedDesa, toggleSec, loadProvinsi, cekKreditProvinsi, handleSelectProvinsi,
    handleSelectKabupaten, handleSelectDesa
  } = editor;
  return (
    <Section step={1} title="Lokasi wilayah" open={!!openSec.lokasi} onToggle={() => toggleSec('lokasi')}>
      {apiError && (
        <div className="gl-note gl-note--err">
          <span>{apiError}</span>
          <button type="button" className="gl-btn gl-btn--sm" onClick={loadProvinsi}>
            <Icon name="rotate" size={14} /> Coba lagi
          </button>
        </div>
      )}
      <SearchSelect label="Provinsi" value={selectedProv} options={listProvinsi} placeholder="Pilih provinsi" onChange={handleSelectProvinsi} onBeforeOpen={cekKreditProvinsi} />
      <SearchSelect label="Kabupaten / kota" value={selectedKab} options={listKabupaten} disabled={!selectedProv} placeholder={selectedProv ? 'Pilih kabupaten / kota' : 'Pilih provinsi dahulu'} onChange={handleSelectKabupaten} />
      <SearchSelect label="Desa / kelurahan" value={selectedDesa} options={listDesa} disabled={!selectedKab || loadingKab} placeholder={loadingKab ? 'Memuat data desa...' : selectedKab ? 'Pilih desa / kelurahan' : 'Pilih kabupaten dahulu'} onChange={handleSelectDesa} />
    </Section>
  );
}

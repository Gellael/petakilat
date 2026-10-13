import { Icon } from '../../ui/Icon';
import { Section } from '../../ui/Section';
import { AoiEditorCard } from './AoiEditorCard';
import type { MapEditor } from '../../../hooks/useMapEditor';

export function AoiSection({ editor }: { editor: MapEditor }) {
  const {
    openSec, aoiList, setAoiList, isAddingAoi, selectedAoiId, setSelectedAoiId, toggleSec,
    wilayahSiap, patchAoi, toggleAddAoi
  } = editor;
  return (
    <Section step={5} locked={!wilayahSiap} title="Titik AOI dan foto" open={!!openSec.aoi} onToggle={() => toggleSec('aoi')} badge={<span className="gl-badge">{aoiList.length} titik</span>}>
      <button type="button" className={`gl-btn gl-btn--block ${isAddingAoi ? 'gl-btn--danger' : 'gl-btn--primary'}`} onClick={toggleAddAoi}>
        {isAddingAoi ? <><Icon name="x" size={16} /> Batalkan tambah titik</> : <><Icon name="plus" size={16} /> Tambah titik AOI</>}
      </button>

      {isAddingAoi && <div className="gl-note gl-note--warn">Mode tambah aktif. Klik lokasi mana saja di peta untuk menaruh titik.</div>}

      {aoiList.length === 0 && !isAddingAoi && (
        <div className="gl-note">Belum ada titik. Tekan tombol di atas, lalu klik peta untuk menaruh titik dan menambahkan foto.</div>
      )}

      <div className="gl-aoi-list">
        {aoiList.map((aoi, index) => (
          <AoiEditorCard
            key={aoi.id}
            aoi={aoi}
            index={index}
            isOpen={selectedAoiId === aoi.id}
            onToggle={() => setSelectedAoiId(selectedAoiId === aoi.id ? null : aoi.id)}
            onRemove={() => {
              setAoiList((prev) => prev.filter((it) => it.id !== aoi.id));
              if (selectedAoiId === aoi.id) setSelectedAoiId(null);
            }}
            patchAoi={patchAoi}
          />
        ))}
      </div>
    </Section>
  );
}

import { CARTO_KEY } from '../../../constants/config';
import { BASEMAP_GROUPS, BASEMAP_TILES, isBasemapAvailable, AVAILABLE_KEYS, INSET_SYNC, INSET_CHOICES, basemapThumb } from '../../../constants/basemaps';
import { Section } from '../../ui/Section';
import type { MapEditor } from '../../../hooks/useMapEditor';

export function BasemapSection({ editor }: { editor: MapEditor }) {
  const {
    openSec, basemapKey, insetBasemapKey, setInsetBasemapKey, toggleSec, wilayahSiap,
    handleBasemapChange
  } = editor;
  return (
    <Section step={2} locked={!wilayahSiap} title="Peta dasar" open={!!openSec.dasar} onToggle={() => toggleSec('dasar')}>
      {BASEMAP_GROUPS.filter((g) => AVAILABLE_KEYS.some((k) => BASEMAP_TILES[k].group === g)).map((g) => (
        <div className="gl-bmgroup" key={g}>
          <div className="gl-subhead">{g}</div>
          <div className="gl-basemaps">
            {Object.entries(BASEMAP_TILES).filter(([key, item]) => item.group === g && isBasemapAvailable(key)).map(([key, item]) => (
              <button type="button" key={key} className={`gl-basemap ${basemapKey === key ? 'is-on' : ''}`} onClick={() => handleBasemapChange(key)} aria-pressed={basemapKey === key}>
                <span className="gl-basemap__thumb" style={{ background: item.thumb }} />
                <span className="gl-basemap__name">{item.name}</span>
                <span className="gl-basemap__desc">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {!CARTO_KEY && (
        <div className="gl-note">Peta Carto (Positron, Voyager, Dark Matter) disembunyikan karena sekarang butuh API key. Key-nya gratis. Isi <code>VITE_CARTO_KEY=key_anda</code> di file <code>.env</code> frontend, lalu jalankan ulang <code>npm run dev</code> atau build ulang.</div>
      )}

      <div className="gl-divider" />

      <div className="gl-bmgroup">
        <div className="gl-subhead">Peta dasar inset</div>
        <div className="gl-chips" role="group" aria-label="Peta dasar inset">
          {INSET_CHOICES.map((key) => {
            const isSync = key === INSET_SYNC;
            const label = isSync ? 'Ikuti peta utama' : BASEMAP_TILES[key].name;
            const thumb = isSync ? basemapThumb(basemapKey) : BASEMAP_TILES[key].thumb;
            return (
              <button type="button" key={key} className={`gl-chip ${insetBasemapKey === key ? 'is-on' : ''}`} onClick={() => setInsetBasemapKey(key)} aria-pressed={insetBasemapKey === key}>
                <span className="gl-chip__dot" style={{ background: thumb }} />
                {label}
              </button>
            );
          })}
        </div>
        <div className="gl-note">Peta inset di lembar peta bebas dipilih terpisah dari peta utama. Bawaannya peta terang tanpa label, seperti peta letak pada umumnya.</div>
      </div>
    </Section>
  );
}

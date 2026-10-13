import { AOI_ICONS } from '../../../constants/aoi';
import { Icon } from '../../ui/Icon';
import { Toggle } from '../../ui/Toggle';
import { ColorField } from '../../ui/ColorField';
import { LegendSymbol } from '../../LegendSymbol';
import type { AoiItem } from '../../../types';

interface AoiEditorCardProps {
  aoi: AoiItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  patchAoi: (id: string, patch: Partial<AoiItem>) => void;
}

export function AoiEditorCard({ aoi, index, isOpen, onToggle, onRemove, patchAoi }: AoiEditorCardProps) {
  const cap = (aoi.imageCaption || '').trim() || aoi.title;
  return (
    <div className={`gl-aoi ${isOpen ? 'is-open' : ''}`}>
      <div className="gl-aoi__head">
        <button type="button" className="gl-aoi__toggle" onClick={onToggle} aria-expanded={isOpen}>
          <span className="gl-aoi__chip" style={{ background: aoi.color }}>{aoi.icon || '📍'}</span>
          <span className="gl-aoi__name">{aoi.title || `Titik ${index + 1}`}</span>
          {aoi.imageUrl && <span className="gl-badge">Foto</span>}
        </button>
        <button type="button" className="gl-iconbtn gl-iconbtn--danger" aria-label={`Hapus ${aoi.title || 'titik'}`} title="Hapus titik" onClick={onRemove}>
          <Icon name="trash" size={16} />
        </button>
      </div>

      {isOpen && (
        <div className="gl-aoi__body">
          <label className="gl-field">
            <span className="gl-label">Nama titik</span>
            <input type="text" className="gl-input" value={aoi.title} onChange={(e) => patchAoi(aoi.id, { title: e.target.value })} />
          </label>

          <div className="gl-field">
            <span className="gl-label">Ikon</span>
            <div className="gl-icons">
              {AOI_ICONS.map((ic) => (
                <button
                  key={ic.emoji}
                  type="button"
                  title={ic.label}
                  aria-label={ic.label}
                  aria-pressed={aoi.icon === ic.emoji}
                  className={aoi.icon === ic.emoji ? 'is-on' : ''}
                  style={aoi.icon === ic.emoji ? { borderColor: aoi.color, background: `${aoi.color}18` } : undefined}
                  onClick={() => patchAoi(aoi.id, { icon: ic.emoji })}
                >
                  {ic.emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="gl-row">
            <ColorField label="Warna" value={aoi.color} onChange={(c) => patchAoi(aoi.id, { color: c })} />
            <div className="gl-field">
              <span className="gl-label">Koordinat</span>
              <div className="gl-coords">{aoi.lng.toFixed(5)}, {aoi.lat.toFixed(5)}</div>
            </div>
          </div>

          <div className="gl-divider" />

          <div className="gl-subhead">Legenda</div>
          <Toggle label="Tampilkan titik ini di legenda" checked={aoi.showInLegend} onChange={(v) => patchAoi(aoi.id, { showInLegend: v })} />
          {aoi.showInLegend && (
            <>
              <label className="gl-field">
                <span className="gl-label">Nama di legenda</span>
                <input type="text" className="gl-input" placeholder={aoi.title || 'Nama titik'} value={aoi.legendLabel} onChange={(e) => patchAoi(aoi.id, { legendLabel: e.target.value })} />
              </label>
              <div className="gl-field">
                <span className="gl-label">Gambar simbol legenda</span>
                <div className="gl-legrow">
                  <span className="gl-legrow__sym"><LegendSymbol aoi={aoi} size={22} /></span>
                  <label className="gl-btn gl-legrow__up">
                    <Icon name="upload" size={14} /> {aoi.legendImageUrl ? 'Ganti gambar' : 'Unggah gambar'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => patchAoi(aoi.id, { legendImageUrl: ev.target?.result as string });
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {aoi.legendImageUrl && (
                    <button type="button" className="gl-iconbtn gl-iconbtn--danger" aria-label="Hapus gambar legenda" title="Hapus gambar legenda" onClick={() => patchAoi(aoi.id, { legendImageUrl: '' })}>
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="gl-note">Tanpa gambar, legenda memakai ikon dan warna titik ini. Tanpa nama khusus, legenda memakai nama titik.</div>
            </>
          )}

          <div className="gl-divider" />

          {!aoi.imageUrl && (
            <label className="gl-upload">
              <Icon name="upload" size={20} />
              <span>Unggah foto lapangan</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => patchAoi(aoi.id, { imageUrl: ev.target?.result as string, showCallout: true });
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}

          <label className="gl-field">
            <span className="gl-label">Keterangan foto</span>
            <textarea
              className="gl-textarea"
              rows={2}
              placeholder="Contoh: Pantai Panjang saat matahari terbenam"
              value={aoi.imageCaption}
              onChange={(e) => patchAoi(aoi.id, { imageCaption: e.target.value, showCallout: true })}
            />
          </label>

          {(aoi.imageUrl || aoi.imageCaption) && (
            <div className="gl-field">
              <span className="gl-label">Pratinjau kartu di peta</span>
              <div className="gl-cardprev" style={{ background: aoi.color }}>
                {aoi.imageUrl && <img src={aoi.imageUrl} alt="Pratinjau foto" />}
                {aoi.imageUrl && (
                  <button type="button" className="gl-cardprev__x" aria-label="Hapus foto" title="Hapus foto" onClick={() => patchAoi(aoi.id, { imageUrl: '' })}>
                    <Icon name="x" size={14} />
                  </button>
                )}
                <div className={`gl-cardprev__cap ${aoi.imageUrl ? '' : 'gl-cardprev__cap--solo'}`}>{cap}</div>
              </div>
            </div>
          )}

          <Toggle label="Tampilkan foto dan garis penunjuk" checked={aoi.showCallout} onChange={(v) => patchAoi(aoi.id, { showCallout: v })} />
          <div className="gl-note">Keterangan tampil di kotak putih di bawah foto. Kosongkan untuk memakai nama titik. Geser pin atau kartu foto di peta untuk mengatur garis penunjuk.</div>
        </div>
      )}
    </div>
  );
}

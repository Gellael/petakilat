import { Icon } from '../../ui/Icon';
import { Section } from '../../ui/Section';
import { Toggle } from '../../ui/Toggle';
import { ColorField } from '../../ui/ColorField';
import { RangeField } from '../../ui/RangeField';
import type { MapEditor } from '../../../hooks/useMapEditor';

export function SymbologySection({ editor }: { editor: MapEditor }) {
  const {
    openSec, fillColor, setFillColor, opacityVal, setOpacityVal, strokeColor, setStrokeColor,
    strokeWidth, setStrokeWidth, showNeighbors, setShowNeighbors, neighborStrokeColor,
    setNeighborStrokeColor, showLabels, setShowLabels, showCoordinateGrid, setShowCoordinateGrid,
    selectedDesa, toggleSec, wilayahSiap, resetLabelPosition
  } = editor;
  return (
    <Section step={3} locked={!wilayahSiap} title="Simbologi batas wilayah" open={!!openSec.simbol} onToggle={() => toggleSec('simbol')}>
      <div className="gl-row">
        <ColorField label="Warna isi" value={fillColor} onChange={setFillColor} />
        <RangeField label="Opasitas isi" value={opacityVal} min={0.1} max={1} step={0.05} display={`${Math.round(opacityVal * 100)}%`} onChange={setOpacityVal} />
      </div>
      <div className="gl-row">
        <ColorField label="Garis batas desa" value={strokeColor} onChange={setStrokeColor} />
        <RangeField label="Tebal garis" value={strokeWidth} min={1} max={8} step={0.5} display={`${strokeWidth} px`} onChange={setStrokeWidth} />
      </div>
      <div className="gl-divider" />
      <ColorField label="Warna garis batas sekitar" value={neighborStrokeColor} onChange={setNeighborStrokeColor} />
      <Toggle label="Tampilkan batas desa sekitar" checked={showNeighbors} onChange={setShowNeighbors} />
      <Toggle label="Tampilkan label nama desa" checked={showLabels} onChange={setShowLabels} />
      {selectedDesa && showLabels && (
        <button type="button" className="gl-btn gl-btn--sm" style={{ alignSelf: 'flex-start' }} onClick={resetLabelPosition}>
          <Icon name="rotate" size={14} /> Kembalikan posisi label
        </button>
      )}
      <Toggle label="Tampilkan grid dan koordinat" checked={showCoordinateGrid} onChange={setShowCoordinateGrid} />
    </Section>
  );
}

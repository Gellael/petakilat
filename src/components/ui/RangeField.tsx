export const RangeField = ({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void;
}) => (
  <label className="gl-field">
    <span className="gl-label gl-label--row"><span>{label}</span><b>{display}</b></span>
    <input type="range" className="gl-range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);

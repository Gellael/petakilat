export const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="gl-field">
    <span className="gl-label">{label}</span>
    <span className="gl-color">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="gl-color__sw" style={{ background: value }} />
      <code>{value.toUpperCase()}</code>
    </span>
  </label>
);

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export function SearchSelect({ label, value, options, placeholder, disabled, onChange, onBeforeOpen }: {
  label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; onChange: (v: string) => void;
  /** Dipanggil saat user mengklik untuk membuka daftar. Kembalikan false untuk membatalkan pembukaan. */
  onBeforeOpen?: () => boolean | Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  const shown = filtered.slice(0, 200);
  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); };
  const toggle = async () => {
    if (!open && onBeforeOpen && !(await onBeforeOpen())) return;
    setOpen((o) => !o);
  };

  return (
    <div className="gl-field" ref={ref}>
      <span className="gl-label">{label}</span>
      <button type="button" className={`gl-select ${open ? 'is-open' : ''}`} disabled={disabled} onClick={toggle} aria-haspopup="listbox" aria-expanded={open}>
        <span className={value ? 'gl-select__val' : 'gl-select__ph'}>{value || placeholder}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div className="gl-pop" role="listbox">
          <div className="gl-pop__search">
            <Icon name="search" size={14} />
            <input autoFocus placeholder="Ketik untuk mencari" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="gl-pop__list">
            {value && <button type="button" className="gl-pop__item gl-pop__item--clear" onClick={() => pick('')}>Kosongkan pilihan</button>}
            {shown.length === 0 && <div className="gl-pop__empty">Tidak ada hasil</div>}
            {shown.map((o) => (
              <button type="button" role="option" aria-selected={o === value} key={o} className={`gl-pop__item ${o === value ? 'is-on' : ''}`} onClick={() => pick(o)}>{o}</button>
            ))}
            {filtered.length > shown.length && <div className="gl-pop__empty">Menampilkan 200 dari {filtered.length}. Persempit pencarian.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

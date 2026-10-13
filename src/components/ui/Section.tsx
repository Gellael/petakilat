import { type ReactNode } from 'react';
import { Icon } from './Icon';

export const Section = ({ step, title, badge, open, onToggle, children, locked }: {
  step: number; title: string; badge?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode;
  /** Terkunci: tidak bisa dibuka sebelum wilayah (kabupaten/kota) dipilih. */
  locked?: boolean;
}) => {
  const isOpen = open && !locked;
  return (
    <section className={`gl-sec ${isOpen ? 'is-open' : ''}`} aria-disabled={locked || undefined}>
      <button
        type="button"
        className="gl-sec__head"
        onClick={() => { if (!locked) onToggle(); }}
        aria-expanded={isOpen}
        disabled={locked}
        title={locked ? 'Pilih provinsi dan kabupaten/kota terlebih dahulu' : undefined}
        style={locked ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
      >
        <span className="gl-sec__step">{step}</span>
        <span className="gl-sec__title">{title}</span>
        {locked ? <span style={{ fontSize: 11, fontWeight: 600 }}>Pilih wilayah dahulu</span> : badge}
        <span className="gl-sec__chev"><Icon name="chevron" size={16} /></span>
      </button>
      {isOpen && <div className="gl-sec__body">{children}</div>}
    </section>
  );
};

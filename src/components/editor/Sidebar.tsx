import { Icon } from '../ui/Icon';
import { LocationSection } from './sections/LocationSection';
import { BasemapSection } from './sections/BasemapSection';
import { SymbologySection } from './sections/SymbologySection';
import { GeeSection } from './sections/GeeSection';
import { AoiSection } from './sections/AoiSection';
import { IdentitySection } from './sections/IdentitySection';
import type { Auth } from '../../types';
import type { MapEditor } from '../../hooks/useMapEditor';

export function Sidebar({ editor, auth, onBackHome, onOpenAccount }: { editor: MapEditor; auth: Auth; onBackHome: () => void; onOpenAccount: () => void }) {
  const {
    sidebarOpen, setSidebarOpen, exporting, wilayahSiap, handleExportPNG, handleExportPDF
  } = editor;
  return (
    <>
      {sidebarOpen && <div className="gl-backdrop" onClick={() => setSidebarOpen(false)} />}

      <aside className={`gl-side ${sidebarOpen ? 'is-open' : ''}`} aria-label="Panel pengaturan peta">
        <div className="gl-side__head">
          <button type="button" className="gl-iconbtn" onClick={onBackHome} aria-label="Kembali ke beranda" title="Kembali ke beranda">
            <Icon name="arrow-left" size={18} />
          </button>
          <div className="gl-side__titles">
            <div className="gl-side__title">Pembuat peta administrasi</div>
            <div className="gl-side__sub">Hasil tampil langsung di lembar peta</div>
          </div>
          <button type="button" className="gl-btn gl-btn--sm" onClick={onOpenAccount}>
            {auth.user?.role === 'admin' ? '∞' : auth.user?.kredit ?? 0} kredit
          </button>
          <button type="button" className="gl-iconbtn gl-side__close" onClick={() => setSidebarOpen(false)} aria-label="Tutup panel">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="gl-side__body">
          <LocationSection editor={editor} />
          <BasemapSection editor={editor} />
          <SymbologySection editor={editor} />
          <GeeSection editor={editor} />
          <AoiSection editor={editor} />
          <IdentitySection editor={editor} />
        </div>

        <div className="gl-side__foot">
          <button type="button" className="gl-btn gl-btn--primary" onClick={handleExportPNG} disabled={!!exporting || !wilayahSiap}>
            <Icon name="download" size={16} /> {exporting === 'png' ? 'Memproses...' : 'Unduh PNG'}
          </button>
          <button type="button" className="gl-btn gl-btn--dark" onClick={handleExportPDF} disabled={!!exporting || !wilayahSiap}>
            <Icon name="printer" size={16} /> {exporting === 'pdf' ? 'Memproses...' : 'Ekspor PDF A4'}
          </button>
        </div>
      </aside>
    </>
  );
}

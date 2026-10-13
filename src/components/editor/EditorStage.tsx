import { SHEET_W, SHEET_H } from '../../constants/sheet';
import { Icon } from '../ui/Icon';
import { MapSheet } from './MapSheet';
import type { Auth } from '../../types';
import type { MapEditor } from '../../hooks/useMapEditor';

export function EditorStage({ editor, auth }: { editor: MapEditor; auth: Auth }) {
  const {
    setSidebarOpen, sheetScale, zoom, mapScale, scalerRef, paperRef, regionTitle, regionSub
  } = editor;
  return (
    <main className="gl-stage">
      <div className="gl-toolbar">
        <button type="button" className="gl-btn gl-btn--sm gl-menu-btn" onClick={() => setSidebarOpen(true)}>
          <Icon name="sliders" size={14} /> Pengaturan
        </button>
        <div className="gl-toolbar__text">
          <div className="gl-toolbar__title">{regionTitle}</div>
          <div className="gl-toolbar__sub">{regionSub}</div>
        </div>
        <div className="gl-toolbar__chips">
          <span className="gl-chip">Zoom {zoom}</span>
          <span className="gl-chip">1 : {mapScale.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div className="gl-paper" ref={paperRef}>
        <div style={{ width: SHEET_W * sheetScale, height: SHEET_H * sheetScale }}>
          <div ref={scalerRef} style={{ width: SHEET_W, height: SHEET_H, transform: `scale(${sheetScale})`, transformOrigin: 'top left' }}>
            <MapSheet editor={editor} auth={auth} />
          </div>
        </div>
      </div>
    </main>
  );
}

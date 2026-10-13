import { EditorStage } from '../components/editor/EditorStage';
import { Sidebar } from '../components/editor/Sidebar';
import type { Auth } from '../types';
import type { MapEditor } from '../hooks/useMapEditor';

interface EditorPageProps {
  /** Tetap ter-mount saat di beranda supaya peta tidak dibuat ulang; hanya disembunyikan. */
  visible: boolean;
  editor: MapEditor;
  auth: Auth;
  onBackHome: () => void;
  onOpenAccount: () => void;
}

export function EditorPage({ visible, editor, auth, onBackHome, onOpenAccount }: EditorPageProps) {
  return (
    <div className="gl-app" style={{ display: visible ? 'flex' : 'none' }}>
      <Sidebar editor={editor} auth={auth} onBackHome={onBackHome} onOpenAccount={onOpenAccount} />
      <EditorStage editor={editor} auth={auth} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAuth, AuthModal, AccountModal } from './auth';
import { APP_CSS } from './styles/appCss';
import { useMapEditor } from './hooks/useMapEditor';
import { HomePage } from './pages/HomePage';
import { EditorPage } from './pages/EditorPage';

// Tetap diekspor dari sini supaya import lama `from './App'` tidak putus.
export type { AoiItem } from './types';

type Page = 'home' | 'admin-map';

const pageFromHash = (): Page => (window.location.hash === '#/peta' ? 'admin-map' : 'home');

export default function App() {
  // Halaman aktif disimpan di URL (#/peta) supaya refresh tetap di halaman yang sama
  const [activePage, setActivePage] = useState<Page>(pageFromHash);
  useEffect(() => {
    const want = activePage === 'admin-map' ? '#/peta' : '';
    if (window.location.hash !== want) {
      window.history.pushState(null, '', window.location.pathname + window.location.search + want);
    }
  }, [activePage]);
  useEffect(() => {
    const onPop = () => setActivePage(pageFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const auth = useAuth();
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [showAccount, setShowAccount] = useState<boolean>(false);

  // Kalau belum login tapi membuka #/peta langsung, kembalikan ke beranda + tampilkan form login
  useEffect(() => {
    if (!auth.loading && !auth.user && activePage === 'admin-map') {
      setActivePage('home');
      setShowAuth(true);
    }
  }, [auth.loading, auth.user, activePage]);

  const editor = useMapEditor({ activePage, auth, setShowAccount });

  const openApp = () => {
    if (!auth.user) {
      setShowAuth(true);
      return;
    }
    setActivePage('admin-map');
  };

  return (
    <div className="gl-root">
      <style>{APP_CSS}</style>

      {activePage === 'home' && (
        <HomePage
          auth={auth}
          onOpenApp={openApp}
          onOpenAuth={() => setShowAuth(true)}
          onOpenAccount={() => setShowAccount(true)}
        />
      )}

      <EditorPage
        visible={activePage === 'admin-map'}
        editor={editor}
        auth={auth}
        onBackHome={() => setActivePage('home')}
        onOpenAccount={() => setShowAccount(true)}
      />

      {showAuth && (
        <AuthModal
          auth={auth}
          onClose={() => setShowAuth(false)}
          onSuccess={() => { setShowAuth(false); setActivePage('admin-map'); }}
        />
      )}
      {showAccount && auth.user && <AccountModal auth={auth} onClose={() => setShowAccount(false)} />}
    </div>
  );
}

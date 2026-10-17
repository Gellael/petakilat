import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** false bila env Firebase belum diisi: tombol Google otomatis disembunyikan. */
export const firebaseReady = !!(cfg.apiKey && cfg.projectId && cfg.authDomain);
const app = firebaseReady ? initializeApp(cfg) : null;

/** Buka popup Google, kembalikan ID token Firebase. Mengembalikan '' bila popup ditutup user. */
export async function googleIdToken(): Promise<string> {
  if (!app) throw new Error('Login Google belum dikonfigurasi.');
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    const token = await cred.user.getIdToken();
    // Sesi Anda dikelola JWT backend sendiri, jadi sesi Firebase di browser tidak perlu dipertahankan.
    await signOut(auth).catch(() => {});
    return token;
  } catch (e: any) {
    const code: string = e?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
    if (code === 'auth/popup-blocked') throw new Error('Popup diblokir browser. Izinkan popup lalu coba lagi.');
    if (code === 'auth/unauthorized-domain') throw new Error('Domain ini belum diizinkan di Firebase (Authorized domains).');
    throw new Error('Gagal masuk dengan Google. Coba lagi.');
  }
}
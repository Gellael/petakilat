import { useCallback, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { firebaseReady, googleIdToken } from './firebase';

const API: string = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'gl_token';

// ====== ISI SESUAI KEBUTUHAN ANDA ======
/** Nomor WhatsApp admin (format internasional tanpa +). Kredit dibeli lewat chat ke nomor ini. */
export const ADMIN_WA = '6283176819738';

/** Harga satuan: 1 kredit = Rp20.000. */
export const HARGA_PER_KREDIT = 20000;

export interface PaketKredit {
  id: string;
  kredit: number;
  harga: number;
  nama: string;
  /** Teks pendek di kartu, mis. "Paling hemat". */
  badge?: string;
}

/** Daftar paket top-up. id dipakai juga oleh App.tsx untuk memilih paket dari halaman harga. */
export const PAKET_KREDIT: PaketKredit[] = [
  { id: 'satuan', kredit: 1, harga: 20000, nama: 'Satuan' },
  { id: 'hemat', kredit: 3, harga: 50000, nama: 'Paket Hemat', badge: 'Populer' },
  { id: 'plus', kredit: 5, harga: 80000, nama: 'Paket Plus' },
  { id: 'pro', kredit: 7, harga: 100000, nama: 'Paket Pro', badge: 'Paling hemat' },
];

/** Selisih dibanding membeli satuan (mis. 3 x Rp20.000 - Rp50.000 = Rp10.000). */
export const hemat = (p: PaketKredit) => p.kredit * HARGA_PER_KREDIT - p.harga;

export interface AuthUser {
  id: number;
  email: string;
  nama: string;
  role: string;
  kredit: number;
}

// ===================== HELPER API =====================
const getToken = (): string => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
const setToken = (t: string) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ }
};

/** fetch ke backend dengan header Authorization otomatis. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const t = getToken();
  if (t) headers.set('Authorization', `Bearer ${t}`);
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 401) {
    setToken('');
    window.dispatchEvent(new Event('gl-logout'));
  }
  return res;
}

async function postJson(path: string, body: unknown): Promise<any> {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Permintaan gagal.');
  return data;
}

// ===================== HOOK =====================
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());

  const refreshUser = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try {
      const res = await apiFetch('/api/me');
      if (res.ok) setUser(await res.json());
      else if (res.status === 401) setUser(null);
    } catch { /* server tidak terjangkau: pertahankan status */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refreshUser();
    const onOut = () => setUser(null);
    window.addEventListener('gl-logout', onOut);
    return () => window.removeEventListener('gl-logout', onOut);
  }, [refreshUser]);

  /** Mengembalikan alamat email jika akun masih perlu verifikasi, atau null jika sudah masuk. */
  const authenticate = async (path: string, body: unknown): Promise<string | null> => {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403 && data.code === 'email_not_verified') return data.email as string;
    if (!res.ok) throw new Error(data.error || 'Permintaan gagal.');
    if (data.needs_verification) return data.email as string;
    setToken(data.token);
    setUser(data.user);
    return null;
  };

  return {
    user,
    loading,
    refreshUser,
    login: (email: string, password: string) => authenticate('/api/auth/login', { email, password }),
    loginGoogle: (idToken: string) => authenticate('/api/auth/google', { id_token: idToken }),
    register: (nama: string, email: string, password: string) =>
      authenticate('/api/auth/register', { nama, email, password }),
    verifyEmail: (email: string, code: string) => authenticate('/api/auth/verify', { email, code }),
    resendCode: (email: string) => postJson('/api/auth/resend', { email }),
    /** Minta kode reset kata sandi. Server selalu menjawab sukses (tidak membocorkan email terdaftar atau tidak). */
    forgotPassword: (email: string) => postJson('/api/auth/forgot', { email }),
    /** Atur kata sandi baru dengan kode dari email. Jika berhasil, user langsung masuk. */
    resetPassword: (email: string, code: string, password: string) =>
      authenticate('/api/auth/reset', { email, code, password }),
    logout: () => { setToken(''); setUser(null); },
  };
}
export type Auth = ReturnType<typeof useAuth>;

// ===================== UI =====================
export const rupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');

/** Link WhatsApp ke admin dengan pesan pesanan yang sudah terisi (paket, nama, dan email akun). */
export const linkWaPaket = (p: PaketKredit, u: { nama: string; email: string }): string => {
  const teks =
    `Halo admin Petakilat, saya ingin membeli ${p.kredit} kredit (${p.nama}) seharga ${rupiah(p.harga)}.\n\n` +
    `Nama: ${u.nama}\nEmail akun: ${u.email}`;
  return `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(teks)}`;
};

/** Ikon petir kuning khas Petakilat. */
const Bolt = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#2fb583" stroke="#0b7a56" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// ===================== SKELETON LOADING =====================
const SKEL_CSS = `
.ak-skel{display:inline-block;position:relative;overflow:hidden;vertical-align:middle;border-radius:8px;background:#dce8e1}
.ak-skel::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);animation:ak-skel 1.4s ease-in-out infinite}
.ak-skel--dark{background:rgba(255,255,255,.18)}
.ak-skel--dark::after{background:linear-gradient(90deg,transparent,rgba(255,255,255,.34),transparent)}
@keyframes ak-skel{to{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.ak-skel::after{animation:none}}
`;
/** Blok abu berkilau sebagai pengganti teks atau angka yang sedang dimuat. */
const Skel = ({ w, h, dark, style }: { w?: number | string; h?: number | string; dark?: boolean; style?: CSSProperties }) => (
  <span className={`ak-skel${dark ? ' ak-skel--dark' : ''}`} style={{ width: w, height: h, ...style }} aria-hidden="true" />
);

// ===================== STYLE FORM MASUK / DAFTAR =====================
const AUTH_CSS = `
.au-overlay{--au-ink:#0c1f19;--au-green:#0b7a56;--au-line:#c5d6cc;--au-muted:#647a70;position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,22,17,.62);font-family:Inter,system-ui,sans-serif;overscroll-behavior:contain}
.au-overlay *,.au-overlay *::before,.au-overlay *::after{box-sizing:border-box}
.au-dialog{position:relative;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);grid-template-rows:minmax(0,1fr);width:100%;max-width:880px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:hidden;border-radius:24px;background:#fff;color:var(--au-ink);box-shadow:0 30px 80px rgba(0,0,0,.45);animation:au-rise .28s cubic-bezier(.2,.8,.2,1)}

/* ---- panel kiri: identitas Petakilat dengan garis kontur peta ---- */
.au-brand{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;gap:28px;padding:30px 30px 32px;color:#fff;background:radial-gradient(120% 90% at 100% 0%,rgba(123,227,180,.35) 0%,transparent 55%),linear-gradient(160deg,#08211a,#0b3a2e 60%,#115240)}
.au-brand>*{position:relative;z-index:1}
.au-map{position:absolute;z-index:0;right:-45%;bottom:-25%;width:150%;height:auto;pointer-events:none}
.au-logo{display:flex;align-items:center;gap:8px;font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:500;letter-spacing:.01em}
.au-brand__copy h2{margin:0 0 10px;font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:clamp(26px,3.4vw,34px);line-height:1.1;font-weight:500}
.au-brand__copy p{margin:0;max-width:30ch;font-size:14px;line-height:1.55;color:rgba(255,255,255,.78)}
.au-points{margin:0;padding:0;list-style:none;display:grid;gap:10px;font-size:13px;line-height:1.45;color:rgba(255,255,255,.86)}
.au-points li{display:flex;align-items:flex-start;gap:9px}
.au-points svg{margin-top:2px}

/* ---- panel kanan: form ---- */
.au-close{position:absolute;top:12px;right:12px;z-index:3;width:36px;height:36px;border:0;border-radius:10px;background:#ebf2ee;color:#2f4a40;font-size:15px;line-height:1;cursor:pointer;transition:background .15s}
.au-close:hover{background:#dcebe3}
.au-panel{min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:60px 36px 32px}
.au-form{width:100%;max-width:400px;margin:auto}
.au-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:12px;background:#ebf2ee}
.au-tabs button{height:40px;border:0;border-radius:9px;background:transparent;color:#2f4a40;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
.au-tabs button.on{background:#fff;color:#0b3a2e;box-shadow:0 1px 3px rgba(8,33,26,.18)}
.au-field{margin-top:14px}
.au-tabs+.au-field{margin-top:20px}
.au-label{display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#2f4a40}
.au-input{display:block;width:100%;height:48px;padding:0 14px;border:1px solid var(--au-line);border-radius:12px;background:#fff;color:var(--au-ink);font:inherit;font-size:16px;transition:border-color .15s,box-shadow .15s}
.au-input::placeholder{color:#9aaea4}
.au-input:focus{outline:0;border-color:var(--au-green);box-shadow:0 0 0 3px rgba(11,122,86,.18)}
.au-pw{position:relative}
.au-pw .au-input{padding-right:104px}
.au-pw__t{position:absolute;top:50%;right:6px;transform:translateY(-50%);height:36px;padding:0 10px;border:0;border-radius:8px;background:none;color:var(--au-green);font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.au-pw__t:hover{background:#ebf2ee}
.au-hint{margin:6px 0 0;font-size:12px;color:var(--au-muted)}
.au-forgot{display:flex;justify-content:flex-end;margin-top:8px}
.au-code{height:60px;padding:0 0 0 .5em;text-align:center;font-size:28px;font-weight:600;letter-spacing:.5em;font-variant-numeric:tabular-nums}
.au-note{margin-bottom:4px;padding:11px 13px;border:1px solid #cfe8dc;border-radius:12px;background:#ecf7f1;color:#0b3a2e;font-size:13px;line-height:1.5}
.au-note--err{margin:14px 0 0;border-color:#fecaca;background:#fef2f2;color:#991b1b}
.au-btn{display:grid;place-items:center;width:100%;height:50px;margin-top:18px;border:0;border-radius:12px;background:var(--au-green);color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer;transition:filter .15s}
.au-btn:hover:not(:disabled){filter:brightness(1.08)}
.au-btn:disabled{opacity:.55;cursor:not-allowed}
.au-alt{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 18px;margin-top:16px;font-size:13px;color:var(--au-muted)}
.au-link{border:0;background:none;padding:0;color:var(--au-green);font:inherit;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline}
.au-overlay button:focus-visible{outline:2px solid var(--au-green);outline-offset:2px}
@keyframes au-rise{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
@keyframes au-sheet{from{opacity:.6;transform:translateY(32px)}to{opacity:1;transform:none}}

/* ---- ponsel: tampil sebagai lembar dari bawah layar ---- */
@media (max-width:640px){
  .au-overlay{align-items:flex-end;padding:0}
  .au-dialog{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);max-width:none;max-height:94vh;max-height:94dvh;border-radius:24px 24px 0 0;animation-name:au-sheet}
  .au-brand{gap:14px;padding:16px 20px 20px}
  .au-brand__copy h2{margin:0;font-size:24px}
  .au-brand__copy p,.au-points{display:none}
  .au-map{right:-30%;bottom:-140%;width:120%}
  .au-close{top:10px;right:10px;background:rgba(255,255,255,.14);color:#fff}
  .au-close:hover{background:rgba(255,255,255,.24)}
  .au-close:focus-visible{outline-color:#7be3b4}
  .au-panel{padding:20px 20px calc(24px + env(safe-area-inset-bottom,0px))}
}
@media (prefers-reduced-motion:reduce){.au-dialog{animation:none}}

/* Login dengan Google */
.au-or{display:flex;align-items:center;gap:12px;margin-top:18px;font-size:12px;color:var(--au-muted)}
.au-or::before,.au-or::after{content:'';flex:1;height:1px;background:var(--au-line)}
.au-gbtn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:48px;margin-top:14px;border:1px solid var(--au-line);border-radius:12px;background:#fff;color:var(--au-ink);font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}
.au-gbtn:hover:not(:disabled){background:#f4f8f6}
.au-gbtn:disabled{opacity:.55;cursor:not-allowed}
`;

/** Garis kontur peta: satu bentuk yang diperbesar bertahap, seperti kontur ketinggian. */
const Contours = () => (
  <svg className="au-map" viewBox="-150 -150 300 300" aria-hidden="true" focusable="false">
    <g fill="none" stroke="rgba(123,227,180,.22)" strokeWidth={1}>
      {Array.from({ length: 13 }).map((_, i) => (
        <path
          key={i}
          vectorEffect="non-scaling-stroke"
          transform={`rotate(${i * 5}) scale(${(0.18 + i * 0.13).toFixed(2)})`}
          d="M10,-100 C70,-96 110,-40 96,12 C84,64 30,104 -26,94 C-84,84 -112,30 -92,-26 C-74,-76 -30,-104 10,-100Z"
        />
      ))}
    </g>
  </svg>
);

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export function AuthModal({ auth, onClose, onSuccess }: { auth: Auth; onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'daftar' | 'lupa'>('login');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  // Langkah verifikasi email: berisi alamat email yang sedang menunggu kode
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  // Langkah reset kata sandi: berisi alamat email yang sedang menunggu kode reset
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Tombol Esc menutup form; halaman di belakang tidak ikut bergulir selama form terbuka.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

const onGoogle = async () => {
  setErr(''); setInfo(''); setBusy(true);
  try {
    const idToken = await googleIdToken();
    if (!idToken) return; // popup ditutup user, bukan error
    await auth.loginGoogle(idToken);
    onSuccess();
  } catch (ex: any) {
    setErr(ex?.message || 'Gagal terhubung ke server.');
  } finally { setBusy(false); }
};

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setInfo(''); setBusy(true);
    try {
      const pending = mode === 'login'
        ? await auth.login(email, password)
        : await auth.register(nama, email, password);
      if (pending) {
        setVerifyEmail(pending);
        setCode('');
        setCooldown(60);
        setInfo(`Kami mengirim kode 6 digit ke ${pending}. Kode berlaku 15 menit.`);
        return;
      }
      onSuccess();
    } catch (ex: any) {
      setErr(ex?.message || 'Gagal terhubung ke server.');
    } finally { setBusy(false); }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!verifyEmail) return;
    setErr(''); setInfo(''); setBusy(true);
    try {
      await auth.verifyEmail(verifyEmail, code.trim());
      onSuccess();
    } catch (ex: any) {
      setErr(ex?.message || 'Gagal terhubung ke server.');
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (!verifyEmail || cooldown > 0) return;
    setErr(''); setInfo('');
    try {
      await auth.resendCode(verifyEmail);
      setInfo('Kode baru sudah dikirim. Cek folder spam jika belum masuk.');
      setCooldown(60);
    } catch (ex: any) {
      setErr(ex?.message || 'Gagal terhubung ke server.');
    }
  };

  const switchMode = (m: 'login' | 'daftar') => { setMode(m); setErr(''); setShowPw(false); };

  // ---------- Lupa kata sandi ----------
  const openForgot = () => { setMode('lupa'); setErr(''); setInfo(''); setShowPw(false); };

  const backToLogin = () => {
    setMode('login');
    setResetEmail(null);
    setCode(''); setNewPassword('');
    setErr(''); setInfo(''); setShowPw(false);
  };

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setInfo(''); setBusy(true);
    try {
      const target = email.trim();
      await auth.forgotPassword(target);
      setResetEmail(target.toLowerCase());
      setCode('');
      setNewPassword('');
      setCooldown(60);
      setInfo(`Jika ${target} terdaftar, kami mengirim kode 6 digit ke alamat itu. Kode berlaku 15 menit.`);
    } catch (ex: any) {
      setErr(ex?.message || 'Gagal terhubung ke server.');
    } finally { setBusy(false); }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setErr(''); setInfo(''); setBusy(true);
    try {
      await auth.resetPassword(resetEmail, code.trim(), newPassword);
      onSuccess();
    } catch (ex: any) {
      setErr(ex?.message || 'Gagal terhubung ke server.');
    } finally { setBusy(false); }
  };

  const resendReset = async () => {
    if (!resetEmail || cooldown > 0) return;
    setErr(''); setInfo('');
    try {
      await auth.forgotPassword(resetEmail);
      setInfo('Jika email terdaftar, kode baru sudah dikirim. Cek folder spam jika belum masuk.');
      setCooldown(60);
    } catch (ex: any) {
      setErr(ex?.message || 'Gagal terhubung ke server.');
    }
  };

  /** Kerangka bersama: panel identitas di kiri (di ponsel menjadi pita di atas) dan isi form di kanan. */
  const shell = (title: string, lead: string, body: ReactNode) => (
    <div className="au-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{AUTH_CSS}{SKEL_CSS}</style>
      <div className="au-dialog" role="dialog" aria-modal="true" aria-labelledby="au-title">
        <button type="button" className="au-close" aria-label="Tutup" onClick={onClose}>✕</button>
        <aside className="au-brand">
          <Contours />
          <div className="au-logo"><Bolt size={22} /><span>Petakilat</span></div>
          <div className="au-brand__copy">
            <h2 id="au-title">{title}</h2>
            <p>{lead}</p>
          </div>
          <ul className="au-points">
            <li><Bolt size={14} />Ekspor peta PNG atau PDF tanpa watermark</li>
            <li><Bolt size={14} />1 kredit = 1 kali ekspor, dibeli lewat WhatsApp admin</li>
          </ul>
        </aside>
        <div className="au-panel">{body}</div>
      </div>
    </div>
  );

  // ---------- Langkah 2: masukkan kode verifikasi ----------
  if (verifyEmail) {
    return shell(
      'Cek email Anda',
      'Masukkan kode 6 digit untuk memastikan email ini milik Anda.',
      <form className="au-form" onSubmit={submitCode}>
        {info && <div className="au-note" role="status">{info}</div>}
        <div className="au-field">
          <label className="au-label" htmlFor="au-code">Kode verifikasi</label>
          <input
            id="au-code" className="au-input au-code" value={code} required autoFocus
            inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
            placeholder="123456"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        {err && <div className="au-note au-note--err" role="alert">{err}</div>}
        <button className="au-btn" type="submit" disabled={busy || code.length !== 6} aria-busy={busy} aria-label={busy ? 'Memverifikasi' : undefined}>
          {busy ? <Skel w={110} h={12} dark /> : 'Verifikasi & masuk'}
        </button>
        <div className="au-alt">
          {cooldown > 0 ? (
            <span>Kirim ulang kode dalam {cooldown} dtk</span>
          ) : (
            <button type="button" className="au-link" onClick={resend}>Kirim ulang kode</button>
          )}
          <button type="button" className="au-link" onClick={() => { setVerifyEmail(null); setErr(''); setInfo(''); }}>Ganti email</button>
        </div>
      </form>
    );
  }

  // ---------- Reset kata sandi: masukkan kode + kata sandi baru ----------
  if (resetEmail) {
    return shell(
      'Buat kata sandi baru',
      'Masukkan kode 6 digit dari email, lalu pilih kata sandi baru Anda.',
      <form className="au-form" onSubmit={submitReset}>
        {info && <div className="au-note" role="status">{info}</div>}
        <div className="au-field">
          <label className="au-label" htmlFor="au-rcode">Kode dari email</label>
          <input
            id="au-rcode" className="au-input au-code" value={code} required autoFocus
            inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
            placeholder="123456"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div className="au-field">
          <label className="au-label" htmlFor="au-newpass">Kata sandi baru</label>
          <div className="au-pw">
            <input
              id="au-newpass" className="au-input" type={showPw ? 'text' : 'password'} value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} required minLength={8} maxLength={128}
              autoComplete="new-password" placeholder="Kata sandi baru"
            />
            <button type="button" className="au-pw__t" onClick={() => setShowPw((s) => !s)}>{showPw ? 'Sembunyikan' : 'Tampilkan'}</button>
          </div>
          <p className="au-hint">Minimal 8 karakter.</p>
        </div>
        {err && <div className="au-note au-note--err" role="alert">{err}</div>}
        <button className="au-btn" type="submit" disabled={busy || code.length !== 6 || newPassword.length < 8} aria-busy={busy} aria-label={busy ? 'Memproses' : undefined}>
          {busy ? <Skel w={110} h={12} dark /> : 'Simpan & masuk'}
        </button>
        <div className="au-alt">
          {cooldown > 0 ? (
            <span>Kirim ulang kode dalam {cooldown} dtk</span>
          ) : (
            <button type="button" className="au-link" onClick={resendReset}>Kirim ulang kode</button>
          )}
          <button type="button" className="au-link" onClick={() => { setResetEmail(null); setErr(''); setInfo(''); }}>Ganti email</button>
          <button type="button" className="au-link" onClick={backToLogin}>Kembali masuk</button>
        </div>
      </form>
    );
  }

  // ---------- Lupa kata sandi: masukkan email ----------
  if (mode === 'lupa') {
    return shell(
      'Lupa kata sandi?',
      'Kami kirim kode 6 digit ke email akun Anda untuk membuat kata sandi baru.',
      <form className="au-form" onSubmit={submitForgot}>
        <div className="au-field">
          <label className="au-label" htmlFor="au-femail">Email akun</label>
          <input
            id="au-femail" className="au-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required autoFocus
          />
        </div>
        {err && <div className="au-note au-note--err" role="alert">{err}</div>}
        <button className="au-btn" type="submit" disabled={busy} aria-busy={busy} aria-label={busy ? 'Memproses' : undefined}>
          {busy ? <Skel w={80} h={12} dark /> : 'Kirim kode'}
        </button>
        <div className="au-alt">
          <button type="button" className="au-link" onClick={backToLogin}>Kembali ke halaman masuk</button>
        </div>
      </form>
    );
  }

  // ---------- Langkah 1: masuk / daftar ----------
  return shell(
    mode === 'login' ? 'Selamat datang kembali' : 'Buat akun Petakilat',
    mode === 'login'
      ? 'Masuk untuk memilih wilayah dan mengekspor peta Anda.'
      : 'Daftar dengan email Anda, lalu verifikasi dengan kode 6 digit.',
    <form className="au-form" onSubmit={submit}>
      <div className="au-tabs" role="tablist" aria-label="Masuk atau daftar">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>Masuk</button>
        <button type="button" role="tab" aria-selected={mode === 'daftar'} className={mode === 'daftar' ? 'on' : ''} onClick={() => switchMode('daftar')}>Daftar</button>
      </div>

      {mode === 'daftar' && (
        <div className="au-field">
          <label className="au-label" htmlFor="au-nama">Nama</label>
          <input id="au-nama" className="au-input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Anda" autoComplete="name" required />
        </div>
      )}
      <div className="au-field">
        <label className="au-label" htmlFor="au-email">Email</label>
        <input
          id="au-email" className="au-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required
        />
      </div>
      <div className="au-field">
        <label className="au-label" htmlFor="au-pass">Kata sandi</label>
        <div className="au-pw">
          <input
            id="au-pass" className="au-input" type={showPw ? 'text' : 'password'} value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'daftar' ? 8 : 1}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Kata sandi"
          />
          <button type="button" className="au-pw__t" onClick={() => setShowPw((s) => !s)}>{showPw ? 'Sembunyikan' : 'Tampilkan'}</button>
        </div>
        {mode === 'daftar' && <p className="au-hint">Minimal 8 karakter.</p>}
        {mode === 'login' && (
          <div className="au-forgot">
            <button type="button" className="au-link" onClick={openForgot}>Lupa kata sandi?</button>
          </div>
        )}
      </div>

      {err && <div className="au-note au-note--err" role="alert">{err}</div>}
           <button className="au-btn" type="submit" disabled={busy} aria-busy={busy} aria-label={busy ? 'Memproses' : undefined}>
        {busy ? <Skel w={80} h={12} dark /> : mode === 'login' ? 'Masuk' : 'Daftar'}
      </button>

      {firebaseReady && (
        <>
          <div className="au-or"><span>atau</span></div>
          <button type="button" className="au-gbtn" onClick={onGoogle} disabled={busy}>
            <GoogleG /> Lanjutkan dengan Google
          </button>
        </>
      )}

      <div className="au-alt">
        <span>{mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}</span>
        <button type="button" className="au-link" onClick={() => switchMode(mode === 'login' ? 'daftar' : 'login')}>
          {mode === 'login' ? 'Daftar' : 'Masuk'}
        </button>
      </div>
    </form>
  );
}

// ===================== STYLE DASHBOARD AKUN =====================
const ACC_CSS = `
.ac-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,22,17,.62)}
.ac-card{width:100%;max-width:580px;max-height:92vh;overflow-y:auto;border-radius:24px;background:#fff;color:#0c1f19;box-shadow:0 30px 80px rgba(0,0,0,.45);font-family:Inter,system-ui,sans-serif}
.ac-hero{position:relative;overflow:hidden;padding:20px 22px 24px;color:#fff;background:radial-gradient(120% 140% at 100% 0%,rgba(123,227,180,.55) 0%,transparent 55%),radial-gradient(80% 90% at 0% 100%,rgba(123,227,180,.18) 0%,transparent 60%),linear-gradient(135deg,#08211a,#0b3a2e 55%,#115240)}
.ac-hero__top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ac-user{display:flex;align-items:center;gap:12px;min-width:0}
.ac-avatar{flex-shrink:0;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#7be3b4,#3fc08b);color:#06281d;font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:500}
.ac-user__txt{display:flex;flex-direction:column;min-width:0}
.ac-user__txt b{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-user__txt span{display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,.72);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-tag{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:999px;background:rgba(123,227,180,.2);color:#b4f0d3}
.ac-hero__btns{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ac-ghost{height:34px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:background .15s}
.ac-ghost:hover{background:rgba(255,255,255,.18)}
.ac-close{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font-size:14px;cursor:pointer;transition:background .15s}
.ac-close:hover{background:rgba(255,255,255,.18)}
.ac-balance{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-top:20px}
.ac-balance__label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.ac-balance__num{font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:56px;font-weight:500;line-height:1;letter-spacing:-.03em;background:linear-gradient(180deg,#fff,#b4f0d3);-webkit-background-clip:text;background-clip:text;color:transparent}
.ac-balance p{margin:0;max-width:210px;font-size:12px;line-height:1.5;color:rgba(255,255,255,.72);text-align:right}
.ac-body{padding:20px 22px 24px}
.ac-tabs{display:flex;gap:4px;padding:4px;margin-bottom:18px;border-radius:12px;background:#ebf2ee}
.ac-tabs button{flex:1;height:36px;border:0;border-radius:9px;background:transparent;color:#566e63;font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s}
.ac-tabs button.on{background:#fff;color:#0b3a2e;box-shadow:0 1px 4px rgba(11,58,46,.15)}
.ac-step{display:flex;align-items:center;gap:10px;margin:20px 0 10px;font-size:14px;font-weight:700;color:#08211a}
.ac-step:first-child{margin-top:0}
.ac-step span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#0b7a56;color:#fff;font-size:12px;font-weight:700}
.ac-packs{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ac-pack{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:18px 16px 16px;border-radius:18px;border:2px solid #d5e3db;background:#fff;color:#0c1f19;font:inherit;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.ac-pack:hover{border-color:#7be3b4;box-shadow:0 12px 28px rgba(11,58,46,.12)}
.ac-pack:focus-visible{outline:3px solid rgba(11,122,86,.35);outline-offset:2px}
.ac-pack--best{border-color:#3fc08b;background:linear-gradient(160deg,#f3fbf7,#d9f2e6)}
.ac-pack--best:hover{border-color:#0b7a56}
.ac-ribbon{position:absolute;top:0;right:0;padding:5px 12px 5px 14px;border-radius:0 0 0 14px;background:linear-gradient(135deg,#0b7a56,#086146);color:#fff;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.ac-pack__bolts{display:flex;flex-wrap:wrap;gap:2px;margin:22px 0 0;min-height:24px}
.ac-pack__qty{display:flex;align-items:baseline;gap:6px;font-family:'Newsreader','Cormorant Garamond',Georgia,serif}
.ac-pack__qty b{font-size:40px;font-weight:700;line-height:1;letter-spacing:-.03em}
.ac-pack__qty span{font-size:14px;font-weight:600;color:#566e63}
.ac-pack__price{font-size:20px;font-weight:800;color:#0b3a2e}
.ac-pack__old{margin-left:6px;font-size:13px;font-weight:500;color:#8aa196;text-decoration:line-through}
.ac-pack__per{font-size:12px;color:#566e63}
.ac-save{display:inline-flex;align-items:center;gap:4px;margin-top:2px;padding:3px 9px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:700}
.ac-input{width:100%;height:42px;margin-top:10px;padding:0 14px;border-radius:12px;border:1px solid #d5e3db;background:#fff;color:#0c1f19;font:inherit;font-size:14px;transition:border-color .15s,box-shadow .15s}
.ac-input:focus{outline:none;border-color:#0b7a56;box-shadow:0 0 0 3px rgba(11,122,86,.18)}
.ac-msg{margin-top:12px;padding:11px 14px;border-radius:12px;font-size:13px;line-height:1.5}
.ac-msg--ok{background:#dcfce7;color:#166534}
.ac-msg--err{background:#fee2e2;color:#991b1b}
.ac-empty{padding:14px;border-radius:12px;background:#f2f7f4;font-size:13px;color:#647a70;text-align:center}
.ac-mini{height:36px;padding:0 14px;border-radius:10px;border:1px solid #d5e3db;background:#fff;color:#0c1f19;font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
.ac-mini:hover{background:#ebf2ee}
.ac-mini--ok{border-color:#0b7a56;background:#0b7a56;color:#fff}
.ac-mini--ok:hover{background:#086146}
.ac-mini--no{color:#b91c1c;border-color:#fecaca;background:#fef2f2}
.ac-pack__go{margin-top:6px;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;background:#0b7a56;color:#fff;font-size:12px;font-weight:700;transition:background .15s}
.ac-pack:hover .ac-pack__go{background:#086146}
.ac-pack__bolts{margin-top:4px}
.ac-note{margin-top:14px;padding:12px 14px;border-radius:12px;background:#f2f7f4;font-size:13px;line-height:1.55;color:#2f4a40}
.ac-note ol{margin:6px 0 0;padding-left:18px}
.ac-note a,.ac-msg a{color:#0b7a56;font-weight:700}
.ac-refresh{width:100%;height:42px;margin-top:12px;border-radius:12px;border:1px solid #0b7a56;background:#fff;color:#0b7a56;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
.ac-refresh:hover:not(:disabled){background:#0b7a56;color:#fff}
.ac-refresh:disabled{opacity:.6;cursor:not-allowed}
.ac-h{margin:0 0 8px;font-size:14px;font-weight:700;color:#08211a}
.ac-search{position:relative}
.ac-search .ac-input{margin-top:0;padding-left:38px}
.ac-search__ic{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#647a70;pointer-events:none;font-size:15px}
.ac-hint{margin:8px 0 0;font-size:12px;color:#647a70}
.ac-ulist{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.ac-urow{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:10px 12px;border-radius:12px;border:1px solid #e0e9e4;background:#fff;color:#0c1f19;font:inherit;text-align:left;cursor:pointer;transition:background .15s,border-color .15s}
.ac-urow:hover{background:#f1f9f5;border-color:#9ccbb5}
.ac-urow--skel{cursor:default}
.ac-urow--skel:hover{background:#fff;border-color:#e0e9e4}
.ac-urow--skel .ac-urow__t{flex:1}
.ac-urow.on{border:2px solid #0b7a56;background:#dcf1e7;padding:9px 11px}
.ac-urow__t{display:flex;flex-direction:column;min-width:0}
.ac-urow__t b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-urow__t small{font-size:12px;color:#647a70;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-urow__k{flex-shrink:0;display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:#0b3a2e}
.ac-form{margin-top:16px;padding:14px;border-radius:16px;border:1px solid #d5e3db;background:#f6fbf8}
.ac-who{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.ac-who__t{min-width:0}
.ac-who__t b{display:block;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-who__t small{display:block;font-size:12px;color:#647a70;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-who__k{flex-shrink:0;text-align:right}
.ac-who__k small{display:block;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#647a70}
.ac-who__k b{display:inline-flex;align-items:center;gap:4px;font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:500;color:#0b3a2e}
.ac-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ac-seg button{height:40px;border-radius:10px;border:1px solid #d5e3db;background:#fff;color:#0c1f19;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.ac-seg button.add{border:2px solid #0b7a56;background:#dcfce7;color:#166534}
.ac-seg button.sub{border:2px solid #dc2626;background:#fee2e2;color:#991b1b}
.ac-lab{display:block;margin:12px 0 0;font-size:12px;font-weight:600;color:#2f4a40}
.ac-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ac-chips button{height:30px;padding:0 12px;border-radius:999px;border:1px solid #d5e3db;background:#fff;color:#0c1f19;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.ac-chips button:hover{background:#ebf2ee}
.ac-preview{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:11px 14px;border-radius:12px;background:#0b3a2e;color:#fff;font-size:13px}
.ac-preview b{font-family:'Newsreader','Cormorant Garamond',Georgia,serif;font-size:17px}
.ac-preview--bad{background:#991b1b}
.ac-go{width:100%;height:48px;margin-top:12px;border:0;border-radius:12px;color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:filter .15s}
.ac-go--add{background:#0b7a56}
.ac-go--sub{background:#dc2626}
.ac-go:hover:not(:disabled){filter:brightness(1.08)}
.ac-go:disabled{opacity:.55;cursor:not-allowed}
.ac-linkbtn{border:0;background:none;padding:0;color:#0b7a56;font:inherit;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline}
@media (max-width:520px){
  .ac-packs{grid-template-columns:1fr}
  .ac-balance{flex-direction:column;align-items:flex-start}
  .ac-balance p{text-align:left;max-width:none}
  .ac-balance__num{font-size:48px}
}
`;

export function AccountModal({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const user = auth.user!;
  const isAdmin = user.role === 'admin';
  // Admin tidak membeli kredit (saldo tak terbatas), jadi langsung ke panel admin.
  const tab: 'kredit' | 'admin' = isAdmin ? 'admin' : 'kredit';
  const [dipesan, setDipesan] = useState<PaketKredit | null>(null);
  const [memuat, setMemuat] = useState(true); // saldo sedang disegarkan

  useEffect(() => { auth.refreshUser().finally(() => setMemuat(false)); /* eslint-disable-next-line */ }, []);

  // Pilih paket -> langsung membuka chat WhatsApp admin dengan pesan pesanan yang sudah terisi
  const pesan = (p: PaketKredit) => {
    setDipesan(p);
    window.open(linkWaPaket(p, user), '_blank', 'noopener,noreferrer');
  };

  const cekSaldo = async () => {
    setMemuat(true);
    try { await auth.refreshUser(); } finally { setMemuat(false); }
  };

  return (
    <div className="ac-overlay" onClick={onClose}>
      <style>{ACC_CSS}{SKEL_CSS}</style>
      <div className="ac-card" role="dialog" aria-modal="true" aria-label="Akun dan kredit" onClick={(e) => e.stopPropagation()}>
        {/* ===== HEADER + SALDO ===== */}
        <div className="ac-hero">
          <div className="ac-hero__top">
            <div className="ac-user">
              <div className="ac-avatar">{(user.nama || user.email).trim().charAt(0).toUpperCase()}</div>
              <div className="ac-user__txt">
                <b>{user.nama}</b>
                <span>{user.email}{isAdmin && <i className="ac-tag">Admin</i>}</span>
              </div>
            </div>
            <div className="ac-hero__btns">
              <button type="button" className="ac-ghost" onClick={() => { auth.logout(); onClose(); }}>Keluar</button>
              <button type="button" className="ac-close" aria-label="Tutup" onClick={onClose}>✕</button>
            </div>
          </div>
          <div className="ac-balance">
            <div>
              <div className="ac-balance__label"><Bolt size={14} /> Saldo kredit</div>
              <div className="ac-balance__num" aria-busy={memuat}>{memuat ? <Skel w={92} h={48} dark style={{ borderRadius: 12 }} /> : isAdmin ? '∞' : user.kredit}</div>
            </div>
            <p>1 kredit dipakai untuk 1 kali ekspor PNG atau PDF tanpa watermark. Saldo minimal 1 kredit dibutuhkan untuk memilih wilayah.</p>
          </div>
        </div>

        <div className="ac-body">
          {tab === 'kredit' ? (
            <>
              <div className="ac-step"><span>1</span>Pilih paket, lalu chat admin</div>
              <div className="ac-packs">
                {PAKET_KREDIT.map((p) => {
                  const best = !!p.badge;
                  const irit = hemat(p) > 0;
                  return (
                    <button
                      type="button" key={p.id}
                      className={`ac-pack ${best ? 'ac-pack--best' : ''}`}
                      onClick={() => pesan(p)}
                      aria-label={`Pesan ${p.kredit} kredit ${rupiah(p.harga)} lewat WhatsApp admin`}
                    >
                      {best && <span className="ac-ribbon">{p.badge || 'Hemat'}</span>}
                      <span className="ac-pack__bolts" aria-hidden="true">
                        {Array.from({ length: p.kredit }).map((_, i) => <Bolt key={i} size={p.kredit > 4 ? 17 : 22} />)}
                      </span>
                      <span className="ac-pack__qty"><b>{p.kredit}</b><span>kredit</span></span>
                      <span className="ac-pack__price">
                        {rupiah(p.harga)}
                        {irit && <span className="ac-pack__old">{rupiah(p.kredit * HARGA_PER_KREDIT)}</span>}
                      </span>
                      <span className="ac-pack__per">≈ {rupiah(Math.round(p.harga / p.kredit))} per kredit</span>
                      {irit && <span className="ac-save">Hemat {rupiah(hemat(p))}</span>}
                      <span className="ac-pack__go">Pesan lewat WhatsApp</span>
                    </button>
                  );
                })}
              </div>

              {dipesan && (
                <div className="ac-msg ac-msg--ok">
                  WhatsApp admin dibuka untuk paket {dipesan.kredit} kredit ({rupiah(dipesan.harga)}). Jika tidak terbuka,{' '}
                  <a href={linkWaPaket(dipesan, user)} target="_blank" rel="noopener noreferrer">klik di sini</a>.
                </div>
              )}

              <div className="ac-note">
                <b>Cara membeli kredit</b>
                <ol>
                  <li>Pilih paket. Chat ke admin terbuka dengan pesan yang sudah terisi.</li>
                  <li>Kirim pesan, lalu ikuti arahan pembayaran dari admin.</li>
                  <li>Admin menambahkan kredit ke akun <b>{user.email}</b> setelah pembayaran dikonfirmasi.</li>
                </ol>
              </div>
              <button type="button" className="ac-refresh" onClick={cekSaldo} disabled={memuat}>
                {memuat ? 'Memeriksa...' : 'Cek saldo kredit'}
              </button>
            </>
          ) : (
            <AdminPanel />
          )}
        </div>
      </div>
    </div>
  );
}

interface UserHit {
  id: number;
  email: string;
  nama: string;
  role: string;
  kredit: number;
}

function AdminPanel() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<UserHit[]>([]);
  const [mencari, setMencari] = useState(false);
  const [err, setErr] = useState('');
  const [reload, setReload] = useState(0);
  const [picked, setPicked] = useState<UserHit | null>(null);
  const [mode, setMode] = useState<'tambah' | 'kurangi'>('tambah');
  const [jumlah, setJumlah] = useState('');
  const [catatan, setCatatan] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Cari akun di database (nama atau email). Kolom kosong menampilkan 10 akun terbaru.
  useEffect(() => {
    let dead = false;
    setMencari(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/admin/users?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json().catch(() => null);
        if (dead) return;
        if (!res.ok) { setErr(data?.error || 'Gagal mencari akun.'); setHits([]); }
        else { setErr(''); setHits(data as UserHit[]); }
      } catch {
        if (!dead) { setErr('Gagal terhubung ke server.'); setHits([]); }
      } finally {
        if (!dead) setMencari(false);
      }
    }, q.trim() ? 300 : 0);
    return () => { dead = true; clearTimeout(t); };
  }, [q, reload]);

  const n = parseInt(jumlah, 10);
  const angkaValid = Number.isInteger(n) && n > 0 && n <= 100000;
  const delta = mode === 'tambah' ? n : -n;
  const sesudah = picked && angkaValid ? picked.kredit + delta : null;
  const kurangiBerlebih = !!picked && mode === 'kurangi' && angkaValid && n > picked.kredit;
  const bisaSimpan = !!picked && angkaValid && !kurangiBerlebih && !busy;

  const simpan = async (e: FormEvent) => {
    e.preventDefault();
    if (!picked || !bisaSimpan) return;
    const ok = window.confirm(
      `${mode === 'tambah' ? 'Tambah' : 'Kurangi'} ${n} kredit untuk ${picked.nama} (${picked.email})?\n\nSaldo ${picked.kredit} → ${sesudah}`
    );
    if (!ok) return;
    setBusy(true); setMsg(null);
    try {
      const alasan = (catatan.trim() || (mode === 'tambah' ? 'tambah manual admin' : 'kurangi manual admin')).slice(0, 100);
      const d = await postJson('/api/admin/kredit', { user_id: picked.id, jumlah: delta, alasan });
      setPicked({ ...picked, kredit: d.saldo });
      setMsg({ ok: true, text: `Berhasil. Saldo ${d.nama} (${d.email}) sekarang ${d.saldo} kredit.` });
      setJumlah(''); setCatatan('');
      setReload((k) => k + 1);
    } catch (ex: any) {
      setMsg({ ok: false, text: ex?.message || 'Gagal terhubung ke server.' });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="ac-h">Cari akun user</div>
      <div className="ac-search">
        <span className="ac-search__ic" aria-hidden="true">⌕</span>
        <input
          className="ac-input" value={q} maxLength={80} autoComplete="off"
          placeholder="Ketik nama atau email user"
          aria-label="Cari akun user"
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <p className="ac-hint">{q.trim() ? 'Hasil pencarian dari database akun.' : 'Menampilkan 10 akun terbaru. Ketik untuk mencari akun tertentu.'}</p>

      {err && <div className="ac-msg ac-msg--err">{err}</div>}
      {!err && !mencari && hits.length === 0 && <div className="ac-empty" style={{ marginTop: 10 }}>Akun tidak ditemukan. Hanya akun dengan email terverifikasi yang tampil.</div>}
      {mencari ? (
        <div className="ac-ulist" aria-busy="true" aria-label="Memuat hasil pencarian">
          {[0, 1, 2].map((i) => (
            <div className="ac-urow ac-urow--skel" key={i}>
              <span className="ac-urow__t">
                <Skel w="55%" h={14} />
                <Skel w="78%" h={11} style={{ marginTop: 6 }} />
              </span>
              <Skel w={34} h={16} />
            </div>
          ))}
        </div>
      ) : hits.length > 0 && (
        <div className="ac-ulist" role="listbox" aria-label="Hasil pencarian akun">
          {hits.map((u) => (
            <button
              type="button" key={u.id} role="option" aria-selected={picked?.id === u.id}
              className={`ac-urow ${picked?.id === u.id ? 'on' : ''}`}
              onClick={() => { setPicked(u); setMsg(null); setJumlah(''); }}
            >
              <span className="ac-urow__t">
                <b>{u.nama}{u.role === 'admin' ? ' · admin' : ''}</b>
                <small>{u.email}</small>
              </span>
              <span className="ac-urow__k"><Bolt size={14} />{u.kredit}</span>
            </button>
          ))}
        </div>
      )}

      {msg && <div className={`ac-msg ${msg.ok ? 'ac-msg--ok' : 'ac-msg--err'}`}>{msg.text}</div>}

      {picked ? (
        <form className="ac-form" onSubmit={simpan}>
          <div className="ac-who">
            <div className="ac-who__t">
              <small>Akun terpilih</small>
              <b>{picked.nama}</b>
              <small>{picked.email}</small>
            </div>
            <div className="ac-who__k">
              <small>Saldo sekarang</small>
              <b><Bolt size={18} />{picked.kredit}</b>
            </div>
          </div>

          <div className="ac-seg" role="group" aria-label="Jenis perubahan kredit">
            <button type="button" className={mode === 'tambah' ? 'add' : ''} aria-pressed={mode === 'tambah'} onClick={() => setMode('tambah')}>+ Tambah kredit</button>
            <button type="button" className={mode === 'kurangi' ? 'sub' : ''} aria-pressed={mode === 'kurangi'} onClick={() => setMode('kurangi')}>− Kurangi kredit</button>
          </div>

          <label className="ac-lab" htmlFor="ac-jumlah">Jumlah kredit</label>
          <input
            id="ac-jumlah" className="ac-input" type="number" min={1} max={100000} inputMode="numeric"
            style={{ marginTop: 6 }} placeholder="Contoh: 3" value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
          />
          <div className="ac-chips" aria-label="Jumlah cepat sesuai paket">
            {PAKET_KREDIT.map((p) => (
              <button type="button" key={p.id} onClick={() => setJumlah(String(p.kredit))}>{p.kredit} kredit · {rupiah(p.harga)}</button>
            ))}
          </div>

          <label className="ac-lab" htmlFor="ac-catatan">Catatan (opsional)</label>
          <input
            id="ac-catatan" className="ac-input" style={{ marginTop: 6 }} maxLength={100}
            placeholder="Contoh: bayar paket 3 kredit via WhatsApp" value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />

          {sesudah !== null && (
            <div className={`ac-preview ${kurangiBerlebih ? 'ac-preview--bad' : ''}`}>
              <span>{kurangiBerlebih ? 'Pengurangan melebihi saldo akun' : 'Saldo setelah disimpan'}</span>
              {!kurangiBerlebih && <b>{picked.kredit} → {sesudah}</b>}
            </div>
          )}

          <button type="submit" className={`ac-go ${mode === 'tambah' ? 'ac-go--add' : 'ac-go--sub'}`} disabled={!bisaSimpan}>
            {busy ? 'Menyimpan...' : mode === 'tambah' ? 'Tambah kredit' : 'Kurangi kredit'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button type="button" className="ac-linkbtn" onClick={() => { setPicked(null); setJumlah(''); setCatatan(''); }}>Pilih akun lain</button>
          </div>
        </form>
      ) : (
        <div className="ac-note">Pilih akun dari daftar di atas untuk menambah atau mengurangi kreditnya. Akun dipilih dari database, jadi tidak perlu mengetik email lengkap.</div>
      )}
    </div>
  );
}
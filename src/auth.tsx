import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';

const API: string = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'gl_token';

// ====== ISI SESUAI KEBUTUHAN ANDA ======
/** Nomor WhatsApp admin (format internasional tanpa +). Kredit dibeli lewat chat ke nomor ini. */
export const ADMIN_WA = '6283176819739';

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
    register: (nama: string, email: string, password: string) =>
      authenticate('/api/auth/register', { nama, email, password }),
    verifyEmail: (email: string, code: string) => authenticate('/api/auth/verify', { email, code }),
    resendCode: (email: string) => postJson('/api/auth/resend', { email }),
    logout: () => { setToken(''); setUser(null); },
  };
}
export type Auth = ReturnType<typeof useAuth>;

// ===================== UI =====================
const overlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const card: CSSProperties = {
  background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh',
  overflowY: 'auto', padding: 20, boxShadow: '0 20px 50px rgba(0,0,0,.3)', color: '#0f172a', borderTop: '4px solid #facc15',
};
const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#facc15" stroke="#f59e0b" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export function AuthModal({ auth, onClose, onSuccess }: { auth: Auth; onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'daftar'>('login');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  // Langkah verifikasi email: berisi alamat email yang sedang menunggu kode
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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

  const header = (title: string) => (
    <div style={{ ...row, justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Bolt size={20} />{title}</h3>
      <button type="button" className="gl-btn gl-btn--sm" onClick={onClose}>Tutup</button>
    </div>
  );

  // ---------- Langkah 2: masukkan kode verifikasi ----------
  if (verifyEmail) {
    return (
      <div style={overlay} onClick={onClose}>
        <form style={card} onClick={(e) => e.stopPropagation()} onSubmit={submitCode}>
          {header('Verifikasi email')}
          {info && <div className="gl-note" style={{ marginBottom: 10 }}><span>{info}</span></div>}
          <label className="gl-field">
            <span className="gl-label">Kode verifikasi</span>
            <input
              className="gl-input" value={code} required autoFocus
              inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
              placeholder="123456"
              style={{ letterSpacing: 6, fontSize: 20, textAlign: 'center' }}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {err && <div className="gl-note gl-note--err" style={{ marginTop: 10 }}><span>{err}</span></div>}
          <button className="gl-btn gl-btn--primary" type="submit" disabled={busy || code.length !== 6} style={{ width: '100%', marginTop: 12 }}>
            {busy ? 'Memverifikasi...' : 'Verifikasi & masuk'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13 }}>
            {cooldown > 0 ? (
              <span style={{ color: '#64748b' }}>Kirim ulang kode dalam {cooldown} dtk</span>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); resend(); }}>Kirim ulang kode</a>
            )}
            {' · '}
            <a href="#" onClick={(e) => { e.preventDefault(); setVerifyEmail(null); setErr(''); setInfo(''); }}>Ganti email</a>
          </div>
        </form>
      </div>
    );
  }

  // ---------- Langkah 1: masuk / daftar ----------
  return (
    <div style={overlay} onClick={onClose}>
      <form style={card} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        {header(mode === 'login' ? 'Masuk ke Petakilat' : 'Daftar di Petakilat')}
        {mode === 'daftar' && (
          <label className="gl-field">
            <span className="gl-label">Nama</span>
            <input className="gl-input" value={nama} onChange={(e) => setNama(e.target.value)} required />
          </label>
        )}
        <label className="gl-field">
          <span className="gl-label">Email</span>
          <input className="gl-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="gl-field">
          <span className="gl-label">Kata sandi {mode === 'daftar' && '(min. 8 karakter)'}</span>
          <input className="gl-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'daftar' ? 8 : 1} />
        </label>
        {err && <div className="gl-note gl-note--err" style={{ marginTop: 10 }}><span>{err}</span></div>}
        <button className="gl-btn gl-btn--primary" type="submit" disabled={busy} style={{ width: '100%', marginTop: 12 }}>
          {busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13 }}>
          {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setErr(''); setMode(mode === 'login' ? 'daftar' : 'login'); }}>
            {mode === 'login' ? 'Daftar' : 'Masuk'}
          </a>
        </div>
      </form>
    </div>
  );
}

// ===================== STYLE DASHBOARD AKUN =====================
const ACC_CSS = `
@keyframes ac-fade{from{opacity:0}to{opacity:1}}
@keyframes ac-pop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
@keyframes ac-glow{0%,100%{box-shadow:0 0 0 0 rgba(250,204,21,.45)}50%{box-shadow:0 0 0 8px rgba(250,204,21,0)}}
@keyframes ac-shine{from{transform:translateX(-120%) skewX(-20deg)}to{transform:translateX(320%) skewX(-20deg)}}
.ac-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,18,27,.62);backdrop-filter:blur(6px);animation:ac-fade .2s ease}
.ac-card{width:100%;max-width:580px;max-height:92vh;overflow-y:auto;border-radius:24px;background:#fff;color:#0f172a;box-shadow:0 30px 80px rgba(0,0,0,.45);animation:ac-pop .28s cubic-bezier(.2,.9,.3,1.1);font-family:Inter,system-ui,sans-serif}
.ac-hero{position:relative;overflow:hidden;padding:20px 22px 24px;color:#fff;background:radial-gradient(120% 140% at 100% 0%,rgba(76,201,224,.55) 0%,transparent 55%),radial-gradient(80% 90% at 0% 100%,rgba(250,204,21,.18) 0%,transparent 60%),linear-gradient(135deg,#0a1c28,#0c3447 55%,#124a5e)}
.ac-hero__top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ac-user{display:flex;align-items:center;gap:12px;min-width:0}
.ac-avatar{flex-shrink:0;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#facc15,#f59e0b);color:#422006;font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-size:20px;font-weight:700}
.ac-user__txt{display:flex;flex-direction:column;min-width:0}
.ac-user__txt b{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-user__txt span{display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,.72);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-tag{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:999px;background:rgba(250,204,21,.2);color:#fde68a}
.ac-hero__btns{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ac-ghost{height:34px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:background .15s}
.ac-ghost:hover{background:rgba(255,255,255,.18)}
.ac-close{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font-size:14px;cursor:pointer;transition:background .15s}
.ac-close:hover{background:rgba(255,255,255,.18)}
.ac-balance{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-top:20px}
.ac-balance__label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.ac-balance__num{font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-size:56px;font-weight:700;line-height:1;letter-spacing:-.03em;background:linear-gradient(180deg,#fff,#fde68a);-webkit-background-clip:text;background-clip:text;color:transparent}
.ac-balance p{margin:0;max-width:210px;font-size:12px;line-height:1.5;color:rgba(255,255,255,.72);text-align:right}
.ac-body{padding:20px 22px 24px}
.ac-tabs{display:flex;gap:4px;padding:4px;margin-bottom:18px;border-radius:12px;background:#eef3f6}
.ac-tabs button{flex:1;height:36px;border:0;border-radius:9px;background:transparent;color:#586d7c;font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s}
.ac-tabs button.on{background:#fff;color:#0c3447;box-shadow:0 1px 4px rgba(12,52,71,.15)}
.ac-step{display:flex;align-items:center;gap:10px;margin:20px 0 10px;font-size:14px;font-weight:700;color:#0a1c28}
.ac-step:first-child{margin-top:0}
.ac-step span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#0e7490;color:#fff;font-size:12px;font-weight:700}
.ac-packs{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ac-pack{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:18px 16px 16px;border-radius:18px;border:2px solid #d9e2e8;background:#fff;color:#0f172a;font:inherit;text-align:left;cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s,background .18s}
.ac-pack:hover{transform:translateY(-3px);border-color:#4cc9e0;box-shadow:0 12px 28px rgba(12,52,71,.12)}
.ac-pack:focus-visible{outline:3px solid rgba(14,116,144,.35);outline-offset:2px}
.ac-pack--best{border-color:#facc15;background:linear-gradient(160deg,#fffdf0,#fff6cc)}
.ac-pack--best:hover{border-color:#f59e0b}
.ac-ribbon{position:absolute;top:0;right:0;padding:5px 12px 5px 14px;border-radius:0 0 0 14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.ac-pack__bolts{display:flex;flex-wrap:wrap;gap:2px;margin:22px 0 0;min-height:24px}
.ac-pack__qty{display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif}
.ac-pack__qty b{font-size:40px;font-weight:700;line-height:1;letter-spacing:-.03em}
.ac-pack__qty span{font-size:14px;font-weight:600;color:#586d7c}
.ac-pack__price{font-size:20px;font-weight:800;color:#0c3447}
.ac-pack__old{margin-left:6px;font-size:13px;font-weight:500;color:#94a3b8;text-decoration:line-through}
.ac-pack__per{font-size:12px;color:#586d7c}
.ac-save{display:inline-flex;align-items:center;gap:4px;margin-top:2px;padding:3px 9px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:700}
.ac-input{width:100%;height:42px;margin-top:10px;padding:0 14px;border-radius:12px;border:1px solid #d9e2e8;background:#fff;color:#0f172a;font:inherit;font-size:14px;transition:border-color .15s,box-shadow .15s}
.ac-input:focus{outline:none;border-color:#0e7490;box-shadow:0 0 0 3px rgba(14,116,144,.18)}
.ac-msg{margin-top:12px;padding:11px 14px;border-radius:12px;font-size:13px;line-height:1.5}
.ac-msg--ok{background:#dcfce7;color:#166534}
.ac-msg--err{background:#fee2e2;color:#991b1b}
.ac-empty{padding:14px;border-radius:12px;background:#f4f7f9;font-size:13px;color:#64748b;text-align:center}
.ac-mini{height:36px;padding:0 14px;border-radius:10px;border:1px solid #d9e2e8;background:#fff;color:#0f172a;font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
.ac-mini:hover{background:#eef3f6}
.ac-mini--ok{border-color:#0e7490;background:#0e7490;color:#fff}
.ac-mini--ok:hover{background:#0c5f75}
.ac-mini--no{color:#b91c1c;border-color:#fecaca;background:#fef2f2}
.ac-pack__go{margin-top:6px;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;background:#16a34a;color:#fff;font-size:12px;font-weight:700;transition:background .15s}
.ac-pack:hover .ac-pack__go{background:#15803d}
.ac-pack__bolts{margin-top:4px}
.ac-note{margin-top:14px;padding:12px 14px;border-radius:12px;background:#f4f7f9;font-size:13px;line-height:1.55;color:#334155}
.ac-note ol{margin:6px 0 0;padding-left:18px}
.ac-note a,.ac-msg a{color:#0e7490;font-weight:700}
.ac-refresh{width:100%;height:42px;margin-top:12px;border-radius:12px;border:1px solid #0e7490;background:#fff;color:#0e7490;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
.ac-refresh:hover:not(:disabled){background:#0e7490;color:#fff}
.ac-refresh:disabled{opacity:.6;cursor:not-allowed}
.ac-h{margin:0 0 8px;font-size:14px;font-weight:700;color:#0a1c28}
.ac-search{position:relative}
.ac-search .ac-input{margin-top:0;padding-left:38px}
.ac-search__ic{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#64748b;pointer-events:none;font-size:15px}
.ac-hint{margin:8px 0 0;font-size:12px;color:#64748b}
.ac-ulist{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.ac-urow{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:10px 12px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;font:inherit;text-align:left;cursor:pointer;transition:background .15s,border-color .15s}
.ac-urow:hover{background:#f4fafc;border-color:#9fc5d2}
.ac-urow.on{border:2px solid #0e7490;background:#e1f5fa;padding:9px 11px}
.ac-urow__t{display:flex;flex-direction:column;min-width:0}
.ac-urow__t b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-urow__t small{font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-urow__k{flex-shrink:0;display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:#0c3447}
.ac-form{margin-top:16px;padding:14px;border-radius:16px;border:1px solid #d9e2e8;background:#f8fbfc}
.ac-who{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.ac-who__t{min-width:0}
.ac-who__t b{display:block;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-who__t small{display:block;font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-who__k{flex-shrink:0;text-align:right}
.ac-who__k small{display:block;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#64748b}
.ac-who__k b{display:inline-flex;align-items:center;gap:4px;font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-size:26px;font-weight:700;color:#0c3447}
.ac-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ac-seg button{height:40px;border-radius:10px;border:1px solid #d9e2e8;background:#fff;color:#0f172a;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.ac-seg button.add{border:2px solid #16a34a;background:#dcfce7;color:#166534}
.ac-seg button.sub{border:2px solid #dc2626;background:#fee2e2;color:#991b1b}
.ac-lab{display:block;margin:12px 0 0;font-size:12px;font-weight:600;color:#334155}
.ac-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ac-chips button{height:30px;padding:0 12px;border-radius:999px;border:1px solid #d9e2e8;background:#fff;color:#0f172a;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.ac-chips button:hover{background:#eef3f6}
.ac-preview{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:11px 14px;border-radius:12px;background:#0c3447;color:#fff;font-size:13px}
.ac-preview b{font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-size:17px}
.ac-preview--bad{background:#991b1b}
.ac-go{width:100%;height:48px;margin-top:12px;border:0;border-radius:12px;color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:filter .15s}
.ac-go--add{background:#16a34a}
.ac-go--sub{background:#dc2626}
.ac-go:hover:not(:disabled){filter:brightness(1.08)}
.ac-go:disabled{opacity:.55;cursor:not-allowed}
.ac-linkbtn{border:0;background:none;padding:0;color:#0e7490;font:inherit;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline}
@media (max-width:520px){
  .ac-packs{grid-template-columns:1fr}
  .ac-balance{flex-direction:column;align-items:flex-start}
  .ac-balance p{text-align:left;max-width:none}
  .ac-balance__num{font-size:48px}
}
@media (prefers-reduced-motion:reduce){.ac-overlay,.ac-card,.ac-pack--best.on::after{animation:none}}
`;

export function AccountModal({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const user = auth.user!;
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState<'kredit' | 'admin'>('kredit');
  const [dipesan, setDipesan] = useState<PaketKredit | null>(null);
  const [memuat, setMemuat] = useState(false);

  useEffect(() => { auth.refreshUser(); /* eslint-disable-next-line */ }, []);

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
      <style>{ACC_CSS}</style>
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
              <div className="ac-balance__num">{isAdmin ? '∞' : user.kredit}</div>
            </div>
            <p>1 kredit dipakai untuk 1 kali ekspor PNG atau PDF tanpa watermark. Saldo minimal 1 kredit dibutuhkan untuk memilih wilayah.</p>
          </div>
        </div>

        <div className="ac-body">
          {isAdmin && (
            <div className="ac-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'kredit'} className={tab === 'kredit' ? 'on' : ''} onClick={() => setTab('kredit')}>Beli kredit</button>
              <button type="button" role="tab" aria-selected={tab === 'admin'} className={tab === 'admin' ? 'on' : ''} onClick={() => setTab('admin')}>Panel admin</button>
            </div>
          )}

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
      {hits.length > 0 && (
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

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';

const API: string = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'gl_token';

// ====== ISI SESUAI KEBUTUHAN ANDA ======
const REKENING = { bank: 'DANA', nomor: '082311607227', nama: 'Ricardo Gellael' };
/** Menampilkan nomor per 4 digit agar mudah dibaca: 0823 1160 7227 */
const formatNomor = (n: string) => n.replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

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

/**
 * Menghitung saran kredit dari nominal transfer: kombinasi paket yang menghasilkan kredit terbanyak
 * (sisa nominal yang tidak cukup untuk satu paket pun tidak dihitung).
 * Contoh: 20.000 -> 1, 50.000 -> 3, 80.000 -> 5, 100.000 -> 7, 130.000 -> 8.
 */
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const hitungKredit = (nominal: number): number => {
  const langkah = PAKET_KREDIT.reduce((g, p) => gcd(g, p.harga), 0);
  const n = Math.min(Math.floor(Math.max(0, nominal) / langkah), 500000);
  const dp: number[] = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1];
    for (const p of PAKET_KREDIT) {
      const c = p.harga / langkah;
      if (i >= c) dp[i] = Math.max(dp[i], dp[i - c] + p.kredit);
    }
  }
  return dp[n];
};

export interface AuthUser {
  id: number;
  email: string;
  nama: string;
  role: string;
  kredit: number;
}

interface Topup {
  id: number;
  email: string;
  nama: string;
  nominal: number;
  catatan: string | null;
  status: 'pending' | 'approved' | 'rejected';
  kredit_diberikan: number | null;
  alasan_admin: string | null;
  dibuat: string;
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

const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu verifikasi', approved: 'Disetujui', rejected: 'Ditolak' };

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
.ac-pack.on{border-color:#0e7490;background:linear-gradient(160deg,#f0fbfe,#e1f5fa);box-shadow:0 0 0 4px rgba(14,116,144,.14),0 14px 30px rgba(12,52,71,.14)}
.ac-pack--best{border-color:#facc15;background:linear-gradient(160deg,#fffdf0,#fff6cc)}
.ac-pack--best:hover{border-color:#f59e0b}
.ac-pack--best.on{border-color:#f59e0b;background:linear-gradient(160deg,#fffbe6,#fdeea0);box-shadow:0 0 0 4px rgba(245,158,11,.2),0 14px 30px rgba(180,120,0,.22)}
.ac-pack--best.on::after{content:'';position:absolute;top:0;left:0;width:34%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent);animation:ac-shine 2.6s ease-in-out infinite;pointer-events:none}
.ac-ribbon{position:absolute;top:0;right:0;padding:5px 12px 5px 14px;border-radius:0 0 0 14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.ac-radio{position:absolute;top:14px;left:14px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;border:2px solid #b8c7d1;background:#fff;color:transparent;font-size:11px;font-weight:800;transition:all .15s}
.ac-pack.on .ac-radio{border-color:#0e7490;background:#0e7490;color:#fff}
.ac-pack--best.on .ac-radio{border-color:#f59e0b;background:#f59e0b}
.ac-pack__bolts{display:flex;flex-wrap:wrap;gap:2px;margin:22px 0 0;min-height:24px}
.ac-pack__qty{display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif}
.ac-pack__qty b{font-size:40px;font-weight:700;line-height:1;letter-spacing:-.03em}
.ac-pack__qty span{font-size:14px;font-weight:600;color:#586d7c}
.ac-pack__price{font-size:20px;font-weight:800;color:#0c3447}
.ac-pack__old{margin-left:6px;font-size:13px;font-weight:500;color:#94a3b8;text-decoration:line-through}
.ac-pack__per{font-size:12px;color:#586d7c}
.ac-save{display:inline-flex;align-items:center;gap:4px;margin-top:2px;padding:3px 9px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:700}
.ac-pay{display:flex;flex-direction:column;gap:12px;padding:14px 16px;border-radius:16px;border:1px dashed #9fc5d2;background:#f4fafc}
.ac-pay__total small{display:block;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#586d7c}
.ac-pay__total b{font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-size:26px;font-weight:700;color:#0c3447}
.ac-copy{height:36px;padding:0 14px;border-radius:10px;border:1px solid #0e7490;background:#fff;color:#0e7490;font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
.ac-copy:hover{background:#0e7490;color:#fff}
.ac-pay p{margin:0;font-size:12px;line-height:1.55;color:#586d7c}
.ac-rek{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:#fff;border:1px solid #d9e2e8}
.ac-rek__info{display:flex;flex-direction:column;gap:2px;min-width:0}
.ac-rek__info small{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#586d7c}
.ac-rek__bank{padding:1px 7px;border-radius:999px;background:#e1f5fa;color:#0e7490;letter-spacing:.04em}
.ac-rek__info b{font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-size:22px;font-weight:700;letter-spacing:.02em;color:#0a1c28;overflow-wrap:anywhere}
.ac-rek__info span{font-size:13px;color:#334155}
.ac-copy{flex-shrink:0;min-width:96px}
.ac-copy.ok{background:#2f9e6b;border-color:#2f9e6b;color:#fff}
.ac-drop{position:relative;display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;border:2px dashed #b8c7d1;background:#fafcfd;cursor:pointer;transition:border-color .15s,background .15s}
.ac-drop:hover,.ac-drop:focus-within{border-color:#0e7490;background:#f0fbfe}
.ac-drop.has{border-style:solid;border-color:#2f9e6b;background:#f0fdf6}
.ac-drop input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.ac-drop__ic{flex-shrink:0;display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#e1f5fa;color:#0e7490;font-size:20px}
.ac-drop.has .ac-drop__ic{background:#d1fae5;color:#047857}
.ac-drop__t{display:flex;flex-direction:column;gap:2px;min-width:0}
.ac-drop__t b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-drop__t small{font-size:12px;color:#64748b}
.ac-input{width:100%;height:42px;margin-top:10px;padding:0 14px;border-radius:12px;border:1px solid #d9e2e8;background:#fff;color:#0f172a;font:inherit;font-size:14px;transition:border-color .15s,box-shadow .15s}
.ac-input:focus{outline:none;border-color:#0e7490;box-shadow:0 0 0 3px rgba(14,116,144,.18)}
.ac-msg{margin-top:12px;padding:11px 14px;border-radius:12px;font-size:13px;line-height:1.5}
.ac-msg--ok{background:#dcfce7;color:#166534}
.ac-msg--err{background:#fee2e2;color:#991b1b}
.ac-submit{position:relative;overflow:hidden;width:100%;height:52px;margin-top:14px;border:0;border-radius:14px;background:linear-gradient(135deg,#0e7490,#0c3447);color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 10px 24px rgba(12,52,71,.3);transition:transform .15s,box-shadow .15s,filter .15s}
.ac-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 30px rgba(12,52,71,.38);filter:brightness(1.08)}
.ac-submit:disabled{opacity:.6;cursor:not-allowed}
.ac-sum{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:12px 16px;border-radius:14px;background:#0c3447;color:#fff;font-size:13px}
.ac-sum b{font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-size:17px}
.ac-sum em{font-style:normal;display:inline-flex;align-items:center;gap:6px;color:#fde68a;font-weight:700}
.ac-h{margin:26px 0 10px;font-size:14px;font-weight:700;color:#0a1c28}
.ac-item{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px;padding:12px 14px;margin-bottom:8px;border-radius:14px;border:1px solid #e2e8f0;border-left-width:4px;background:#fff}
.ac-item--pending{border-left-color:#f59e0b}
.ac-item--approved{border-left-color:#2f9e6b}
.ac-item--rejected{border-left-color:#dc2626}
.ac-item b{font-size:14px}
.ac-item small{display:block;margin-top:2px;font-size:12px;color:#64748b}
.ac-item__r{display:flex;align-items:center;gap:8px}
.ac-item__r em{font-style:normal;font-size:13px;font-weight:700;color:#166534}
.ac-item p{flex-basis:100%;margin:0;font-size:12px;color:#991b1b}
.ac-chip{padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700}
.ac-chip--pending{background:#fef3c7;color:#92400e}
.ac-chip--approved{background:#dcfce7;color:#166534}
.ac-chip--rejected{background:#fee2e2;color:#991b1b}
.ac-empty{padding:14px;border-radius:12px;background:#f4f7f9;font-size:13px;color:#64748b;text-align:center}
.ac-adm{padding:14px;margin-bottom:12px;border-radius:16px;border:1px solid #e2e8f0;background:#fff}
.ac-adm__top{margin-bottom:8px;font-size:13px;line-height:1.55}
.ac-adm__row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
.ac-adm__row .ac-input{width:96px;height:36px;margin:0}
.ac-adm__row span{font-size:12px;color:#586d7c}
.ac-mini{height:36px;padding:0 14px;border-radius:10px;border:1px solid #d9e2e8;background:#fff;color:#0f172a;font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
.ac-mini:hover{background:#eef3f6}
.ac-mini--ok{border-color:#0e7490;background:#0e7490;color:#fff}
.ac-mini--ok:hover{background:#0c5f75}
.ac-mini--no{color:#b91c1c;border-color:#fecaca;background:#fef2f2}
@media (max-width:520px){
  .ac-packs{grid-template-columns:1fr}
  .ac-balance{flex-direction:column;align-items:flex-start}
  .ac-balance p{text-align:left;max-width:none}
  .ac-balance__num{font-size:48px}
  .ac-rek{flex-direction:column;align-items:stretch}
  .ac-copy{width:100%}
}
@media (prefers-reduced-motion:reduce){.ac-overlay,.ac-card,.ac-pack--best.on::after{animation:none}}
`;

export function AccountModal({ auth, onClose, initialPaket }: { auth: Auth; onClose: () => void; initialPaket?: string }) {
  const user = auth.user!;
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState<'kredit' | 'admin'>('kredit');
  const [paketId, setPaketId] = useState<string>(
    PAKET_KREDIT.some((p) => p.id === initialPaket) ? (initialPaket as string) : 'hemat'
  );
  const [catatan, setCatatan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [riwayat, setRiwayat] = useState<Topup[]>([]);

  const paket = PAKET_KREDIT.find((p) => p.id === paketId) ?? PAKET_KREDIT[0];

  const loadRiwayat = useCallback(async () => {
    const res = await apiFetch('/api/topup');
    if (res.ok) setRiwayat(await res.json());
  }, []);
  useEffect(() => { loadRiwayat(); auth.refreshUser(); /* eslint-disable-next-line */ }, []);

  const salin = async () => {
    const teks = REKENING.nomor.replace(/\s+/g, '');
    let ok = false;
    try { await navigator.clipboard.writeText(teks); ok = true; } catch { /* coba cara cadangan */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = teks; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* abaikan */ }
    }
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };

  const kirim = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setMsg({ ok: false, text: 'Pilih file bukti pembayaran.' }); return; }
    if (file.size > 3 * 1024 * 1024) { setMsg({ ok: false, text: 'Ukuran bukti maksimal 3 MB.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('nominal', String(paket.harga));
      // Nama paket ikut dicatat agar admin tahu paket mana yang dipilih
      fd.append('catatan', [`Paket ${paket.kredit} kredit`, catatan.trim()].filter(Boolean).join(' — ').slice(0, 300));
      fd.append('bukti', file);
      const res = await apiFetch('/api/topup', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim bukti.');
      setMsg({ ok: true, text: data.message || 'Bukti terkirim. Kredit ditambahkan setelah admin memverifikasi.' });
      setCatatan(''); setFile(null); setFileKey((k) => k + 1);
      loadRiwayat();
    } catch (ex: any) {
      setMsg({ ok: false, text: ex?.message || 'Gagal terhubung ke server.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="ac-overlay" onClick={onClose}>
      <style>{ACC_CSS}</style>
      <div className="ac-card" role="dialog" aria-modal="true" aria-label="Akun dan top-up kredit" onClick={(e) => e.stopPropagation()}>
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
              <button type="button" role="tab" aria-selected={tab === 'kredit'} className={tab === 'kredit' ? 'on' : ''} onClick={() => setTab('kredit')}>Top-up saya</button>
              <button type="button" role="tab" aria-selected={tab === 'admin'} className={tab === 'admin' ? 'on' : ''} onClick={() => setTab('admin')}>Panel admin</button>
            </div>
          )}

          {tab === 'kredit' ? (
            <>
              <form onSubmit={kirim}>
                {/* ===== 1. PILIH PAKET ===== */}
                <div className="ac-step"><span>1</span>Pilih paket kredit</div>
                <div className="ac-packs" role="radiogroup" aria-label="Pilih paket kredit">
                  {PAKET_KREDIT.map((p) => {
                    const on = p.id === paket.id;
                    const best = !!p.badge;
                    const irit = hemat(p) > 0;
                    return (
                      <button
                        type="button" key={p.id} role="radio" aria-checked={on}
                        className={`ac-pack ${on ? 'on' : ''} ${best ? 'ac-pack--best' : ''}`}
                        onClick={() => setPaketId(p.id)}
                      >
                        {best && <span className="ac-ribbon">{p.badge || 'Hemat'}</span>}
                        <span className="ac-radio" aria-hidden="true">✓</span>
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
                      </button>
                    );
                  })}
                </div>

                {/* ===== 2. TRANSFER ===== */}
                <div className="ac-step"><span>2</span>Transfer sesuai nominal</div>
                <div className="ac-pay">
                  <div className="ac-pay__total">
                    <small>Total transfer</small>
                    <b>{rupiah(paket.harga)}</b>
                  </div>
                  <div className="ac-rek">
                    <div className="ac-rek__info">
                      <small>Rekening tujuan · <span className="ac-rek__bank">{REKENING.bank}</span></small>
                      <b>{formatNomor(REKENING.nomor)}</b>
                      <span>a.n. {REKENING.nama}</span>
                    </div>
                    <button type="button" className={`ac-copy ${copied ? 'ok' : ''}`} onClick={salin}>
                      {copied ? 'Tersalin ✓' : 'Salin nomor'}
                    </button>
                  </div>
                  <p>Setelah transfer, unggah bukti di langkah 3. Kredit ditambahkan admin setelah diverifikasi.</p>
                </div>

                {/* ===== 3. BUKTI ===== */}
                <div className="ac-step"><span>3</span>Unggah bukti pembayaran</div>
                <label className={`ac-drop ${file ? 'has' : ''}`}>
                  <input
                    key={fileKey} type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <span className="ac-drop__ic" aria-hidden="true">{file ? '✓' : '⬆'}</span>
                  <span className="ac-drop__t">
                    <b>{file ? file.name : 'Pilih screenshot bukti transfer'}</b>
                    <small>{file ? `${(file.size / 1024).toFixed(0)} KB · ketuk untuk mengganti` : 'PNG, JPG, atau WEBP, maksimal 3 MB'}</small>
                  </span>
                </label>
                <input
                  className="ac-input" maxLength={200} value={catatan}
                  onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan (opsional), mis. a.n. pengirim"
                />

                <div className="ac-sum">
                  <span>Anda akan menerima</span>
                  <em><Bolt size={16} /> <b>{paket.kredit}</b> kredit</em>
                </div>

                {msg && <div className={`ac-msg ${msg.ok ? 'ac-msg--ok' : 'ac-msg--err'}`}>{msg.text}</div>}
                <button className="ac-submit" type="submit" disabled={busy}>
                  {busy ? 'Mengirim...' : `Kirim bukti · ${rupiah(paket.harga)}`}
                </button>
              </form>

              {/* ===== RIWAYAT ===== */}
              {riwayat.length > 0 && (
                <>
                  <div className="ac-h">Riwayat top-up</div>
                  {riwayat.map((r) => (
                    <div key={r.id} className={`ac-item ac-item--${r.status}`}>
                      <div>
                        <b>{rupiah(r.nominal)}</b>
                        <small>{r.dibuat}{r.catatan ? ` · ${r.catatan}` : ''}</small>
                      </div>
                      <div className="ac-item__r">
                        {r.status === 'approved' && <em>+{r.kredit_diberikan} kredit</em>}
                        <span className={`ac-chip ac-chip--${r.status}`}>{STATUS_LABEL[r.status]}</span>
                      </div>
                      {r.status === 'rejected' && r.alasan_admin && <p>Alasan: {r.alasan_admin}</p>}
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <AdminPanel />
          )}
        </div>
      </div>
    </div>
  );
}

function BuktiImg({ id }: { id: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let url = '';
    let dead = false;
    apiFetch(`/api/admin/topup/${id}/bukti`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => { if (b && !dead) { url = URL.createObjectURL(b); setSrc(url); } });
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, [id]);
  return src ? (
    <a href={src} target="_blank" rel="noreferrer">
      <img src={src} alt="Bukti pembayaran" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, border: '1px solid #e2e8f0' }} />
    </a>
  ) : <small>Memuat bukti...</small>;
}

function AdminPanel() {
  const [list, setList] = useState<Topup[]>([]);
  const [kreditInput, setKreditInput] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mJumlah, setMJumlah] = useState('');

  const load = useCallback(async () => {
    const res = await apiFetch('/api/admin/topup?status=pending');
    if (res.ok) setList(await res.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (t: Topup) => {
    const k = parseInt(kreditInput[t.id] ?? String(hitungKredit(t.nominal)), 10);
    if (!k || k < 1) { setMsg('Isi jumlah kredit yang valid.'); return; }
    try { await postJson(`/api/admin/topup/${t.id}/approve`, { kredit: k }); setMsg(`Disetujui: +${k} kredit untuk ${t.email}`); load(); }
    catch (e: any) { setMsg(e.message); }
  };
  const reject = async (t: Topup) => {
    const alasan = window.prompt('Alasan penolakan (opsional):') ?? '';
    try { await postJson(`/api/admin/topup/${t.id}/reject`, { alasan }); setMsg('Permintaan ditolak.'); load(); }
    catch (e: any) { setMsg(e.message); }
  };
  const manual = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const d = await postJson('/api/admin/kredit', { email: mEmail, jumlah: parseInt(mJumlah, 10), alasan: 'manual admin' });
      setMsg(`Berhasil. Saldo ${mEmail} sekarang ${d.saldo}.`); setMEmail(''); setMJumlah('');
    } catch (ex: any) { setMsg(ex.message); }
  };

  return (
    <div>
      {msg && <div className="ac-msg ac-msg--ok" style={{ marginTop: 0, marginBottom: 12 }}>{msg}</div>}
      <div className="ac-step" style={{ marginTop: 0 }}><span>{list.length}</span>Menunggu verifikasi</div>
      {list.length === 0 && <div className="ac-empty">Tidak ada permintaan.</div>}
      {list.map((t) => (
        <div key={t.id} className="ac-adm">
          <div className="ac-adm__top">
            <b>{t.nama}</b> ({t.email})<br />{t.dibuat} · <b>{rupiah(t.nominal)}</b>
            {t.catatan && <><br />Catatan: {t.catatan}</>}
          </div>
          <BuktiImg id={t.id} />
          <div className="ac-adm__row">
            <input
              className="ac-input" type="number" min={1}
              value={kreditInput[t.id] ?? String(hitungKredit(t.nominal))}
              onChange={(e) => setKreditInput((p) => ({ ...p, [t.id]: e.target.value }))}
            />
            <span>kredit</span>
            <button type="button" className="ac-mini ac-mini--ok" onClick={() => approve(t)}>Setujui</button>
            <button type="button" className="ac-mini ac-mini--no" onClick={() => reject(t)}>Tolak</button>
          </div>
        </div>
      ))}

      <form onSubmit={manual} style={{ marginTop: 18, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
        <div className="ac-step" style={{ marginTop: 0 }}>Tambah / kurangi kredit manual</div>
        <div className="ac-adm__row" style={{ marginTop: 0 }}>
          <input className="ac-input" type="email" placeholder="email user" style={{ flex: 1, minWidth: 150, width: 'auto', height: 40 }} value={mEmail} onChange={(e) => setMEmail(e.target.value)} required />
          <input className="ac-input" type="number" placeholder="+/- jumlah" style={{ width: 110, height: 40 }} value={mJumlah} onChange={(e) => setMJumlah(e.target.value)} required />
          <button className="ac-mini ac-mini--ok" style={{ height: 40 }} type="submit">Simpan</button>
        </div>
      </form>
    </div>
  );
}

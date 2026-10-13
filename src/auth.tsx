import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';

const API: string = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'gl_token';

// ====== ISI SESUAI KEBUTUHAN ANDA ======
const PAYMENT_INFO = 'Transfer ke: BANK/E-WALLET ... a.n. ... (isi rekening Anda di sini)';
const HARGA_PER_KREDIT = 25000; // dipakai admin sebagai saran jumlah kredit (nominal / harga)

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
const rupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');

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

export function AccountModal({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const user = auth.user!;
  const [tab, setTab] = useState<'kredit' | 'admin'>('kredit');
  const [nominal, setNominal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [riwayat, setRiwayat] = useState<Topup[]>([]);

  const loadRiwayat = useCallback(async () => {
    const res = await apiFetch('/api/topup');
    if (res.ok) setRiwayat(await res.json());
  }, []);
  useEffect(() => { loadRiwayat(); auth.refreshUser(); /* eslint-disable-next-line */ }, []);

  const kirim = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setMsg({ ok: false, text: 'Pilih file bukti pembayaran.' }); return; }
    if (file.size > 3 * 1024 * 1024) { setMsg({ ok: false, text: 'Ukuran bukti maksimal 3 MB.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('nominal', nominal);
      fd.append('catatan', catatan);
      fd.append('bukti', file);
      const res = await apiFetch('/api/topup', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim bukti.');
      setMsg({ ok: true, text: data.message });
      setNominal(''); setCatatan(''); setFile(null);
      (e.target as HTMLFormElement).reset();
      loadRiwayat();
    } catch (ex: any) {
      setMsg({ ok: false, text: ex?.message || 'Gagal terhubung ke server.' });
    } finally { setBusy(false); }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...row, justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{user.nama}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{user.email}{user.role === 'admin' && ' · Admin'}</div>
          </div>
          <div style={row}>
            <button className="gl-btn gl-btn--sm" onClick={() => { auth.logout(); onClose(); }}>Keluar</button>
            <button className="gl-btn gl-btn--sm" onClick={onClose}>Tutup</button>
          </div>
        </div>

        <div style={{ margin: '14px 0', padding: 14, borderRadius: 10, background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1px solid #fde68a', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#475569', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}><Bolt size={14} /> Saldo kredit</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{user.role === 'admin' ? '∞' : user.kredit}</div>
        </div>

        {user.role === 'admin' && (
          <div style={{ ...row, marginBottom: 12 }}>
            <button className={`gl-btn gl-btn--sm ${tab === 'kredit' ? 'gl-btn--primary' : ''}`} onClick={() => setTab('kredit')}>Top-up saya</button>
            <button className={`gl-btn gl-btn--sm ${tab === 'admin' ? 'gl-btn--primary' : ''}`} onClick={() => setTab('admin')}>Panel admin</button>
          </div>
        )}

        {tab === 'kredit' ? (
          <>
            <div className="gl-note" style={{ marginBottom: 10, fontSize: 13 }}>
              <span>{PAYMENT_INFO}<br />Setelah transfer, unggah screenshot bukti di bawah. Kredit ditambahkan admin setelah diverifikasi.</span>
            </div>
            <form onSubmit={kirim}>
              <label className="gl-field">
                <span className="gl-label">Nominal transfer (Rp)</span>
                <input className="gl-input" type="number" min={1000} value={nominal} onChange={(e) => setNominal(e.target.value)} required />
              </label>
              <label className="gl-field">
                <span className="gl-label">Catatan (opsional)</span>
                <input className="gl-input" maxLength={300} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. a.n. pengirim" />
              </label>
              <label className="gl-field">
                <span className="gl-label">Bukti pembayaran (PNG/JPG/WEBP, maks 3 MB)</span>
                <input className="gl-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
              </label>
              {msg && <div className={`gl-note ${msg.ok ? '' : 'gl-note--err'}`} style={{ marginTop: 8 }}><span>{msg.text}</span></div>}
              <button className="gl-btn gl-btn--primary" type="submit" disabled={busy} style={{ width: '100%', marginTop: 10 }}>
                {busy ? 'Mengirim...' : 'Kirim bukti pembayaran'}
              </button>
            </form>

            {riwayat.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Riwayat top-up</div>
                {riwayat.map((r) => (
                  <div key={r.id} style={{ fontSize: 13, padding: '6px 0', borderTop: '1px solid #e2e8f0' }}>
                    {r.dibuat} · {rupiah(r.nominal)} · <b>{STATUS_LABEL[r.status]}</b>
                    {r.status === 'approved' && ` (+${r.kredit_diberikan} kredit)`}
                    {r.status === 'rejected' && r.alasan_admin && ` — ${r.alasan_admin}`}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <AdminPanel />
        )}
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
      <img src={src} alt="Bukti pembayaran" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid #e2e8f0' }} />
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
    const k = parseInt(kreditInput[t.id] ?? String(Math.floor(t.nominal / HARGA_PER_KREDIT)), 10);
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
      {msg && <div className="gl-note" style={{ marginBottom: 10 }}><span>{msg}</span></div>}
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Menunggu verifikasi ({list.length})</div>
      {list.length === 0 && <div style={{ fontSize: 13, color: '#64748b' }}>Tidak ada permintaan.</div>}
      {list.map((t) => (
        <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <b>{t.nama}</b> ({t.email})<br />{t.dibuat} · <b>{rupiah(t.nominal)}</b>
            {t.catatan && <><br />Catatan: {t.catatan}</>}
          </div>
          <BuktiImg id={t.id} />
          <div style={{ ...row, marginTop: 8 }}>
            <input
              className="gl-input" type="number" min={1} style={{ width: 110 }}
              value={kreditInput[t.id] ?? String(Math.floor(t.nominal / HARGA_PER_KREDIT))}
              onChange={(e) => setKreditInput((p) => ({ ...p, [t.id]: e.target.value }))}
            />
            <span style={{ fontSize: 12 }}>kredit</span>
            <button className="gl-btn gl-btn--sm gl-btn--primary" onClick={() => approve(t)}>Setujui</button>
            <button className="gl-btn gl-btn--sm" onClick={() => reject(t)}>Tolak</button>
          </div>
        </div>
      ))}

      <form onSubmit={manual} style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Tambah / kurangi kredit manual</div>
        <div style={row}>
          <input className="gl-input" type="email" placeholder="email user" style={{ flex: 1, minWidth: 150 }} value={mEmail} onChange={(e) => setMEmail(e.target.value)} required />
          <input className="gl-input" type="number" placeholder="+/- jumlah" style={{ width: 110 }} value={mJumlah} onChange={(e) => setMJumlah(e.target.value)} required />
          <button className="gl-btn gl-btn--sm gl-btn--primary" type="submit">Simpan</button>
        </div>
      </form>
    </div>
  );
}

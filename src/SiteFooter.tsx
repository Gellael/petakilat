import type { ReactNode } from 'react';
import { ADMIN_WA } from './auth';

// ====== ISI AKUN SOSMED ANDA ======
// Isi dengan alamat lengkap (https://...). Yang dikosongkan tidak akan ditampilkan.
// WhatsApp otomatis memakai nomor ADMIN_WA dari auth.tsx.
const SOSMED = {
  // Sementara mengarah ke beranda platform. Ganti dengan akun Anda, mis. 'https://instagram.com/akunanda'
  instagram: 'https://www.instagram.com/kalibata.project',
  tiktok: 'https://www.tiktok.com/@petakilat.id',
  youtube: '',
  facebook: '',
  github: '',
  email: 'kilatpeta@gmail.com', // contoh: 'halo@petakilat.id'
};

type FooterTarget = 'fitur' | 'cara-kerja' | 'harga' | 'metodologi' | 'faq';

const Ico = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

/** Garis kontur peta yang samar di latar footer, selaras dengan panel masuk. */
const FooterContours = () => (
  <svg className="gf__map" viewBox="-150 -150 300 300" aria-hidden="true" focusable="false">
    <g fill="none" stroke="rgba(123,227,180,.16)" strokeWidth={1}>
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

interface Sosmed { key: string; label: string; href: string; icon: ReactNode }

const DAFTAR_SOSMED: Sosmed[] = [
  {
    key: 'wa', label: 'WhatsApp admin', href: `https://wa.me/${ADMIN_WA}`,
    icon: <Ico><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Ico>,
  },
  {
    key: 'ig', label: 'Instagram', href: SOSMED.instagram,
    icon: <Ico><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></Ico>,
  },
  {
    key: 'tt', label: 'TikTok', href: SOSMED.tiktok,
    icon: <Ico><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4c.5 2.5 2.2 4 5 4.2" /></Ico>,
  },
  {
    key: 'yt', label: 'YouTube', href: SOSMED.youtube,
    icon: <Ico><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></Ico>,
  },
  {
    key: 'fb', label: 'Facebook', href: SOSMED.facebook,
    icon: <Ico><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></Ico>,
  },
  {
    key: 'gh', label: 'GitHub', href: SOSMED.github,
    icon: <Ico><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></Ico>,
  },
  {
    key: 'mail', label: 'Email', href: SOSMED.email ? `mailto:${SOSMED.email}` : '',
    icon: <Ico><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Ico>,
  },
].filter((s) => s.href);

const FOOT_CSS = `
.gf{position:relative;overflow:hidden;background:linear-gradient(160deg,#08211a,#0b3a2e 70%,#0d4636);color:rgba(255,255,255,.78);font-family:'Plus Jakarta Sans',Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
.gf *,.gf *::before,.gf *::after{box-sizing:border-box}
.gf__map{position:absolute;z-index:0;right:-12%;top:-45%;width:min(720px,75%);height:auto;pointer-events:none}
.gf__inner,.gf__bar{position:relative;z-index:1}
.gf__inner{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:40px 56px;max-width:1120px;margin:0 auto;padding:64px 24px 44px}
.gf__logo{display:block;margin:0 0 6px;font-family:'Bricolage Grotesque','Plus Jakarta Sans',system-ui,sans-serif;font-size:32px;font-weight:700;letter-spacing:-.025em;line-height:1.1;color:#fff}
.gf__acc{color:#7be3b4}
.gf__slogan{margin:0 0 14px;font-size:14px;font-weight:600;color:#b4f0d3}
.gf__tag{margin:0 0 24px;max-width:36ch;font-size:14px;line-height:1.7}
.gf__social{display:flex;flex-wrap:wrap;gap:10px;margin:0;padding:0;list-style:none}
.gf__ic{display:grid;place-items:center;width:44px;height:44px;border:1px solid rgba(255,255,255,.22);border-radius:50%;color:#fff;transition:background .15s,color .15s,border-color .15s}
.gf__ic:hover{background:#7be3b4;border-color:#7be3b4;color:#06281d}
.gf .gf__h{margin:0 0 16px;font-family:'Bricolage Grotesque','Plus Jakarta Sans',system-ui,sans-serif;font-size:16px;font-weight:600;letter-spacing:-.01em;color:#fff}
.gf__list{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.gf__link{display:inline-block;padding:3px 0;border:0;background:none;color:inherit;font:inherit;font-size:14px;text-decoration:none;cursor:pointer;transition:color .15s}
.gf__link:hover{color:#fff;text-decoration:underline;text-underline-offset:4px}
.gf__cta{display:inline-flex;align-items:center;justify-content:center;height:46px;margin-top:22px;padding:0 22px;border:0;border-radius:12px;background:#7be3b4;color:#06281d;font:inherit;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 12px 24px -14px rgba(123,227,180,.8);transition:filter .15s}
.gf__cta:hover{filter:brightness(1.06)}
.gf a:focus-visible,.gf button:focus-visible{outline:2px solid #7be3b4;outline-offset:3px;border-radius:8px}
.gf__bar{border-top:1px solid rgba(255,255,255,.14)}
.gf__bar>div{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 24px;max-width:1120px;margin:0 auto;padding:18px 24px calc(22px + env(safe-area-inset-bottom,0px));font-size:13px;color:rgba(255,255,255,.62)}
@media (max-width:760px){
  .gf__inner{grid-template-columns:1fr 1fr;gap:32px 24px;padding:48px 20px 32px}
  .gf__brand{grid-column:1 / -1}
  .gf__bar>div{padding-left:20px;padding-right:20px}
  .gf__map{right:-40%;top:-20%;width:120%}
}
@media (max-width:420px){
  .gf__inner{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){.gf__ic,.gf__link,.gf__cta{transition:none}}
`;

export function SiteFooter({ goTo, openApp }: { goTo: (id: FooterTarget) => void; openApp: () => void }) {
  return (
    <footer className="gf">
      <style>{FOOT_CSS}</style>
      <FooterContours />
      <div className="gf__inner">
        <div className="gf__brand">
          <b className="gf__logo">Peta<span className="gf__acc">kilat</span></b>
          <p className="gf__slogan">Buat Peta Secepat Kilat</p>
          <p className="gf__tag">Ekspor peta wilayah ke PNG atau PDF tanpa watermark.</p>
          <ul className="gf__social" aria-label="Sosial media Petakilat">
            {DAFTAR_SOSMED.map((s) => (
              <li key={s.key}>
                <a className="gf__ic" href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Jelajahi">
          <h3 className="gf__h">Jelajahi</h3>
          <ul className="gf__list">
            <li><button type="button" className="gf__link" onClick={() => goTo('fitur')}>Fitur</button></li>
            <li><button type="button" className="gf__link" onClick={() => goTo('cara-kerja')}>Cara kerja</button></li>
            <li><button type="button" className="gf__link" onClick={() => goTo('harga')}>Harga</button></li>
            <li><button type="button" className="gf__link" onClick={() => goTo('metodologi')}>Metodologi</button></li>
            <li><button type="button" className="gf__link" onClick={() => goTo('faq')}>FAQ</button></li>
          </ul>
        </nav>

        <div>
          <h3 className="gf__h">Bantuan</h3>
          <ul className="gf__list">
            <li><a className="gf__link" href={`https://wa.me/${ADMIN_WA}`} target="_blank" rel="noopener noreferrer">Beli kredit lewat WhatsApp</a></li>
            {SOSMED.email && <li><a className="gf__link" href={`mailto:${SOSMED.email}`}>{SOSMED.email}</a></li>}
          </ul>
          <button type="button" className="gf__cta" onClick={openApp}>Buka aplikasi</button>
        </div>
      </div>

      <div className="gf__bar">
        <div>
          <span>© {new Date().getFullYear()} Petakilat. Semua hak dilindungi.</span>
          <span>Kalibata Project</span>
        </div>
      </div>
    </footer>
  );
}
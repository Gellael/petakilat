import { useState } from 'react';
import { CHECKOUT_URL } from '../constants/config';
import { AVAILABLE_KEYS } from '../constants/basemaps';
import { FEATURES, FEAT_CLASS, FEAT_TONE, STEPS, PLANS, SPECS, FAQS } from '../constants/landing';
import { Icon } from '../components/ui/Icon';
import { HeroSheet } from '../components/home/HeroSheet';
import type { Auth } from '../types';

interface HomePageProps {
  auth: Auth;
  onOpenApp: () => void;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
}

export function HomePage({ auth, onOpenApp, onOpenAuth, onOpenAccount }: HomePageProps) {
  const [navOpen, setNavOpen] = useState<boolean>(false);
  const [navSolid, setNavSolid] = useState<boolean>(false);

  const goTo = (id: string) => {
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openApp = () => {
    setNavOpen(false);
    onOpenApp();
  };

  // Pilih paket: arahkan ke checkout bila sudah ada, kalau belum buka aplikasi
  const choosePlan = (planId: string) => {
    if (CHECKOUT_URL) {
      window.location.href = `${CHECKOUT_URL}?paket=${encodeURIComponent(planId)}`;
      return;
    }
    openApp();
  };

  return (
    <div className="gl-home" onScroll={(e) => setNavSolid(e.currentTarget.scrollTop > 24)}>
      <header className={`gl-nav ${navSolid || navOpen ? 'is-solid' : ''}`}>
        <button type="button" className="gl-brand" onClick={() => document.querySelector('.gl-home')?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="GeoLayout, kembali ke atas">
          <span className="gl-brand__mark"><Icon name="globe" size={20} /></span>
          <span>
            <span className="gl-brand__name" style={{ display: 'block' }}>GeoLayout</span>
            <span className="gl-brand__sub" style={{ display: 'block' }}>Modern WebGIS Cartographic Suite</span>
          </span>
        </button>

        <button type="button" className="gl-iconbtn gl-nav__toggle" onClick={() => setNavOpen((o) => !o)} aria-label={navOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={navOpen}>
          <Icon name={navOpen ? 'x' : 'menu'} size={20} />
        </button>

        <nav className={`gl-nav__links ${navOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
          <button type="button" className="gl-link" onClick={() => goTo('fitur')}>Fitur</button>
          <button type="button" className="gl-link" onClick={() => goTo('cara-kerja')}>Cara kerja</button>
          <button type="button" className="gl-link" onClick={() => goTo('harga')}>Harga</button>
          <button type="button" className="gl-link" onClick={() => goTo('metodologi')}>Metodologi</button>
          <button type="button" className="gl-link" onClick={() => goTo('faq')}>FAQ</button>
          {auth.user ? (
            <button type="button" className="gl-link" onClick={() => onOpenAccount()}>
              {auth.user.nama} · {auth.user.role === 'admin' ? '∞' : auth.user.kredit} kredit
            </button>
          ) : (
            <button type="button" className="gl-link" onClick={() => onOpenAuth()}>Masuk</button>
          )}
          <button type="button" className="gl-btn gl-btn--light" onClick={openApp}>Buka aplikasi</button>
        </nav>
      </header>

      <section className="gl-hero">
        <div className="gl-hero__copy">
          <h1>Susun peta administrasi desa yang siap cetak</h1>
          <p>GeoLayout menyusun lembar peta desa atau kelurahan lengkap dengan judul, arah utara, skala, legenda, dan metadata. Pilih wilayah, atur tampilan, lalu unduh sebagai PNG atau PDF A4.</p>
          <div className="gl-cta">
            <button type="button" className="gl-btn gl-btn--white" onClick={openApp}>Buat peta sekarang</button>
            <button type="button" className="gl-btn gl-btn--outline" onClick={() => goTo('harga')}>Lihat harga</button>
          </div>
          <ul className="gl-hero__facts">
            <li><Icon name="check" size={16} /> Koordinat WGS 84</li>
            <li><Icon name="check" size={16} /> {AVAILABLE_KEYS.length} pilihan peta dasar</li>
            <li><Icon name="check" size={16} /> PNG dan PDF A4</li>
          </ul>
        </div>
        <div className="gl-sheet"><HeroSheet /></div>
      </section>

      <section id="tentang" className="gl-sect">
        <div className="gl-wrap gl-about">
          <div>
            <h2>Tentang GeoLayout</h2>
            <p className="gl-lead">GeoLayout adalah aplikasi web untuk membuat peta administrasi desa dan kelurahan dengan tata letak kartografi, mengikuti gaya lembar peta cetak seperti pada QGIS Print Composer.</p>
            <p className="gl-lead">Seluruh proses berjalan di browser: dari memilih wilayah, mengatur simbologi, menambahkan foto lapangan, sampai mengunduh hasilnya. Proyek S1 Informatika, Universitas Bengkulu.</p>
          </div>
          <dl className="gl-facts">
            <div><dt>Koordinat</dt><dd>Geografis WGS 84</dd></div>
            <div><dt>Peta dasar</dt><dd>{AVAILABLE_KEYS.length} pilihan</dd></div>
            <div><dt>Skala</dt><dd>Otomatis dari zoom peta</dd></div>
            <div><dt>Ekspor</dt><dd>PNG dan PDF A4 lanskap</dd></div>
          </dl>
        </div>
      </section>

      <section id="fitur" className="gl-sect gl-sect--tint">
        <div className="gl-wrap">
          <div className="gl-head">
            <h2>Semua yang dibutuhkan satu lembar peta</h2>
            <p className="gl-lead">Dari pemilihan wilayah sampai berkas siap cetak, tanpa perangkat lunak tambahan.</p>
          </div>
          <div className="gl-bento">
            {FEATURES.map((f, i) => (
              <div className={`gl-tile ${FEAT_CLASS[i]}`} key={f.title}>
                <div className="gl-tile__txt">
                  <span className={`gl-ic gl-ic--${FEAT_TONE[i]}`}><Icon name={f.icon} size={22} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
                {i === 0 && (
                  <div className="gl-cascade" aria-hidden="true">
                    <div><small>Provinsi</small><b>Bengkulu</b></div>
                    <div><small>Kabupaten/kota</small><b>Kota Bengkulu</b></div>
                    <div><small>Desa/kelurahan</small><b>Betungan</b></div>
                  </div>
                )}
                {i === 5 && (
                  <div className="gl-chips" aria-hidden="true"><span>PNG</span><span>PDF A4</span></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="gl-sect">
        <div className="gl-wrap">
          <div className="gl-head">
            <h2>Cara kerja</h2>
            <p className="gl-lead">Empat langkah dari wilayah kosong sampai peta siap cetak.</p>
          </div>
          <ol className="gl-flow">
            {STEPS.map((st, i) => (
              <li key={st.title}>
                <span className="gl-step__n">{i + 1}</span>
                <h3>{st.title}</h3>
                <p>{st.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="harga" className="gl-sect gl-sect--tint">
        <div className="gl-wrap">
          <div className="gl-head">
            <h2>Menyusun gratis, bayar saat mengunduh</h2>
            <p className="gl-lead">Coba editornya dulu. Kredit hanya terpakai ketika Anda mengekspor peta tanpa watermark.</p>
          </div>
          <div className="gl-plans">
            {PLANS.map((pl) => (
              <article className={`gl-plan ${pl.hi ? 'gl-plan--hi' : ''}`} key={pl.id}>
                <h3>{pl.name}</h3>
                <div className="gl-plan__price">{pl.price} <span className="gl-plan__unit">{pl.unit}</span></div>
                <p className="gl-plan__blurb">{pl.blurb}</p>
                <ul>
                  {pl.feats.map((ft) => (<li key={ft}><Icon name="check" size={16} /> <span>{ft}</span></li>))}
                </ul>
                {pl.packs.length > 0 && (
                  <div className="gl-packs">
                    {pl.packs.map((pk) => (<div key={pk.n}><span>{pk.n}</span><b>{pk.p}</b></div>))}
                  </div>
                )}
                <button type="button" className={`gl-btn ${pl.hi ? 'gl-btn--white' : 'gl-btn--primary'}`} onClick={() => choosePlan(pl.id)}>{pl.cta}</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="metodologi" className="gl-sect">
        <div className="gl-wrap">
          <div className="gl-head">
            <h2>Data dan metodologi</h2>
            <p className="gl-lead">Dari mana data berasal dan bagaimana hasilnya dihitung.</p>
          </div>
          <dl className="gl-spec">
            {SPECS.map((sp) => (
              <div key={sp.k}><dt>{sp.k}</dt><dd>{sp.v}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="faq" className="gl-sect gl-sect--tint">
        <div className="gl-wrap">
          <div className="gl-head"><h2>Pertanyaan yang sering diajukan</h2></div>
          <div className="gl-faq">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="gl-foot">
        <div>
          <b>GeoLayout</b>
          <span>Informatika, Universitas Bengkulu</span>
        </div>
        <div className="gl-foot__links">
          <button type="button" className="gl-link" onClick={() => goTo('fitur')}>Fitur</button>
          <button type="button" className="gl-link" onClick={() => goTo('harga')}>Harga</button>
          <button type="button" className="gl-link" onClick={() => goTo('faq')}>FAQ</button>
        </div>
        <button type="button" className="gl-btn gl-btn--light" onClick={openApp}>Buka aplikasi</button>
      </footer>
    </div>
  );
}

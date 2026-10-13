export const APP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&display=swap');

.gl-root{
  --ink:#0f1b2d; --ink-2:#334155; --muted:#64748b; --line:#dde4ea; --line-2:#eef2f5;
  --paper:#f3f6f8; --surface:#ffffff; --brand:#0e7490; --brand-d:#155e75; --brand-soft:#e0f4f8;
  --sea:#0b3445; --danger:#dc2626; --danger-soft:#fee2e2;
  --shadow:0 1px 2px rgba(15,27,45,.06),0 10px 28px rgba(15,27,45,.12);
  position:fixed; inset:0; overflow:hidden; color:var(--ink); background:var(--paper);
  font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif; -webkit-font-smoothing:antialiased;
}
.gl-root *,.gl-root *::before,.gl-root *::after{box-sizing:border-box}
.gl-root button{font-family:inherit}
.gl-root :focus-visible{outline:2px solid var(--brand); outline-offset:2px}
@media (prefers-reduced-motion:reduce){
  .gl-root *{transition:none!important; animation:none!important; scroll-behavior:auto!important}
}

/* ---------- tombol ---------- */
.gl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,transform .1s;white-space:nowrap}
.gl-btn:hover{background:var(--line-2)}
.gl-btn:active{transform:translateY(1px)}
.gl-btn:disabled{opacity:.55;cursor:not-allowed}
.gl-btn--primary{background:var(--brand);border-color:var(--brand);color:#fff}
.gl-btn--primary:hover{background:var(--brand-d)}
.gl-btn--dark{background:var(--ink);border-color:var(--ink);color:#fff}
.gl-btn--dark:hover{background:#1e2c44}
.gl-btn--danger{background:var(--danger-soft);border-color:#fecaca;color:#b91c1c}
.gl-btn--danger:hover{background:#fecaca}
.gl-btn--block{width:100%}
.gl-btn--sm{height:32px;padding:0 10px;font-size:12px;border-radius:8px}
.gl-iconbtn{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer;flex-shrink:0;transition:background .15s}
.gl-iconbtn:hover{background:var(--line-2)}
.gl-iconbtn--danger:hover{background:var(--danger-soft);color:var(--danger);border-color:#fecaca}

/* ---------- aplikasi pembuat peta ---------- */
.gl-app{position:absolute;inset:0;display:flex}
.gl-side{width:392px;flex-shrink:0;display:flex;flex-direction:column;min-height:0;background:var(--surface);border-right:1px solid var(--line);z-index:30}
.gl-side__head{display:flex;align-items:center;gap:12px;padding:14px 14px 12px;border-bottom:1px solid var(--line)}
.gl-side__titles{flex:1;min-width:0}
.gl-side__title{font-family:Poppins,Inter,sans-serif;font-size:15px;font-weight:600;line-height:1.2}
.gl-side__sub{font-size:12px;color:var(--muted);margin-top:2px}
.gl-side__close{display:none}
.gl-side__body{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--paper);scrollbar-width:thin}
.gl-side__foot{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;border-top:1px solid var(--line);background:var(--surface)}

.gl-sec{background:var(--surface);border:1px solid var(--line);border-radius:14px;flex-shrink:0}
.gl-sec__head{width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;background:none;border:0;border-radius:14px;cursor:pointer;text-align:left;color:var(--ink)}
.gl-sec__step{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--brand-soft);color:var(--brand-d);font-size:12px;font-weight:700;flex-shrink:0}
.gl-sec__title{flex:1;font-size:14px;font-weight:600}
.gl-sec__chev{display:grid;color:var(--muted);transition:transform .2s}
.gl-sec.is-open .gl-sec__chev{transform:rotate(180deg)}
.gl-sec__body{display:flex;flex-direction:column;gap:14px;padding:2px 14px 14px}

.gl-field{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0}
.gl-label{font-size:12px;font-weight:600;color:var(--ink-2)}
.gl-label--row{display:flex;justify-content:space-between;gap:8px}
.gl-label--row b{font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}
.gl-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.gl-divider{height:1px;background:var(--line-2)}
.gl-input,.gl-textarea,.gl-select{width:100%;min-height:38px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px;transition:border-color .15s,box-shadow .15s}
.gl-input:focus,.gl-textarea:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(14,116,144,.18)}
.gl-textarea{min-height:68px;resize:vertical;line-height:1.4}
.gl-select{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;text-align:left}
.gl-select.is-open{border-color:var(--brand);box-shadow:0 0 0 3px rgba(14,116,144,.18)}
.gl-select:disabled{background:var(--paper);color:#94a3b8;cursor:not-allowed}
.gl-select__val{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-select__ph{color:#8493a6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-pop{position:absolute;left:0;right:0;top:100%;z-index:60;margin-top:4px;padding:6px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
.gl-pop__search{display:flex;align-items:center;gap:8px;padding:0 8px;margin-bottom:4px;border:1px solid var(--line);border-radius:8px;color:var(--muted)}
.gl-pop__search input{flex:1;min-width:0;height:34px;border:0;outline:0;background:none;font:inherit;font-size:13px;color:var(--ink)}
.gl-pop__list{max-height:220px;overflow-y:auto}
.gl-pop__item{display:block;width:100%;padding:8px 10px;border:0;border-radius:8px;background:none;font-size:13px;text-align:left;color:var(--ink);cursor:pointer}
.gl-pop__item:hover{background:var(--line-2)}
.gl-pop__item.is-on{background:var(--brand-soft);color:var(--brand-d);font-weight:600}
.gl-pop__item--clear{color:var(--muted);font-size:12px}
.gl-pop__empty{padding:10px;font-size:12px;color:var(--muted)}

.gl-basemaps{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gl-basemap{display:flex;flex-direction:column;gap:7px;padding:6px 6px 8px;border:1px solid var(--line);border-radius:12px;background:#fff;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.gl-basemap:hover{border-color:#b7c4d0}
.gl-basemap.is-on{border-color:var(--brand);box-shadow:0 0 0 2px rgba(14,116,144,.25)}
.gl-basemap__thumb{height:46px;border-radius:8px;border:1px solid rgba(15,27,45,.08)}
.gl-basemap__name{padding:0 4px;font-size:12px;font-weight:600;line-height:1.25;color:var(--ink)}
.gl-basemap__desc{padding:0 4px;margin-top:-4px;font-size:11px;line-height:1.3;color:var(--muted)}

.gl-bmgroup{display:flex;flex-direction:column;gap:8px}
.gl-subhead{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.gl-chips{display:flex;flex-wrap:wrap;gap:6px}
.gl-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 11px 5px 6px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink-2);font-size:12px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s}
.gl-chip:hover{border-color:#b7c4d0}
.gl-chip.is-on{border-color:var(--brand);background:var(--brand-soft);color:var(--brand-d);font-weight:600}
.gl-chip__dot{width:16px;height:16px;border-radius:50%;border:1px solid rgba(15,27,45,.15);flex-shrink:0}
.gl-legrow{display:flex;align-items:center;gap:8px}
.gl-legrow__sym{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:#fff;flex-shrink:0}
.gl-legrow__up{height:36px;padding:0 12px;font-size:12px}
.gl-color{position:relative;display:flex;align-items:center;gap:8px;height:38px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:#fff;cursor:pointer}
.gl-color input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.gl-color__sw{width:20px;height:20px;border-radius:6px;border:1px solid rgba(15,27,45,.2);flex-shrink:0}
.gl-color code{font:500 12px ui-monospace,Menlo,Consolas,monospace;color:var(--ink-2)}
.gl-range{width:100%;accent-color:var(--brand)}

.gl-toggle{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:var(--ink-2);cursor:pointer}
.gl-toggle input{position:absolute;opacity:0;width:1px;height:1px}
.gl-toggle i{position:relative;flex-shrink:0;width:36px;height:20px;border-radius:999px;background:#cbd5e1;transition:background .15s}
.gl-toggle i::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s}
.gl-toggle input:checked + i{background:var(--brand)}
.gl-toggle input:checked + i::after{transform:translateX(16px)}
.gl-toggle input:focus-visible + i{outline:2px solid var(--brand);outline-offset:2px}

.gl-note{padding:9px 11px;border-radius:10px;background:var(--paper);font-size:12px;line-height:1.5;color:var(--muted)}
.gl-note--warn{background:#fff6dc;color:#7a5200}
.gl-note--err{background:var(--danger-soft);color:#991b1b;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.gl-badge{padding:2px 9px;border-radius:999px;background:var(--brand-soft);color:var(--brand-d);font-size:11px;font-weight:600}

.gl-aoi-list{display:flex;flex-direction:column;gap:8px}
.gl-aoi{border:1px solid var(--line);border-radius:12px;background:#fff}
.gl-aoi.is-open{border-color:var(--brand);box-shadow:0 0 0 2px rgba(14,116,144,.12)}
.gl-aoi__head{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 6px}
.gl-aoi__toggle{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:2px;border:0;background:none;text-align:left;cursor:pointer;color:var(--ink);border-radius:8px}
.gl-aoi__chip{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;font-size:15px;flex-shrink:0;color:#fff}
.gl-aoi__name{flex:1;min-width:0;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-aoi__body{display:flex;flex-direction:column;gap:14px;padding:12px;border-top:1px solid var(--line-2)}
.gl-icons{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.gl-icons button{display:grid;place-items:center;aspect-ratio:1;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:18px;cursor:pointer;transition:background .15s}
.gl-icons button:hover{background:var(--line-2)}
.gl-icons button.is-on{border-width:2px}
.gl-coords{padding:7px 10px;border-radius:8px;background:var(--paper);font:500 12px ui-monospace,Menlo,Consolas,monospace;color:var(--ink-2)}
.gl-upload{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:92px;padding:12px;border:1.5px dashed #a9cfda;border-radius:12px;background:#f3fafc;color:var(--brand-d);font-size:12px;font-weight:600;text-align:center;cursor:pointer}
.gl-upload:hover{background:#e7f5f9}
.gl-upload input{display:none}
.gl-cardprev{position:relative;border-radius:10px;padding:3px;width:168px;max-width:100%;box-shadow:0 4px 12px rgba(15,27,45,.2)}
.gl-cardprev img{display:block;width:100%;height:96px;object-fit:cover;border-radius:7px 7px 0 0}
.gl-cardprev__cap{padding:6px 8px;background:#fff;color:#0f172a;font-size:10px;line-height:1.4;font-weight:500;text-align:center;white-space:pre-wrap;word-break:break-word;border-radius:0 0 7px 7px}
.gl-cardprev__cap--solo{border-radius:7px}
.gl-cardprev__x{position:absolute;top:8px;right:8px;width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:6px;background:rgba(15,27,45,.72);color:#fff;cursor:pointer}
.gl-cardprev__x:hover{background:var(--danger)}

/* ---------- area peta ---------- */
.gl-stage{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--paper)}
.gl-toolbar{display:flex;align-items:center;gap:12px;min-height:58px;padding:8px 16px;background:var(--surface);border-bottom:1px solid var(--line)}
.gl-toolbar__text{flex:1;min-width:0}
.gl-toolbar__title{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-toolbar__sub{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-toolbar__chips{display:flex;gap:8px}
.gl-chip{display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:var(--paper);font-size:12px;font-weight:500;color:var(--ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.gl-menu-btn{display:none}
.gl-paper{flex:1;min-height:0;overflow:auto;display:grid;place-items:center;padding:20px;background-color:#e8edf1;background-image:radial-gradient(#cdd6de 1px,transparent 1px);background-size:18px 18px}
.gl-backdrop{display:none}

@media (max-width:900px){
  .gl-side{position:fixed;top:0;bottom:0;left:0;width:min(420px,92vw);visibility:hidden;transform:translateX(-102%);transition:transform .25s ease,visibility .25s;box-shadow:var(--shadow)}
  .gl-side.is-open{visibility:visible;transform:none}
  .gl-side__close{display:inline-grid}
  .gl-backdrop{display:block;position:fixed;inset:0;z-index:25;background:rgba(15,27,45,.45)}
  .gl-menu-btn{display:inline-flex}
  .gl-toolbar__chips .gl-chip:last-child{display:none}
  .gl-paper{padding:12px}
}

/* ---------- halaman utama ---------- */
.gl-home{
  --h-ink:#0a1c28; --h-sea:#0c3447; --h-sea2:#124a5e; --h-teal:#0e7490; --h-aqua:#4cc9e0;
  --h-paper:#f3f6f8; --h-line:#d9e2e8; --h-text:#17303f; --h-mute:#586d7c; --h-red:#dc2626; --h-green:#2f9e6b;
  position:absolute;inset:0;overflow-x:hidden;overflow-y:auto;background:#fff;color:var(--h-text);scroll-behavior:smooth
}
.gl-home h1,.gl-home h2,.gl-home h3,.gl-brand__name{font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif}
.gl-nav{position:sticky;top:0;z-index:40;height:72px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 clamp(16px,5vw,64px);color:#fff;transition:background .2s,box-shadow .2s}
.gl-nav.is-solid{background:rgba(8,26,38,.94);backdrop-filter:blur(10px);box-shadow:0 1px 0 rgba(255,255,255,.08)}
.gl-brand{display:flex;align-items:center;gap:10px;padding:0;border:0;background:none;color:inherit;text-align:left;cursor:pointer}
.gl-brand__mark{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#4cc9e0,#0e7490);color:#fff}
.gl-brand__name{font-size:18px;font-weight:700;line-height:1.1;letter-spacing:-.01em}
.gl-brand__sub{margin-top:2px;font-size:11px;opacity:.72}
.gl-nav__links{display:flex;align-items:center;gap:28px}
.gl-link{padding:6px 0;border:0;border-bottom:2px solid transparent;background:none;color:inherit;font:inherit;font-size:15px;font-weight:500;cursor:pointer;opacity:.9}
.gl-link:hover{border-bottom-color:var(--h-aqua);opacity:1}
.gl-btn--light{height:40px;border:1px solid rgba(255,255,255,.7);background:transparent;color:#fff}
.gl-btn--light:hover{background:#fff;color:var(--h-ink)}
.gl-btn--white{background:#fff;border-color:#fff;color:var(--h-ink)}
.gl-btn--white:hover{background:#e3f4f8}
.gl-btn--outline{background:transparent;border-color:rgba(255,255,255,.5);color:#fff}
.gl-btn--outline:hover{background:rgba(255,255,255,.1)}
.gl-nav__toggle{display:none;border-color:rgba(255,255,255,.4);background:transparent;color:#fff}
.gl-nav__toggle:hover{background:rgba(255,255,255,.12)}

.gl-hero{position:relative;margin-top:-72px;min-height:100vh;min-height:100svh;padding:112px clamp(16px,5vw,64px) 56px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.12fr);gap:clamp(28px,5vw,72px);align-items:center;color:#fff;
  background:
    linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px) 0 0/64px 64px,
    linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px) 0 0/64px 64px,
    radial-gradient(60% 70% at 85% 40%,rgba(76,201,224,.2),transparent 70%),
    linear-gradient(rgba(8,26,38,.88),rgba(8,26,38,.88)),
    url('/hero.jpg') center/cover no-repeat,
    linear-gradient(160deg,#081a26 0%,#0c3447 60%,#0f4558 100%)}
.gl-hero__copy{max-width:560px}
.gl-hero h1{margin:0 0 18px;font-size:clamp(34px,4.6vw,58px);font-weight:700;line-height:1.06;letter-spacing:-.02em}
.gl-hero p{margin:0;max-width:50ch;font-size:clamp(16px,1.5vw,18px);line-height:1.6;color:rgba(255,255,255,.84)}
.gl-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.gl-cta .gl-btn{height:48px;padding:0 22px;font-size:15px;border-radius:12px}
.gl-hero__facts{display:flex;flex-wrap:wrap;gap:10px 26px;margin:34px 0 0;padding:0;list-style:none;font-size:14px;color:rgba(255,255,255,.78)}
.gl-hero__facts li{display:inline-flex;align-items:center;gap:8px}
.gl-hero__facts svg{color:var(--h-aqua)}
.gl-sheet{width:100%;max-width:660px;justify-self:end;border-radius:6px;background:#fff;box-shadow:0 30px 70px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.14);overflow:hidden}
.gl-sheet svg{display:block;width:100%;height:auto}
@keyframes gl-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes gl-fillin{from{opacity:0}to{opacity:1}}
.gl-draw{stroke-dasharray:1;stroke-dashoffset:0;animation:gl-draw 1.8s .4s cubic-bezier(.4,0,.2,1) both}
.gl-fillin{animation:gl-fillin .9s 1.5s ease both}

.gl-sect{scroll-margin-top:72px;padding:clamp(56px,8vw,104px) clamp(16px,5vw,64px)}
.gl-sect--tint{background:var(--h-paper)}
.gl-wrap{max-width:1120px;margin:0 auto}
.gl-sect h2{margin:0 0 14px;font-size:clamp(28px,3.4vw,42px);font-weight:700;line-height:1.1;letter-spacing:-.02em;color:var(--h-ink)}
.gl-head{max-width:640px;margin-bottom:36px}
.gl-lead{max-width:62ch;margin:0 0 14px;font-size:17px;line-height:1.65;color:var(--h-mute)}
.gl-head .gl-lead{margin-bottom:0}
.gl-about{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(28px,6vw,80px);align-items:start}
.gl-facts{margin:0;padding:0}
.gl-facts div{display:flex;justify-content:space-between;gap:16px;padding:15px 0;border-top:1px solid var(--h-line)}
.gl-facts div:last-child{border-bottom:1px solid var(--h-line)}
.gl-facts dt{color:var(--h-mute);font-size:15px}
.gl-facts dd{margin:0;font-size:15px;font-weight:600;text-align:right;color:var(--h-ink)}

.gl-bento{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.gl-tile{grid-column:span 2;display:flex;flex-direction:column;gap:6px;padding:26px;border:1px solid var(--h-line);border-radius:18px;background:#fff}
.gl-tile--w4{grid-column:span 4}
.gl-tile--w6{grid-column:span 6}
.gl-tile--split{flex-direction:row;align-items:center;justify-content:space-between;gap:28px}
.gl-tile--dark{background:var(--h-sea);border-color:var(--h-sea);color:#fff}
.gl-tile--tint{background:#e6f4f8;border-color:#cde6ed}
.gl-tile__txt{max-width:46ch}
.gl-tile h3{margin:0 0 6px;font-size:19px;font-weight:700;letter-spacing:-.01em;color:var(--h-ink)}
.gl-tile--dark h3{color:#fff}
.gl-tile p{margin:0;font-size:15px;line-height:1.6;color:var(--h-mute)}
.gl-tile--dark p{color:rgba(255,255,255,.8)}
.gl-ic{display:inline-grid;place-items:center;width:42px;height:42px;margin-bottom:12px;border-radius:12px}
.gl-ic--red{background:#fde8e8;color:#b91c1c}
.gl-ic--teal{background:#d9f1f6;color:#0b5f74}
.gl-ic--blue{background:#e1ecf8;color:#1d4f91}
.gl-ic--green{background:#dcf3e7;color:#17714a}
.gl-ic--ink{background:#dde6ec;color:var(--h-ink)}
.gl-tile--dark .gl-ic{background:rgba(255,255,255,.12);color:#fff}
.gl-cascade{display:flex;flex-direction:column;gap:8px;min-width:200px}
.gl-cascade div{display:flex;flex-direction:column;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,.08);border-left:3px solid rgba(255,255,255,.25)}
.gl-cascade div:last-child{background:rgba(255,255,255,.16);border-left-color:#ef4444}
.gl-cascade small{font-size:11px;color:rgba(255,255,255,.62)}
.gl-cascade b{font-size:14px;font-weight:600}
.gl-chips{display:flex;gap:10px}
.gl-chips span{display:inline-flex;align-items:center;height:40px;padding:0 18px;border-radius:10px;background:#fff;border:1px solid #bfdde6;font-size:14px;font-weight:700;color:var(--h-ink)}

.gl-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;margin:0;padding:0;list-style:none}
.gl-flow li{position:relative;padding-top:46px}
.gl-flow li::before{content:'';position:absolute;top:14px;left:38px;right:-14px;height:2px;background:repeating-linear-gradient(90deg,var(--h-teal) 0 6px,transparent 6px 11px)}
.gl-flow li:last-child::before{display:none}
.gl-step__n{position:absolute;top:0;left:0;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--h-teal);color:#fff;font-size:14px;font-weight:700}
.gl-flow h3{margin:0 0 6px;font-size:18px;font-weight:700;color:var(--h-ink)}
.gl-flow p{margin:0;font-size:15px;line-height:1.6;color:var(--h-mute)}

.gl-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch}
.gl-plan{display:flex;flex-direction:column;gap:14px;padding:28px;border:1px solid var(--h-line);border-radius:18px;background:#fff}
.gl-plan--hi{background:var(--h-sea);border-color:var(--h-sea);color:#fff;box-shadow:0 24px 50px rgba(12,52,71,.28)}
.gl-plan h3{margin:0;font-size:18px;font-weight:700;color:var(--h-ink)}
.gl-plan--hi h3{color:#fff}
.gl-plan__price{font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:1.1;color:var(--h-ink)}
.gl-plan--hi .gl-plan__price{color:#fff}
.gl-plan__unit{font-size:14px;font-weight:500;color:var(--h-mute);font-family:Inter,system-ui,sans-serif;letter-spacing:0}
.gl-plan--hi .gl-plan__unit{color:rgba(255,255,255,.7)}
.gl-plan__blurb{margin:0;font-size:15px;line-height:1.55;color:var(--h-mute)}
.gl-plan--hi .gl-plan__blurb{color:rgba(255,255,255,.8)}
.gl-plan ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;font-size:15px}
.gl-plan li{display:flex;gap:10px;align-items:flex-start;line-height:1.45}
.gl-plan li svg{flex-shrink:0;margin-top:2px;color:var(--h-green)}
.gl-plan--hi li svg{color:var(--h-aqua)}
.gl-packs{display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.18)}
.gl-packs div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.18);font-size:14px}
.gl-packs b{font-weight:600}
.gl-plan .gl-btn{margin-top:auto;height:46px;border-radius:12px}

.gl-faq{max-width:780px}
.gl-faq details{padding:18px 0;border-top:1px solid var(--h-line)}
.gl-faq details:last-child{border-bottom:1px solid var(--h-line)}
.gl-faq summary{display:flex;justify-content:space-between;gap:16px;font-size:17px;font-weight:600;color:var(--h-ink);cursor:pointer;list-style:none}
.gl-faq summary::-webkit-details-marker{display:none}
.gl-faq summary::after{content:'+';color:var(--h-teal);font-size:22px;line-height:1}
.gl-faq details[open] summary::after{content:'\\2212'}
.gl-faq details p{margin:10px 0 0;max-width:62ch;font-size:15px;line-height:1.65;color:var(--h-mute)}
.gl-spec{margin:0;padding:0}
.gl-spec div{display:grid;grid-template-columns:220px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--h-line)}
.gl-spec div:last-child{border-bottom:1px solid var(--h-line)}
.gl-spec dt{font-size:15px;font-weight:600;color:var(--h-ink)}
.gl-spec dd{margin:0;font-size:15px;line-height:1.6;color:var(--h-mute)}

.gl-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;padding:40px clamp(16px,5vw,64px);background:#081a26;color:#bcd3dc}
.gl-foot b{display:block;color:#fff;font-family:'Bricolage Grotesque',Poppins,Inter,sans-serif;font-weight:700;font-size:18px}
.gl-foot span{font-size:14px}
.gl-foot__links{display:flex;flex-wrap:wrap;gap:6px 22px}
.gl-foot__links .gl-link{font-size:14px;color:#bcd3dc}

@media (max-width:1000px){
  .gl-hero{grid-template-columns:1fr;min-height:0;padding-top:104px}
  .gl-sheet{justify-self:stretch;max-width:none}
  .gl-bento{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gl-tile,.gl-tile--w4,.gl-tile--w6{grid-column:span 1}
  .gl-tile--w4,.gl-tile--w6{grid-column:span 2}
  .gl-flow{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gl-flow li::before{display:none}
}
@media (max-width:860px){
  .gl-nav__toggle{display:inline-grid}
  .gl-nav__links{display:none;position:absolute;top:72px;left:12px;right:12px;flex-direction:column;align-items:stretch;gap:0;padding:8px;border-radius:14px;background:rgba(8,26,38,.97);box-shadow:var(--shadow)}
  .gl-nav__links.is-open{display:flex}
  .gl-nav__links .gl-link{padding:13px 14px;border:0;text-align:left}
  .gl-nav__links .gl-btn--light{margin:6px}
  .gl-about{grid-template-columns:1fr}
  .gl-plans{grid-template-columns:1fr}
  .gl-spec div{grid-template-columns:1fr;gap:4px}
}
@media (max-width:600px){
  .gl-bento{grid-template-columns:1fr}
  .gl-tile,.gl-tile--w4,.gl-tile--w6{grid-column:span 1}
  .gl-tile--split{flex-direction:column;align-items:stretch}
  .gl-flow{grid-template-columns:1fr}
  .gl-cta .gl-btn{flex:1 1 100%}
  .gl-side__foot{grid-template-columns:1fr}
}
`;

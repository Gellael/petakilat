import { SHEET_FONT, SHEET_SANS, SHEET_MONO } from '../../constants/sheet';

// Ilustrasi lembar peta untuk hero (meniru tata letak hasil ekspor)
export const HeroSheet = () => (
  <svg viewBox="0 0 560 380" role="img" aria-label="Contoh lembar peta administrasi Desa Betungan dengan batas desa berwarna merah, legenda, skala, dan peta inset" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="glmapclip"><rect x="10" y="24" width="380" height="332" /></clipPath>
      <pattern id="glroads" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0H14M0 0V14" stroke="#e8eef0" strokeOpacity=".28" strokeWidth=".6" fill="none" /></pattern>
      <linearGradient id="glsun" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6b26b" /><stop offset=".45" stopColor="#e98a5b" /><stop offset=".46" stopColor="#5f8fb0" /><stop offset="1" stopColor="#2c4f6e" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="556" height="376" fill="#fff" stroke="#0a1c28" strokeWidth="2" />
    <line x1="394" y1="2" x2="394" y2="378" stroke="#0a1c28" strokeWidth="2" />

    {/* jendela peta */}
    <rect x="10" y="10" width="380" height="360" fill="#fff" stroke="#000" strokeWidth="1.2" />
    <rect x="10" y="10" width="380" height="14" fill="#f1f5f9" stroke="#000" strokeWidth=".8" />
    <rect x="10" y="356" width="380" height="14" fill="#f1f5f9" stroke="#000" strokeWidth=".8" />
    <g fontFamily={SHEET_MONO} fontSize="6.5" fontWeight="bold" fill="#1e293b">
      <text x="18" y="20">{'102° 19\' 20" BT'}</text>
      <text x="200" y="20" textAnchor="middle">GRID GEOGRAFIS WGS 84</text>
      <text x="382" y="20" textAnchor="end">{'102° 22\' 36" BT'}</text>
      <text x="18" y="366">{'102° 19\' 20" BT'}</text>
      <text x="200" y="366" textAnchor="middle">{'Titik Pusat: 102° 20\' 58" BT, 3° 52\' 13" LS'}</text>
      <text x="382" y="366" textAnchor="end">{'102° 22\' 36" BT'}</text>
    </g>

    <g clipPath="url(#glmapclip)">
      <rect x="10" y="24" width="380" height="332" fill="#243f38" />
      <ellipse cx="70" cy="90" rx="90" ry="50" fill="#2f5a43" opacity=".8" />
      <ellipse cx="340" cy="320" rx="110" ry="60" fill="#33604a" opacity=".85" />
      <ellipse cx="330" cy="70" rx="70" ry="40" fill="#3b6b4e" opacity=".6" />
      <rect x="30" y="250" width="140" height="100" fill="#6b6f6a" opacity=".5" />
      <rect x="30" y="250" width="140" height="100" fill="url(#glroads)" />
      <path d="M10 300 C90 280 130 230 190 250 S300 330 390 290" stroke="#6fbfdc" strokeWidth="5" fill="none" opacity=".8" />
      <g fill="rgba(255,255,255,.05)" stroke="#d5dee5" strokeWidth="1" strokeDasharray="4 3">
        <polygon points="20,60 110,40 150,95 100,150 30,140" />
        <polygon points="300,40 385,50 385,150 330,130" />
        <polygon points="30,260 100,250 140,300 120,350 25,350" />
        <polygon points="290,260 385,240 385,350 270,350" />
      </g>
      <polygon className="gl-fillin" points="125,105 205,72 285,92 335,150 325,230 275,292 200,312 140,272 98,200" fill="rgba(76,201,224,.34)" />
      <polygon className="gl-draw" pathLength={1} points="125,105 205,72 285,92 335,150 325,230 275,292 200,312 140,272 98,200" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="172" y="184" width="76" height="18" rx="9" fill="#fff" />
      <text x="210" y="196.5" textAnchor="middle" fontFamily={SHEET_SANS} fontSize="8" fontWeight="bold" fill="#0f172a" letterSpacing=".5">BETUNGAN</text>
      <line x1="64" y1="96" x2="140" y2="150" stroke="#2f9e6b" strokeWidth="1.4" strokeDasharray="4 3" />
      <circle cx="140" cy="150" r="7" fill="#0e7490" stroke="#fff" strokeWidth="2" />
      <rect x="26" y="34" width="76" height="62" rx="4" fill="#2f9e6b" />
      <rect x="29" y="37" width="70" height="40" fill="url(#glsun)" />
      <rect x="29" y="77" width="70" height="16" fill="#fff" />
      <text x="64" y="88.5" textAnchor="middle" fontFamily={SHEET_SANS} fontSize="6.5" fontWeight="bold" fill="#0f172a">AOI 1</text>
      <rect x="14" y="336" width="60" height="14" fill="#fff" fillOpacity=".85" stroke="#000" strokeWidth=".6" />
      <text x="18" y="346" fontFamily={SHEET_MONO} fontSize="6" fontWeight="bold" fill="#0f172a">500 m</text>
    </g>

    {/* kolom informasi */}
    <g fontFamily={SHEET_FONT} fill="#000">
      <rect x="404" y="16" width="140" height="50" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="474" y="29" textAnchor="middle" fontSize="6.6" fontWeight="bold">PETA ADMINISTRASI DESA</text>
      <text x="474" y="46" textAnchor="middle" fontSize="11" fontWeight="bold">BETUNGAN</text>
      <line x1="410" y1="50" x2="538" y2="50" stroke="#000" strokeWidth="1" />
      <text x="474" y="59" textAnchor="middle" fontSize="4.3" fill="#333">KECAMATAN SELEBAR - KABUPATEN KOTA BENGKULU</text>

      <rect x="404" y="72" width="38" height="46" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="423" y="82" textAnchor="middle" fontSize="5" fontWeight="bold">UTARA</text>
      <circle cx="423" cy="101" r="12" fill="none" stroke="#000" strokeWidth="1" />
      <polygon points="423,90 420,101 423,99" fill="#000" /><polygon points="423,90 426,101 423,99" fill="#fff" stroke="#000" strokeWidth=".5" />
      <polygon points="423,112 426,101 423,103" fill="#000" /><polygon points="423,112 420,101 423,103" fill="#fff" stroke="#000" strokeWidth=".5" />

      <rect x="448" y="72" width="96" height="46" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="496" y="82" textAnchor="middle" fontSize="5" fontWeight="bold">SKALA PETA</text>
      <text x="496" y="94" textAnchor="middle" fontSize="7" fontWeight="bold" fontFamily={SHEET_MONO}>1 : 63.179</text>
      <rect x="462" y="99" width="68" height="3.5" fill="#fff" stroke="#000" strokeWidth=".7" />
      <rect x="462" y="99" width="17" height="3.5" fill="#000" /><rect x="496" y="99" width="17" height="3.5" fill="#000" />
      <g fontFamily={SHEET_SANS} fontSize="4.5" fontWeight="bold">
        <text x="462" y="110">0</text><text x="496" y="110" textAnchor="middle">2 km</text><text x="530" y="110" textAnchor="end">4 km</text>
      </g>

      <rect x="404" y="124" width="140" height="94" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="474" y="135" textAnchor="middle" fontSize="6" fontWeight="bold">LEGENDA</text>
      <line x1="410" y1="138" x2="538" y2="138" stroke="#ccc" strokeWidth=".8" />
      <g fontFamily={SHEET_SANS} fontSize="5.6">
        <rect x="410" y="145" width="14" height="9" fill="#4cc9e0" fillOpacity=".6" stroke="#dc2626" strokeWidth="1.5" />
        <text x="430" y="152.5" fontWeight="bold">Batas Desa Betungan</text>
        <rect x="410" y="161" width="14" height="9" fill="rgba(100,116,139,.1)" stroke="#475569" strokeWidth="1" strokeDasharray="2 1.5" />
        <text x="430" y="168.5" fill="#334155">Batas Desa Sekitar</text>
        <circle cx="417" cy="181" r="5" fill="#0e7490" stroke="#000" strokeWidth=".8" />
        <text x="430" y="183" fill="#334155">AOI 1</text>
        <text x="410" y="203" fontSize="4.6" fill="#64748b">Peta Dasar: Citra Satelit</text>
      </g>

      <rect x="404" y="224" width="140" height="66" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <text x="474" y="235" textAnchor="middle" fontSize="5.2" fontWeight="bold">KETERANGAN &amp; METADATA</text>
      <g fontFamily={SHEET_SANS} fontSize="5">
        <text x="410" y="248" fill="#64748b">Wilayah:</text><text x="452" y="248" fontWeight="bold">Betungan</text>
        <text x="410" y="257" fill="#64748b">Luas Est.:</text><text x="452" y="257">10,89 km²</text>
        <text x="410" y="266" fill="#64748b">Proyeksi:</text><text x="452" y="266">Geografis (WGS 84)</text>
        <text x="410" y="275" fill="#64748b">Sumber:</text><text x="452" y="275">BIG &amp; WebGIS PostGIS</text>
      </g>

      <rect x="404" y="296" width="140" height="68" fill="#eef2f5" stroke="#000" strokeWidth="1.2" />
      <g fill="#fff" stroke="#94a3b8" strokeWidth=".8">
        <polygon points="410,302 450,300 462,330 430,358 410,350" />
        <polygon points="450,300 500,304 504,340 462,330" />
        <polygon points="500,304 538,302 538,352 504,340" />
        <polygon points="430,358 462,330 504,340 490,360" />
      </g>
      <polygon points="466,318 484,314 496,328 488,344 470,346 460,332" fill="#7dd3e8" stroke="#dc2626" strokeWidth="1.6" />
    </g>
  </svg>
);

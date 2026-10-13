export const FEATURES = [
  { icon: 'pin', title: 'Wilayah bertingkat', text: 'Pilih provinsi, kabupaten/kota, lalu desa atau kelurahan. Batas desa di sekitarnya ikut tampil sebagai konteks.' },
  { icon: 'file', title: 'Lembar peta otomatis', text: 'Judul, arah utara, skala, legenda, dan metadata tersusun mengikuti wilayah yang Anda pilih.' },
  { icon: 'layers', title: 'Banyak peta dasar', text: 'Citra satelit, peta terang, mode gelap, jalan, dan topografi. Carto tersedia bila API key gratisnya diisi.' },
  { icon: 'image', title: 'Titik AOI dan foto', text: 'Tandai lokasi, tempel foto lapangan dengan keterangannya, lalu hubungkan dengan garis penunjuk yang bisa digeser.' },
  { icon: 'compass', title: 'Peta inset', text: 'Inset menunjukkan letak desa terhadap wilayah sekitarnya, dengan peta dasar yang bisa dipilih sendiri.' },
  { icon: 'download', title: 'Ekspor siap cetak', text: 'Unduh PNG resolusi tinggi atau PDF A4 lanskap langsung dari lembar peta.' }
];
export const FEAT_CLASS = ['gl-tile--w4 gl-tile--dark gl-tile--split', '', '', '', '', 'gl-tile--w6 gl-tile--tint gl-tile--split'];
export const FEAT_TONE = ['red', 'teal', 'blue', 'green', 'teal', 'ink'];

export const STEPS = [
  { title: 'Pilih wilayah', text: 'Tentukan provinsi, kabupaten/kota, dan desa yang ingin dipetakan.' },
  { title: 'Atur tampilan', text: 'Pilih peta dasar, warna isi, garis batas, dan label.' },
  { title: 'Tambah titik dan foto', text: 'Tandai lokasi penting dan lampirkan foto beserta keterangannya.' },
  { title: 'Unduh hasil', text: 'Periksa lembar peta, lalu ekspor sebagai PNG atau PDF.' }
];

// Contoh harga. Sesuaikan sebelum diluncurkan.
export const PLANS = [
  {
    id: 'gratis', name: 'Coba gratis', price: 'Rp0', unit: 'tanpa batas waktu', hi: false,
    blurb: 'Kenali alurnya dan susun peta sepuasnya sebelum membayar.',
    feats: ['Editor peta lengkap', 'Pratinjau lembar peta tanpa batas', 'Ekspor PNG ber-watermark, 3 kali per bulan'],
    packs: [] as { n: string; p: string }[], cta: 'Mulai gratis'
  },
  {
    id: 'kredit', name: 'Paket kredit', price: 'Mulai Rp20.000', unit: 'per kredit', hi: true,
    blurb: 'Bayar sesuai pemakaian. Satu kredit untuk satu kali ekspor PNG atau PDF. Membuka peta tidak memakai kredit.',
    feats: ['Ekspor tanpa watermark', 'Resolusi cetak penuh', 'Kredit berlaku 12 bulan'],
    packs: [{ n: '5 kredit', p: 'Rp100.000' }, { n: '20 kredit', p: 'Rp400.000' }, { n: '50 kredit', p: 'Rp1.000.000' }],
    cta: 'Pilih paket'
  },
  {
    id: 'institusi', name: 'Institusi', price: 'Rp250.000', unit: 'per bulan', hi: false,
    blurb: 'Untuk kantor desa, kecamatan, dan lembaga yang rutin mencetak peta.',
    feats: ['60 ekspor per bulan', 'Beberapa akun anggota tim', 'Faktur resmi untuk instansi'],
    packs: [] as { n: string; p: string }[], cta: 'Pilih paket'
  }
];

export const SPECS = [
  { k: 'Batas wilayah', v: 'Batas administrasi desa/kelurahan dari Badan Informasi Geospasial (BIG).' },
  { k: 'Penyimpanan data', v: 'PostgreSQL/PostGIS di Aiven, diakses melalui server API.' },
  { k: 'Peta dasar', v: 'Esri (citra, jalan, topografi, kanvas abu-abu), OpenStreetMap, OpenTopoMap, serta Carto (Positron, Voyager, Dark Matter) bila memakai API key.' },
  { k: 'Penggambaran peta', v: 'MapLibre GL JS. Luas dan batas tampilan dihitung dengan Turf.js.' },
  { k: 'Koordinat', v: 'Geografis WGS 84, ditulis dalam derajat, menit, dan detik.' },
  { k: 'Skala', v: 'Dihitung dari zoom dan lintang dengan asumsi layar 96 DPI. Anggap sebagai perkiraan.' },
  { k: 'Luas wilayah', v: 'Memakai atribut LUAS bila tersedia. Jika tidak, dihitung dari geometri.' },
  { k: 'Ekspor', v: 'PNG lewat html-to-image (cadangan html2canvas), PDF A4 lanskap lewat jsPDF.' }
];

export const FAQS = [
  { q: 'Apakah titik AOI dan foto saya tersimpan?', a: 'Belum. Titik, foto, dan pengaturan hanya ada di browser selama halaman terbuka. Ekspor ke PNG atau PDF sebelum menutup atau memuat ulang halaman.' },
  { q: 'Seberapa akurat skala pada peta?', a: 'Skala dihitung dari zoom dan lintang peta dengan asumsi layar 96 DPI, jadi bersifat perkiraan. Ukuran akhir di kertas bergantung pada hasil ekspor dan pengaturan cetak.' },
  { q: 'Dari mana data batas desa berasal?', a: 'Dari Badan Informasi Geospasial (BIG), disimpan di basis data PostGIS dan disajikan lewat server API.' },
  { q: 'Daftar provinsi tidak muncul. Apa yang harus dilakukan?', a: 'Aplikasi mengambil data wilayah dari server API. Pastikan server berjalan, lalu tekan Coba lagi di panel pengaturan.' },
  { q: 'Format apa saja yang bisa diunduh?', a: 'PNG resolusi tinggi dan PDF A4 lanskap.' },
  { q: 'Apa yang dihitung sebagai satu kredit?', a: 'Satu kali ekspor PNG atau PDF A4 dari satu lembar peta.' },
  { q: 'Apakah kredit bisa kedaluwarsa?', a: 'Kredit berlaku 12 bulan sejak tanggal pembelian.' }
];

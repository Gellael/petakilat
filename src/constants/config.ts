export const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const CARTO_KEY: string = ((import.meta as any).env?.VITE_CARTO_KEY as string | undefined) || '';

// Isi dengan alamat halaman checkout (Midtrans/Xendit/dll) bila pembayaran sudah siap.
// Selama kosong, tombol paket hanya membuka aplikasi.
export const CHECKOUT_URL = '';

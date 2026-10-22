<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# SMP Al-Qur'an Terpadu Yanbu'ul Quran 1 - CBT

## Menjalankan aplikasi

**Prasyarat:** Node.js

1. Pasang dependensi dengan `npm install`.
2. Salin `.env.example` menjadi `.env.local`, lalu isi konfigurasi server yang diperlukan.
3. Jalankan `npm run dev` untuk aplikasi dan API lokal. `npm run build` lalu `npm run preview` dapat digunakan untuk memeriksa build.

## Konfigurasi server

API login guru dan daftar nama siswa membaca tabel `guru` dan `siswa` dari Supabase lewat server. Isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di environment server. Service-role key hanya digunakan server; jangan menaruhnya di kode browser atau commit ke repositori.

- `SESSION_SECRET`: rahasia acak minimal 32 karakter untuk cookie sesi guru.
- `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`: koneksi server untuk membaca `guru(id,nama,niy)` dan `siswa(id,nama,kelas)`.
- `GOOGLE_APPLICATION_CREDENTIALS`: path lokal ke Firebase service-account JSON, atau gunakan `FIREBASE_SERVICE_ACCOUNT_JSON`. Dibutuhkan untuk penyimpanan kode ujian.
- `FIREBASE_PROJECT_ID` dan `FIRESTORE_DATABASE_ID`: opsional jika menggunakan project/database pada `firebase-applet-config.json`.
- `GEMINI_API_KEY`: diperlukan untuk membuat soal dari dokumen Word/PDF; simpan hanya di environment server.

Di Vercel, tambahkan variabel server tersebut pada **Project Settings → Environment Variables**, lalu redeploy. Halaman proyek yang dibagikan saat ini belum menampilkan deployment produksi. Jika variabel belum diisi, endpoint terkait menampilkan pesan konfigurasi yang jelas dan fitur tersebut tidak dapat digunakan.

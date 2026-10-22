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

API untuk login guru dan kode ujian memerlukan Firebase Admin. Isi `GOOGLE_APPLICATION_CREDENTIALS` dengan path lokal ke service-account JSON, atau gunakan `FIREBASE_SERVICE_ACCOUNT_JSON`. Jangan commit file service account atau `.env.local`.

- `SESSION_SECRET`: rahasia acak minimal 32 karakter untuk cookie sesi guru.
- `TEACHER_NIY_ACCOUNTS`: JSON array akun guru, misalnya `[{"id":"guru-1","name":"Nama Guru","niy":"NIY-RAHASIA","subject":"Matematika"}]`. Nilai NIY hanya disimpan di environment server.
- `FIREBASE_PROJECT_ID` dan `FIRESTORE_DATABASE_ID`: opsional jika menggunakan project/database pada `firebase-applet-config.json`.
- `GEMINI_API_KEY`: diperlukan untuk membuat soal dari dokumen Word/PDF; simpan hanya di environment server.

Jika variabel server belum diisi, endpoint terkait akan menampilkan pesan konfigurasi yang jelas dan fitur tersebut tidak dapat digunakan.

# Plan Pembuatan Bot WhatsApp (Deploy Gratis)

## 1. Tujuan
Membangun bot WhatsApp sederhana yang bisa membalas pesan otomatis, dengan biaya hosting Rp0 (memanfaatkan free tier platform cloud).

## 2. Pilihan Teknologi

### Library WhatsApp (pilih salah satu)
| Library | Kelebihan | Kekurangan |
|---|---|---|
| **Baileys** (Node.js) | Tidak butuh Puppeteer/Chromium, ringan, cocok untuk free tier RAM kecil | Kadang perlu update saat WA ubah protokol |
| **whatsapp-web.js** (Node.js) | Dokumentasi banyak, mirip WA Web | Butuh Chromium (berat, sering gagal di free tier) |
| **Fonnte / Wablas / Woo-wa (API pihak ketiga)** | Tidak perlu maintain koneksi sendiri | Biasanya berbayar setelah kuota gratis habis |

**Rekomendasi:** **Baileys**, karena paling ringan dan cocok untuk platform gratis dengan RAM terbatas (biasanya 256–512MB).

### Bahasa & Runtime
- Node.js (LTS terbaru)
- Package manager: npm atau pnpm

### Database (opsional, untuk simpan state/user)
- **Free tier:** MongoDB Atlas (512MB gratis) atau SQLite file lokal (jika platform support persistent storage) atau Supabase (Postgres gratis)

## 3. Pilihan Platform Deploy Gratis

| Platform | Free Tier | Catatan Penting |
|---|---|---|
| **Railway** | $5 kredit gratis/bulan (trial) | Mudah, tapi kredit gratis bisa habis kalau bot jalan 24 jam |
| **Render** | Free web service, tapi "sleep" jika tidak ada traffic HTTP | Perlu trik "self-ping" agar tidak sleep |
| **Fly.io** | Free allowance kecil (shared CPU) | Perlu Dockerfile, cocok untuk proses long-running seperti bot |
| **Replit** | Gratis dengan "Always On" terbatas (perlu Repl paid untuk full 24/7) | Cocok untuk testing, kurang stabil untuk produksi |
| **Oracle Cloud Free Tier** | VM gratis selamanya (Always Free, 1-4 OCPU ARM) | Paling stabil untuk 24/7, tapi setup lebih teknis (perlu kelola VPS sendiri) |
| **Termux + HP bekas** | 100% gratis, jalan di HP Android | Cocok untuk skala kecil/personal, tapi bergantung koneksi & baterai HP |

**Rekomendasi:**
- Untuk **belajar/testing**: Replit atau Render
- Untuk **produksi ringan 24/7 gratis selamanya**: Oracle Cloud Free Tier (VM) atau Termux di HP bekas

> Catatan: Bot WhatsApp butuh proses yang **selalu hidup** (long-running process) untuk menjaga koneksi socket, bukan platform "serverless" biasa (seperti Vercel Functions) yang mati setelah request selesai.

## 4. Arsitektur Sistem

```
[WhatsApp] <—(socket/QR login)—> [Baileys Client (Node.js)]
                                        |
                                  [Handler Pesan]
                                        |
                        +---------------+---------------+
                        |                               |
                [Command Bot]                  [Simpan Session/DB]
                (balas otomatis,                 (MongoDB Atlas /
                 menu, dsb)                        file lokal)
```

## 5. Tahapan Pengerjaan

### Tahap 1 — Setup Awal (Hari 1)
- [ ] Install Node.js & buat folder project
- [ ] `npm init -y`
- [ ] Install Baileys: `npm install @whiskeysockets/baileys`
- [ ] Buat file `index.js` dasar untuk koneksi + scan QR code

### Tahap 2 — Fitur Dasar Bot (Hari 2–3)
- [ ] Handle pesan masuk (`messages.upsert`)
- [ ] Buat sistem command sederhana, misal:
  - `!ping` → balas "pong"
  - `!menu` → tampilkan daftar perintah
- [ ] Simpan session login (`auth_info_baileys`) agar tidak perlu scan QR ulang tiap restart

### Tahap 3 — Fitur Tambahan (opsional, Hari 4–5)
- [ ] Auto-reply berbasis keyword
- [ ] Integrasi database (simpan data user/statistik)
- [ ] Command dengan gambar/media
- [ ] Fitur admin (broadcast, block user, dsb)

### Tahap 4 — Persiapan Deploy (Hari 6)
- [ ] Pastikan session tersimpan di folder yang persistent (bukan hilang tiap restart)
- [ ] Buat `.gitignore` (exclude `node_modules`, `auth_info_baileys`)
- [ ] Tambahkan `package.json` script `"start": "node index.js"`
- [ ] Jika pakai Fly.io/Oracle: buat `Dockerfile`

### Tahap 5 — Deploy (Hari 7)
- [ ] Push kode ke GitHub
- [ ] Hubungkan repo ke platform pilihan (Railway/Render/Fly.io)
- [ ] Setup environment variable (jika ada, misal MongoDB URI)
- [ ] Deploy & scan ulang QR code lewat log platform
- [ ] Test bot dengan kirim pesan dari WA lain

### Tahap 6 — Monitoring & Maintenance
- [ ] Cek log secara berkala (bot WA rawan disconnect)
- [ ] Buat auto-reconnect jika koneksi putus
- [ ] (Jika di Render) pasang cron-job/self-ping agar service tidak sleep

## 6. Risiko & Hal yang Perlu Diperhatikan
- **Akun WA bisa kena banned** jika kirim pesan massal/spam — gunakan wajar & jangan broadcast berlebihan
- **Free tier bisa mati sewaktu-waktu** (Render sleep, Railway kredit habis) — siapkan platform cadangan
- Baileys adalah **library tidak resmi**, WhatsApp bisa mengubah protokol sewaktu-waktu sehingga perlu update library
- Untuk pemakaian bisnis serius, pertimbangkan **WhatsApp Business API resmi** (berbayar tapi legal & stabil)

## 7. Contoh Struktur Folder
```
wa-bot/
├── index.js
├── commands/
│   ├── ping.js
│   └── menu.js
├── auth_info_baileys/   (auto-generated, jangan di-commit)
├── package.json
└── .gitignore
```

## 8. Referensi
- Baileys: https://github.com/WhiskeySockets/Baileys
- Railway: https://railway.app
- Render: https://render.com
- Fly.io: https://fly.io
- Oracle Cloud Free Tier: https://www.oracle.com/cloud/free/

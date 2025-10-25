# Telegram Webhook Bot (Express)

Repositori kecil untuk menjalankan webhook Telegram menggunakan Node.js + Express, siap dideploy ke Railway.

## Fitur
- Menerima update Telegram di endpoint `/webhook`
- Mengambil teks pesan, mengekstrak kata, menghitung jumlah kata, dan membalik setiap kata
- Mengirim balasan otomatis ke chat yang mengirim pesan

## Persyaratan
- Node.js 18+
- Token bot Telegram (TELEGRAM_BOT_TOKEN)

## Cara pakai (lokal)
1. Copy `.env.example` menjadi `.env` dan isi `TELEGRAM_BOT_TOKEN`.
2. Install dependensi:

```powershell
npm install
```

3. Jalankan server:

```powershell
npm start
```

4. (Opsional) Gunakan ngrok untuk mendapat URL publik:

```powershell
ngrok http 3000
```

Set webhook pada bot Telegram (ganti TOKEN dan URL):

```powershell
# contoh di PowerShell
$token = "<YOUR_TOKEN>"
$publicUrl = "https://<your-ngrok-or-railway-domain>"/webhook
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook?url=$publicUrl"
```

## Deploy ke Railway
1. Push repo ke GitHub (atau langsung gunakan Railway CLI).
2. Buat project baru di Railway dan hubungkan repo / push langsung.
3. Atur variable environment `TELEGRAM_BOT_TOKEN` di Railway (Settings -> Variables).
4. Railway akan menjalankan `npm start` (Procfile sudah disertakan).
5. Setelah deployment selesai, dapatkan domain publik Railway (mis. `https://project-xxxxx.up.railway.app`) dan set webhook:

```powershell
# ganti TOKEN dan RAILWAY_URL
$token = "<YOUR_TOKEN>"
$railwayUrl = "https://your-railway-url" + "/webhook"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook?url=$railwayUrl"
```

## Testing
Kirim pesan ke bot lewat Telegram. Server akan memproses kata dalam pesan dan mengirim balasan otomatis.

## Catatan keamanan
- Jangan commit `.env` ke repo. Gunakan env vars Railway.
- Untuk produksi, pertimbangkan memverifikasi source IP atau menggunakan secret token pada route webhook.

---
Jika mau, saya bisa membantu: mengatur file setWebhook (curl/PowerShell) atau memandu deploy ke Railway langkah-demi-langkah.
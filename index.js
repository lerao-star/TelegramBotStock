const express = require("express");
const axios = require("axios");
require("dotenv").config();

// Validasi environment variable
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ BOT_TOKEN belum disetel di environment!");
  process.exit(1);
}

const app = express();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Middleware
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/", (req, res) => {
  res.send("✅ Telegram bot webhook aktif!");
});

// Webhook Telegram
app.post("/webhook", async (req, res) => {
  const update = req.body;

  // Log update untuk debugging
  console.log("📩 Update diterima:", JSON.stringify(update, null, 2));

  // Pastikan ada pesan teks
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    // Proses pesan (contoh: echo)
    const replyText = `Anda mengirim: "${text}"\n\nPesan ini diproses oleh bot Anda di Railway. 🚀`;

    try {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: replyText,
      });
      console.log(`✅ Balasan terkirim ke ${chatId}`);
    } catch (error) {
      console.error(
        "❌ Gagal kirim balasan:",
        error.response?.data || error.message
      );
    }
  }

  // Telegram butuh respons cepat (200 OK)
  res.status(200).end();
});

// Handle 404
app.use((req, res) => {
  console.log("⚠️ 404 - Path tidak ditemukan:", req.method, req.originalUrl);
  res.status(404).json({ error: "Endpoint not found" });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});

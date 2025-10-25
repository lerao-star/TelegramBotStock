const express = require("express");
const axios = require("axios");
const app = express();

// Ganti dengan token bot Anda dari @BotFather
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = "/webhook"; // endpoint webhook

// Middleware untuk parsing JSON
app.use(express.json());

// Endpoint webhook Telegram
app.post(WEBHOOK_URL, async (req, res) => {
  const update = req.body;

  // Pastikan update berisi pesan teks
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    // ✨ Proses pesan di sini
    console.log(`Menerima pesan dari ${chatId}: "${text}"`);

    // Contoh: balas dengan pesan yang diolah
    const replyText = `Anda mengirim: "${text}". Pesan ini telah diproses!`;

    try {
      // Kirim balasan ke Telegram
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: replyText,
      });
    } catch (error) {
      console.error("Gagal mengirim balasan:", error.message);
    }
  }

  // Telegram perlu respons cepat (200 OK)
  res.status(200).end();
});

// Endpoint untuk mengatur webhook (opsional, bisa juga via curl)
app.get("/setwebhook", async (req, res) => {
  const url = `https://your-domain.com${WEBHOOK_URL}`; // Ganti dengan URL publik Anda
  try {
    const response = await axios.get(
      `${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(url)}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).send("Gagal mengatur webhook");
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Telegram Bot Webhook siap!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});

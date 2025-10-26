const express = require("express");
const axios = require("axios");
const { handleAnalysis } = require("./commands");
require("dotenv").config();

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN belum disetel!");
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const app = express();

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("✅ Bot siap menerima perintah: /analisa [saham]");
});

app.post("/webhook", async (req, res) => {
  const update = req.body;

  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    if (text.startsWith("/analisa")) {
      const args = text.slice(8).trim();
      await handleAnalysis(chatId, args);
    } else if (text === "/start") {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "Halo! Kirim /analisa [kode_saham] untuk melihat chart.\nContoh: /analisa BBCA.JK",
      });
    }
  }

  res.status(200).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});

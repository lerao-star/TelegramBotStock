const express = require("express");
const axios = require("axios");
const {
  handleAnalysis,
  handleNews,
  handleBEI,
  handleBroksum,
} = require("./commands");

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN belum disetel!");
  process.exit(1);
}

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

app.use(express.json({ limit: "10mb" }));

// 🔁 Pemetaan perintah ke fungsi (dengan alias)
const commandMap = {
  // Semua ini memanggil handleAnalysis
  analisa: handleAnalysis,
  analisis: handleAnalysis,
  analysist: handleAnalysis,

  // Memanggil handleNews
  berita: handleNews,

  // Memanggil handleBEI
  bei: handleBEI,

  //memanggil handleBroksum
  broksum: handleBroksum,
};

// Helper: ekstrak command dan argumen
function parseCommand(text) {
  if (!text.startsWith("/")) return null;
  const match = text.match(/^\/(\w+)(?:@(\w+))?(?:\s+(.*))?$/);
  if (!match) return null;
  const [, cmd, botUsername, args = ""] = match;
  return { command: cmd.toLowerCase(), args: args.trim() };
}

app.post("/webhook", async (req, res) => {
  const update = req.body;
  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const parsed = parseCommand(text);

    let replyText =
      "❓ Perintah tidak dikenali. Coba: /analisa [saham], /berita [topik], /bei [kode]";

    if (parsed) {
      const { command, args } = parsed;
      const handler = commandMap[command];

      if (handler) {
        try {
          replyText = await handler(chatId, args);
        } catch (err) {
          console.error(`Error di /${command}:`, err);
          replyText = "⚠️ Gagal memproses permintaan.";
        }
      }
    }

    // Kirim balasan
    await axios
      .post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: replyText,
      })
      .catch(console.error);
  }

  res.status(200).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});

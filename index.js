// index.js
import dotenv from "dotenv";
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { handleBEIAnnouncement } from "./Services/bei-announcement.js";
import { handleNews } from "./Services/news.js";
import { handleTechnicalAnalysis } from "./Services/technical-analysis.js";
import { handleBrokerSummary } from "./Services/broker-summary.js";
import { handleMarubozuDetection } from "./Services/marubozu-detector.js";
import { handleMarubozuScanner } from "./Services/marubozu-scanner.js";
import { handleBreakoutScanner } from "./Services/breakresistence.js";
import { handleChartBrokerSummary } from "./Commands/ChartBroksum/Index.js";
import { handleChartBrokerSummaryImage } from "./Commands/ChartBroksum/Index.js";

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set in environment");
  process.exit(1);
}

// Decide mode: webhook when WEBHOOK_URL is set, otherwise polling
const WEBHOOK_URL = process.env.WEBHOOK_URL;
let bot;
if (WEBHOOK_URL) {
  bot = new TelegramBot(TOKEN, { polling: false });

  const app = express();
  app.use(express.json());

  app.post("/webhook", (req, res) => {
    try {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      console.error("Failed to process update:", err);
      res.sendStatus(500);
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Webhook server listening on port ${PORT}`)
  );

  // register webhook with Telegram (best-effort)
  (async () => {
    try {
      await bot.setWebHook(WEBHOOK_URL);
      console.log("Webhook set to", WEBHOOK_URL);
    } catch (err) {
      console.error("Failed to set webhook:", err?.message || err);
    }
  })();
} else {
  bot = new TelegramBot(TOKEN, { polling: true });
}

// log polling errors
bot.on("polling_error", (err) => {
  console.error("Polling error", err?.message || err);
});

function createProgressUpdater(bot, chatId) {
  let messageId = null;

  return async (percent, message = "") => {
    const text = `⏳ ${message || "Memproses..."} (${Math.round(percent)}%)`;

    if (percent >= 100) {
      if (messageId) {
        try {
          await bot.deleteMessage(chatId, messageId);
        } catch (e) {}
        messageId = null; // reset
      }
      return;
    }

    if (messageId === null) {
      try {
        const sent = await bot.sendMessage(chatId, text, {
          parse_mode: "Markdown",
        });
        messageId = sent.message_id;
      } catch (e) {
        console.warn("Gagal kirim pesan progress:", e.message);
      }
    } else {
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
        });
      } catch (e) {
        try {
          const sent = await bot.sendMessage(chatId, text, {
            parse_mode: "Markdown",
          });
          messageId = sent.message_id;
        } catch {}
      }
    }
  };
}

function isValidSymbol(input) {
  return /^[a-zA-Z]{3,5}$/.test(input.trim());
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const helpMsg = `
🤖 Bot Saham Indonesia

Perintah:
• /analisis <kode> → Chart + indikator
• /berita <kode> → Berita terkini
• /bei <kode> → Pengumuman BEI
• /broksum <kode> → Broksum harian
• /chartbroksum <kode> [hari|mtd] [broker,...] → Broker Flow (teks)
• /chartbroksumimg <kode> [hari|mtd] [broker,...] → Broker Flow (gambar)
• /marubozu <kode> → Deteksi Marubozu per saham
• /scanmarubozu → Scan semua saham
• /scanbreakresistence → Scan breakout/resistence
`;
  bot.sendMessage(chatId, helpMsg, { parse_mode: "Markdown" });
});

bot.onText(/\/(analisis|analisa|analis)\s+(.+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[2].trim();
  if (!isValidSymbol(input))
    return bot.sendMessage(chatId, "❌ Format: /analisis WEGE");

  const onProgress = createProgressUpdater(bot, chatId);
  await handleTechnicalAnalysis(
    bot,
    chatId,
    input.toUpperCase() + ".JK",
    onProgress
  );
});

bot.onText(/\/berita\s+(.+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].trim();
  if (!isValidSymbol(input))
    return bot.sendMessage(chatId, "❌ Format: /berita BBCA");
  await handleNews(bot, chatId, input.toUpperCase() + ".JK");
});

bot.onText(/\/bei\s+(.+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].trim();
  if (!isValidSymbol(input))
    return bot.sendMessage(chatId, "❌ Format: /bei TLKM");
  await handleBEIAnnouncement(bot, chatId, input.toUpperCase() + ".JK");
});

// services/broker-summary.js (bagian handler)

bot.onText(/^\/broksum\s+([A-Z]{2,5})\s+(.+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1].trim().toUpperCase();
  const input = match[2].trim();

  if (!isValidSymbol(symbol)) {
    return bot.sendMessage(
      chatId,
      "❌ Format simbol saham tidak valid. Contoh: BBRI, TLKM"
    );
  }

  // Coba parse sebagai rentang tanggal: "10-09-2025 sd 11-09-2025"
  const dateRangeMatch = input.match(
    /^(\d{1,2}-\d{1,2}-\d{4})\s+sd\s+(\d{1,2}-\d{1,2}-\d{4})$/i
  );
  if (dateRangeMatch) {
    const [_, fromStr, toStr] = dateRangeMatch;
    const from = parseDDMMYYYY(fromStr);
    const to = parseDDMMYYYY(toStr);

    if (!from || !to || from > to) {
      return bot.sendMessage(
        chatId,
        "❌ Format tanggal salah atau rentang tidak valid. Gunakan: DD-MM-YYYY sd DD-MM-YYYY"
      );
    }

    return handleBrokerSummary(bot, chatId, symbol, {
      from,
      to,
      type: "custom",
    });
  }

  // Coba sebagai angka (jumlah hari)
  if (/^\d+$/.test(input)) {
    const days = parseInt(input, 10);
    if (days < 1 || days > 90) {
      return bot.sendMessage(chatId, "❌ Jumlah hari harus antara 1–90.");
    }
    return handleBrokerSummary(bot, chatId, symbol, { days, type: "days" });
  }

  // Cek keyword khusus
  const period = input.toLowerCase();
  if (period === "mtd") {
    return handleBrokerSummary(bot, chatId, symbol, { type: "mtd" });
  }
  if (period === "ytd") {
    return handleBrokerSummary(bot, chatId, symbol, { type: "ytd" });
  }

  // Tidak dikenali
  return bot.sendMessage(
    chatId,
    "❌ Format tidak dikenali.\n" +
      "Contoh:\n" +
      "/broksum BBRI\n" +
      "/broksum BBRI 7\n" +
      "/broksum BBRI mtd\n" +
      "/broksum BBRI ytd\n" +
      "/broksum BBRI 10-09-2025 sd 11-09-2025"
  );
});

// Handler default (tanpa argumen tambahan → 1 hari)
bot.onText(/^\/broksum\s+([A-Z]{2,5})$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1].trim().toUpperCase();
  if (!isValidSymbol(symbol)) {
    return bot.sendMessage(chatId, "❌ Format simbol saham tidak valid.");
  }
  await handleBrokerSummary(bot, chatId, symbol, { days: 1, type: "days" });
});

bot.onText(/\/marubozu\s+(.+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].trim();
  if (!isValidSymbol(input))
    return bot.sendMessage(chatId, "❌ Format: /marubozu WEGE");
  await handleMarubozuDetection(bot, chatId, input.toUpperCase() + ".JK");
});

bot.onText(/\/scanmarubozu$/i, async (msg) => {
  const chatId = msg.chat.id;
  await handleMarubozuScanner(bot, chatId);
});

bot.onText(/\/scanbreakresistence(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1]?.trim() || "5"; // default "5"

  try {
    await handleBreakoutScanner(bot, chatId, input);
  } catch (err) {
    console.error("Error in scanner:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat menjalankan scanner.");
  }
});

// Handler untuk /chartbroksum
bot.onText(/^\/chartbroksum(?:\s+(.+))?$/i, (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1]
    ? match[1].split(/\s+/).filter((arg) => arg.trim() !== "")
    : [];

  if (args.length === 0) {
    return bot.sendMessage(
      chatId,
      "UsageId: /chartbroksum <saham> [hari|mtd] [broker1,broker2,...]"
    );
  }

  // Buat context mock agar kompatibel dengan handler Anda
  const ctx = {
    message: msg,
    reply: (text, options) => bot.sendMessage(chatId, text, options),
    // Tambahkan method lain jika dibutuhkan oleh handler
  };

  handleChartBrokerSummary(ctx, args);
});

bot.onText(/^\/chartbroksumimg(?:\s+(.+))?$/i, (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1]
    ? match[1].split(/\s+/).filter((arg) => arg.trim() !== "")
    : [];

  if (args.length === 0) {
    return bot.sendMessage(
      chatId,
      "UsageId: /chartbroksumimg <saham> [hari|mtd] [broker1,broker2,...]"
    );
  }

  // Buat updater progress
  const onProgress = createProgressUpdater(bot, chatId);

  const ctx = {
    message: msg,
    reply: (text, opts) => bot.sendMessage(chatId, text, opts),
    replyWithPhoto: (photo, opts) =>
      bot.sendPhoto(chatId, photo.source, {
        ...opts,
        filename: photo.filename,
      }),
  };

  // Kirim onProgress ke handler
  handleChartBrokerSummaryImage(ctx, args, onProgress);
});

// Daftar perintah yang valid
const validCommands = [
  "/start",
  "/analisis",
  "/analisa",
  "/analis",
  "/berita",
  "/bei",
  "/broksum",
  "/marubozu",
  "/scanmarubozu",
  "/scanbreakresistence",
  "/chartbroksum",
  "/chartbroksumimg",
];

// Handler fallback: perintah tidak dikenal
bot.on("message", (msg) => {
  const text = msg.text?.trim();

  // Cek jika pesan adalah command (diawali '/')
  if (text?.startsWith("/")) {
    // Ambil command utama (tanpa argumen)
    const command = text.split(" ")[0].toLowerCase();

    // Jika bukan command valid, balas pesan tidak dikenal
    if (!validCommands.includes(command)) {
      bot.sendMessage(
        msg.chat.id,
        "❓ Perintah tidak dikenal. Ketik /start untuk bantuan."
      );
    }
  }
});

console.log("✅ Bot siap!");

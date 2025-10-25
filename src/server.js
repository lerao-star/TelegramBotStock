// src/server.js
import express from "express";
import { Telegraf } from "telegraf";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter.js"; // Path untuk v4
import { ExpressAdapter } from "@bull-board/express";
import Queue from "bull"; // Import default dari bull v4
import { handleTechnicalAnalysis } from "./services/technical-analysis.js"; // Impor fungsi analisis

// Inisialisasi Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Inisialisasi Antrian
const analisaQueue = new Queue(
  "Analisis",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

// Objek global sederhana untuk menyimpan callback progress
// Dalam produksi, gunakan Redis atau database untuk skalabilitas
const progressCallbacks = {};

// Fungsi untuk membuat updater progress (mirip dengan kode sebelumnya, tapi untuk Telegraf)
function createProgressUpdater(bot, chatId) {
  let messageId = null;

  return async (percent, message = "") => {
    const text = `⏳ ${message || "Memproses..."} (${Math.round(percent)}%)`;

    if (percent >= 100) {
      if (messageId) {
        try {
          // Hapus pesan progress saat selesai
          await bot.telegram.deleteMessage(chatId, messageId);
        } catch (e) {
          // Mungkin pesan sudah dihapus sebelumnya
          console.warn("Gagal hapus pesan progress:", e.message);
        }
        messageId = null;
      }
      return;
    }

    if (messageId === null) {
      try {
        // Kirim pesan progress pertama kali
        const sent = await bot.telegram.sendMessage(chatId, text, {
          parse_mode: "MarkdownV2", // Gunakan MarkdownV2
        });
        messageId = sent.message_id;
      } catch (e) {
        console.warn("Gagal kirim pesan progress awal:", e.message);
      }
    } else {
      try {
        // Edit pesan progress yang sudah ada
        await bot.telegram.editMessageText(chatId, messageId, undefined, text, {
          parse_mode: "MarkdownV2", // Gunakan MarkdownV2
        });
      } catch (e) {
        // Jika edit gagal (misalnya pesan dihapus), kirim ulang
        try {
          const sent = await bot.telegram.sendMessage(chatId, text, {
            parse_mode: "MarkdownV2", // Gunakan MarkdownV2
          });
          messageId = sent.message_id;
        } catch (e2) {
          console.warn(
            "Gagal edit atau kirim ulang pesan progress:",
            e2.message
          );
        }
      }
    }
  };
}

// Fungsi untuk memvalidasi simbol
function isValidSymbol(input) {
  return /^[a-zA-Z]{3,5}$/.test(input.trim());
}

// Handler untuk command /start
bot.start((ctx) => {
  const helpMsg = `
🤖 Bot Saham Indonesia

Perintah:
• /analisis <kode> \\→ Chart + indikator
`;
  return ctx.reply(helpMsg, { parse_mode: "MarkdownV2" });
});

// Handler untuk command /analisis
bot.command(["analisis", "analisa", "analis"], async (ctx) => {
  const chatId = ctx.message.chat.id;
  const input = ctx.message.text.split(/\s+/)[1]; // Ambil argumen pertama

  // Validasi simbol
  if (!input || !isValidSymbol(input)) {
    return ctx.reply("❌ Format: /analisis WEGE", { parse_mode: "MarkdownV2" });
  }

  const kodeSaham = input.trim().toUpperCase() + ".JK"; // Tambahkan .JK

  // Buat updater progress
  const onProgress = createProgressUpdater(bot, chatId);

  // Simpan callback progress ke objek global
  // Kita gunakan chatId sebagai key
  progressCallbacks[chatId] = onProgress;

  // Tambahkan job ke antrian
  const job = await analisaQueue.add(
    { kodeSaham, chatId }, // Kirim chatId dan kodeSaham ke job
    { attempts: 1, backoff: 5000 }
  );

  await ctx.reply(
    `Permintaan analisis untuk ${kodeSaham} diterima. ID: ${job.id}. Sedang memproses...`,
    { parse_mode: "MarkdownV2" }
  );
});

// Handler fallback untuk perintah tidak dikenal
bot.use((ctx, next) => {
  // Cek apakah pesan adalah command
  const text = ctx.message?.text?.trim();
  if (text && text.startsWith("/")) {
    // Jika pesan adalah command dan tidak cocok dengan handler sebelumnya,
    // maka command tersebut tidak dikenal
    const command = text.split(" ")[0].toLowerCase();
    const validCommands = ["/start", "/analisis", "/analisa", "/analis"];
    if (!validCommands.includes(command)) {
      return ctx.reply(
        "❓ Perintah tidak dikenal. Ketik /start untuk bantuan.",
        { parse_mode: "MarkdownV2" }
      );
    }
  }
  // Jika bukan command atau command dikenal, lanjutkan ke handler berikutnya (jika ada)
  return next();
});

// Setup Express
const app = express();
app.use(express.json());

// Setup Bull Board (opsional)
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(analisaQueue)],
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Webhook handler
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, async (req, res) => {
  console.log("Menerima body webhook:", req.body);
  await bot.handleUpdate(req.body);
  res.status(200).end();
});

// Proses antrian
analisaQueue.process("AnalisisJob", async (job, done) => {
  // Beri nama job agar lebih spesifik
  const { kodeSaham, chatId } = job.data;

  try {
    // Ambil callback progress dari objek global
    const onProgress = progressCallbacks[chatId];
    let analysisResult; // Variabel untuk menyimpan hasil dari handleTechnicalAnalysis

    if (!onProgress) {
      console.warn(`Callback progress untuk chatId ${chatId} tidak ditemukan.`);
      // Jika tidak ditemukan, kita tetap bisa lanjutkan proses tanpa update progress
      // Kita buat fungsi onProgress kosong sebagai fallback
      const emptyProgress = () => {};
      // Panggil handleTechnicalAnalysis dan simpan hasilnya
      analysisResult = await handleTechnicalAnalysis(
        bot,
        chatId,
        kodeSaham,
        emptyProgress
      );
    } else {
      // Jika ditemukan, gunakan callback tersebut
      // Panggil handleTechnicalAnalysis dan simpan hasilnya
      analysisResult = await handleTechnicalAnalysis(
        bot,
        chatId,
        kodeSaham,
        onProgress
      );
    }

    // --- BAGIAN BARU: Kirim hasil ke Telegram ---
    // Periksa apakah analysisResult berisi data yang diperlukan
    if (analysisResult && analysisResult.screenshot && analysisResult.caption) {
      // Kirim foto ke pengguna
      await bot.telegram.sendPhoto(
        chatId,
        { source: analysisResult.screenshot },
        { caption: analysisResult.caption }
      );

      // Kirim update progress akhir (100%)
      // Kita coba panggil onProgress(100) jika tersedia
      if (onProgress) {
        await onProgress(100, "Selesai!");
      }
      // Jika onProgress tidak ada, kita bisa mengirim pesan biasa
      // await bot.telegram.sendMessage(chatId, "✅ Analisis selesai dan hasil telah dikirim.");
    } else {
      // Jika handleTechnicalAnalysis gagal (melempar error), maka bagian ini tidak akan dijalankan
      // Error akan ditangkap oleh blok catch di bawah
      console.error(
        "handleTechnicalAnalysis tidak mengembalikan data yang valid:",
        analysisResult
      );
      // Jika data tidak valid, kita tetap kirim update progress akhir
      if (onProgress) {
        await onProgress(100, "Gagal: Data tidak valid.");
      }
      // Dan kirim pesan error ke user
      await bot.telegram.sendMessage(
        chatId,
        `❌ Terjadi kesalahan saat membuat analisis untuk ${kodeSaham}.`
      );
      // Kita anggap job ini gagal logika, bukan error teknis, jadi kita done(null) atau done(error) tergantung kebijakan
      // Kita kirim error ke done agar masuk ke log antrian
      throw new Error("Data hasil analisis tidak valid.");
    }
    // --- AKHIR BAGIAN BARU ---

    // Hapus callback progress setelah selesai
    delete progressCallbacks[chatId];

    // Beri tahu Bull bahwa job selesai SUKSES
    done(null, { status: "completed", chatId: chatId, symbol: kodeSaham });
  } catch (error) {
    console.error("Error dalam prosesor antrian:", error);
    // Hapus callback progress jika terjadi error
    delete progressCallbacks[chatId];

    // Kirim pesan error ke user jika error terjadi setelah job dimulai
    // Periksa apakah error berasal dari handleTechnicalAnalysis
    if (
      error.message.includes("Data tidak tersedia") ||
      error.message.includes("Gagal membuat grafik") ||
      error.message.includes("Data hasil analisis tidak valid.")
    ) {
      // Error dari logika analisis
      await bot.telegram.sendMessage(chatId, error.message);
    } else {
      // Error teknis lainnya
      await bot.telegram.sendMessage(
        chatId,
        `❌ Terjadi kesalahan teknis saat menganalisis ${kodeSaham}. Silakan coba lagi nanti.`
      );
    }

    // Jika error terjadi di dalam proses, kirim update progress error jika callback ada
    const onProgress = progressCallbacks[chatId]; // Ambil lagi untuk mengirim update error
    if (onProgress) {
      // Kita hapus callback di atas, jadi ini akan menjadi undefined kecuali kita simpan sebelumnya
      // Lebih baik simpan onProgress sebelum try-catch
      // Atau kirim pesan biasa seperti di atas
      // Kita sudah kirim pesan error di atas, jadi cukup kirim done(error)
    }

    // Beri tahu Bull bahwa job GAGAL
    done(error);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

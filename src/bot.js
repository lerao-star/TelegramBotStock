// src/bot.js
import { Telegraf } from "telegraf";
import Queue from "bull"; // Import default dari bull v4
import fs from "fs/promises";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Buat instance Queue untuk digunakan di bot
const analisaQueue = new Queue(
  "Analisis",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

bot.start((ctx) =>
  ctx.reply("Halo! Kirimkan saya kode saham untuk analisis teknikal.")
);

bot.help((ctx) =>
  ctx.reply("Kirimkan /analisa <kode_saham> untuk mendapatkan analisis.")
);

bot.command("analisa", async (ctx) => {
  const chatId = ctx.message.chat.id;
  const args = ctx.message.text.split(/\s+/);
  if (args.length < 2) {
    return ctx.reply("Gunakan: /analisa <kode_saham>");
  }
  const kodeSaham = args[1].toUpperCase();

  const job = await analisaQueue.add(
    { kodeSaham, chatId },
    { attempts: 1, backoff: 5000 }
  );

  await ctx.reply(
    `Permintaan analisis untuk ${kodeSaham} diterima. ID: ${job.id}. Sedang memproses...`
  );

  try {
    // Tunggu job selesai
    const result = await job.finished(); // Ini akan menunggu sampai job selesai (sukses atau gagal)

    if (result && result.status === "completed" && result.path) {
      // Kirim foto ke user
      await ctx.replyWithPhoto({ source: result.path });
      // Hapus file sementara setelah dikirim
      await fs.unlink(result.path);
    } else {
      await ctx.reply(
        `Analisis untuk ${kodeSaham} selesai, tetapi tidak menghasilkan gambar.`
      );
      console.error("Job selesai tetapi hasilnya tidak valid:", result);
    }
  } catch (finishedError) {
    // Jika job gagal
    console.error("Job gagal:", finishedError);
    await ctx.reply(
      `Terjadi kesalahan saat menganalisis ${kodeSaham}. Silakan coba lagi nanti.`
    );
    // Jika job gagal, file mungkin tidak dibuat atau gagal dibuat
    // Tidak perlu menghapus file di sini kecuali kamu yakin file itu ada dari proses sebelumnya
  }
});

export { bot };

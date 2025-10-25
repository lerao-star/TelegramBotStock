import puppeteer from "puppeteer";
import fs from "fs/promises";
import { Telegraf } from "telegraf";

export async function analisaJobProcessor(job, done) {
  // Terima job dan done callback
  const { kodeSaham, chatId } = job.data;

  // Catatan: bull v4 TIDAK memiliki job.updateProgress() bawaan
  // Kita akan bahas progress nanti.
  // console.log("Progress: 10%"); // Simulasi update progress

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // TODO: Ganti URL dengan sumber data teknikal yang valid
  await page.goto(`https://www.tradingview.com/chart/?symbol=${kodeSaham}`, {
    waitUntil: "networkidle2",
  });

  // console.log("Progress: 50%"); // Simulasi update progress

  const screenshotPath = `/tmp/${kodeSaham}_chart.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // console.log("Progress: 90%"); // Simulasi update progress

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  await bot.telegram.sendPhoto(chatId, { source: screenshotPath });

  await browser.close();
  await fs.unlink(screenshotPath); // Hapus file sementara

  // Panggil callback 'done' untuk menandai job selesai
  // done(error, result) -> jika tidak ada error, kirim null
  done(null, { status: "completed", path: screenshotPath });
}

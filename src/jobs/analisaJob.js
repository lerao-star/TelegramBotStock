import puppeteer from "puppeteer";
import fs from "fs/promises";

export async function analisaJob(job) {
  const { kodeSaham, chatId } = job.data;

  // Simulasi update progress
  await job.progress(10);
  // TODO: Kirim update ke bot bahwa sedang membuka browser

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // TODO: Ganti URL dengan sumber data teknikal yang valid (misalnya TradingView, Yahoo Finance, dll)
  await page.goto(`https://www.tradingview.com/chart/?symbol=${kodeSaham}`, {
    waitUntil: "networkidle2",
  });

  await job.progress(50);

  // TODO: Ambil data teknikal: MA5, MA20, MACD, Volume, Support, Resist
  // Contoh: screenshot chart
  const screenshotPath = `/tmp/${kodeSaham}_chart.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });

  await job.progress(90);

  // Kirim gambar ke Telegram
  await bot.telegram.sendPhoto(chatId, { source: screenshotPath });

  await job.progress(100);

  await browser.close();
  await fs.unlink(screenshotPath); // Hapus file sementara
}

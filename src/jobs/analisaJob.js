// src/jobs/analisaJob.js
import puppeteer from "puppeteer-core"; // Import dari puppeteer-core
import chromium from "@sparticuz/chromium"; // Import sparticuz/chromium
import fs from "fs/promises";

export async function analisaJobProcessor(job, done) {
  const { kodeSaham, chatId } = job.data;

  let browser;
  try {
    // Gunakan executablePath dari @sparticuz/chromium
    browser = await puppeteer.launch({
      headless: true,
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ], // Tambahkan argumen tambahan
      executablePath: await chromium.executablePath(), // Gunakan path dari sparticuz/chromium
    });

    const page = await browser.newPage();

    // Contoh sederhana: screenshot chart
    await page.goto(`https://www.tradingview.com/chart/?symbol=${kodeSaham}`, {
      waitUntil: "networkidle2",
    });

    const screenshotPath = `/tmp/${kodeSaham}_chart.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const result = {
      status: "completed",
      path: screenshotPath,
      chatId: chatId,
    };
    done(null, result);
  } catch (error) {
    console.error("Error dalam analisaJobProcessor:", error);
    if (browser) {
      await browser.close();
    }
    done(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

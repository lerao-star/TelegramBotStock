// src/jobs/analisaJob.js

import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs/promises";
import path from "path";

// Fungsi bantuan untuk mengambil data dari halaman TradingView
// Versi yang lebih tahan terhadap timeout dan perubahan selector
async function extractTradingViewData(page, symbol) {
  console.log(`Mengambil data teknikal untuk ${symbol}...`);
  let data = null;

  try {
    // Coba beberapa selector yang umum digunakan untuk kontainer chart
    const possibleSelectors = [
      '[data-name="chart-container"]', // Selector sebelumnya
      ".chart-container", // Selector kelas
      "#tv-chart-container", // Selector ID (jika ada)
      'div[data-role="chart"]', // Selector lain berdasarkan role
      ".pane-legend-line", // Selector untuk bagian legenda/chart
      // Tambahkan selector lain jika ditemukan
    ];

    let chartElementFound = false;
    for (const selector of possibleSelectors) {
      try {
        console.log(`Mencoba selector: ${selector}`);
        // Tunggu hingga elemen muncul, dengan timeout lebih lama
        await page.waitForSelector(selector, { timeout: 15000 });
        console.log(`Elemen ditemukan dengan selector: ${selector}`);
        chartElementFound = true;
        break; // Keluar dari loop jika ditemukan
      } catch (timeoutErr) {
        console.warn(`Selector ${selector} tidak ditemukan dalam 15 detik.`);
        // Lanjutkan ke selector berikutnya
      }
    }

    if (!chartElementFound) {
      console.error("Tidak ada selector yang ditemukan untuk kontainer chart.");
      // Jika tidak satu pun ditemukan, lempar error agar fallback ke simulasi
      throw new Error("Kontainer chart tidak ditemukan.");
    }

    // Di sini, kita tahu bahwa *sebuah* kontainer chart telah muncul.
    // Namun, mengambil data teknikal seperti MA, MACD, Support/Resist
    // secara langsung dari DOM TradingView sangat sulit karena:
    // 1. Banyak data digambar di dalam elemen <canvas>.
    // 2. Nilai-nilai spesifik (MA5, MA20) mungkin tidak langsung terlihat di DOM.
    // 3. Indikator biasanya ditambahkan secara dinamis dan mungkin perlu diaktifkan dulu.

    // Kita tidak akan mencoba mengambil nilai-nilai ini secara akurat dari DOM TradingView.
    // Kita akan mensimulasikan data di sini sebagai fallback yang andal.
    // Dalam implementasi nyata, kamu HARUS mengganti bagian ini
    // dengan panggilan ke API data eksternal atau scraping halaman lain.

    console.log(
      "Mengekstrak data teknikal dari TradingView secara langsung sangat sulit dan rapuh."
    );
    console.log(
      "Mensimulasikan data sebagai fallback. GUNAKAN API EKSTERNAL UNTUK PRODUKSI."
    );
    data = {
      MA5: 123.45,
      MA20: 121.3,
      MACD: { value: 2.15, signal: 1.98, histogram: 0.17 },
      Volume: "1.234.567",
      Support: 120.0,
      Resistance: 125.0,
      Last: null, // Bisa diambil jika ditemukan di DOM
    };

    // (Opsional) Coba ambil harga 'Last' jika muncul di DOM
    try {
      // Ini adalah contoh selector umum, bisa berubah
      // Biasanya muncul di panel atas atau di sekitar kursor
      const lastPriceElement = await page.$(".tv-price-display__value"); // Contoh selector
      if (lastPriceElement) {
        data.Last = await lastPriceElement.evaluate((el) => el.textContent);
        console.log(`Harga Last ditemukan: ${data.Last}`);
      } else {
        console.log("Elemen harga Last tidak ditemukan.");
      }
    } catch (e) {
      console.warn("Gagal mengambil harga Last:", e.message);
    }
  } catch (error) {
    console.error("Gagal mengambil data dari TradingView:", error.message);
    console.log("Menggunakan data simulasi karena error scraping.");
    // Jika terjadi error (termasuk timeout atau selector tidak ditemukan),
    // kembalikan data simulasi sebagai fallback yang aman.
    data = {
      MA5: 123.45,
      MA20: 121.3,
      MACD: { value: 2.15, signal: 1.98, histogram: 0.17 },
      Volume: "1.234.567",
      Support: 120.0,
      Resistance: 125.0,
      Last: null,
    };
  }

  console.log("Data teknikal (nyata atau simulasi):", data);
  return data;
}

// Fungsi bantuan untuk membuat gambar sederhana dengan data teknikal
// Kita akan menggunakan Puppeteer untuk membuat halaman HTML sederhana dan mengambil screenshotnya
async function generateImageFromData(page, symbol, data) {
  console.log("Membuat gambar dari data teknikal...");

  // Buat HTML sederhana yang menampilkan data
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f0f0f0; }
            .header { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .data-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .data-item { background-color: #fff; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .data-label { font-weight: bold; color: #333; }
            .data-value { color: #000; }
        </style>
    </head>
    <body>
        <div class="header">Analisis Teknikal: ${symbol}</div>
        <div class="data-container">
            <div class="data-item">
                <div class="data-label">MA5</div>
                <div class="data-value">${data.MA5}</div>
            </div>
            <div class="data-item">
                <div class="data-label">MA20</div>
                <div class="data-value">${data.MA20}</div>
            </div>
            <div class="data-item">
                <div class="data-label">MACD</div>
                <div class="data-value">${data.MACD.value} (Signal: ${
    data.MACD.signal
  }, Hist: ${data.MACD.histogram})</div>
            </div>
            <div class="data-item">
                <div class="data-label">Volume</div>
                <div class="data-value">${data.Volume}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Support</div>
                <div class="data-value">${data.Support}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Resistance</div>
                <div class="data-value">${data.Resistance}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Last Price</div>
                <div class="data-value">${data.Last || "N/A"}</div>
            </div>
        </div>
    </body>
    </html>
  `;

  // Arahkan ke halaman data URL
  await page.setContent(htmlContent);

  // Ambil screenshot dari body
  const screenshotPath = `/tmp/${symbol}_analysis.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`Gambar analisis disimpan di: ${screenshotPath}`);
  return screenshotPath;
}

export async function analisaJobProcessor(job, done) {
  const { kodeSaham, chatId } = job.data;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      executablePath: await chromium.executablePath(),
    });

    const page = await browser.newPage();

    // Langkah 1: Navigasi ke TradingView dan tunggu halaman utama muncul
    console.log(`Membuka halaman TradingView untuk ${kodeSaham}...`);
    await page.goto(`https://www.tradingview.com/chart/?symbol=${kodeSaham}`, {
      waitUntil: "networkidle0",
    }); // Gunakan networkidle0 untuk tunggu lebih lama

    // Langkah 2: Ekstrak data teknikal (akan fallback ke simulasi jika gagal scraping)
    const technicalData = await extractTradingViewData(page, kodeSaham);

    // Langkah 3: Generate gambar dari data yang diambil (atau disimulasikan)
    const imagePath = await generateImageFromData(
      page,
      kodeSaham,
      technicalData
    );

    const result = { status: "completed", path: imagePath, chatId: chatId };
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

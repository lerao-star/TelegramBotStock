import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs/promises";
import path from "path";

// Fungsi bantuan untuk mengambil data dari halaman TradingView
// Ini adalah contoh berdasarkan struktur DOM TradingView saat ini (Februari 2024)
// Bisa berubah di masa mendatang
async function extractTradingViewData(page, symbol) {
  console.log(`Mengambil data teknikal untuk ${symbol}...`);

  // Tunggu hingga elemen utama chart muncul
  await page.waitForSelector('[data-name="chart-container"]', {
    timeout: 10000,
  });

  // Kita akan mencoba mengambil nilai dari panel informasi di kiri bawah (kursor di chart)
  // atau dari indikator yang ditampilkan.
  // TradingView seringkali tidak menampilkan MA/MACD secara eksplisit di DOM secara langsung
  // seperti halaman web lain. Mereka sering digambar di canvas.
  // Kita coba ambil data dari panel "Data Window" atau elemen yang muncul saat hover.

  // Contoh: Ambil data harga terkini (Last) - ini biasanya muncul di panel atas
  let lastPrice = null;
  try {
    // Selector untuk harga terakhir bisa berbeda-beda
    // Selector ini hanya contoh dan mungkin tidak akurat
    // const lastPriceElement = await page.$('[data-name="last-price"] span');
    // lastPrice = await lastPriceElement?.evaluate(el => el.textContent);

    // Alternatif: Coba ambil dari panel kiri bawah saat kursor di chart
    // Kita perlu mensimulasikan hover ke chart container
    const chartContainer = await page.$('[data-name="chart-container"]');
    if (chartContainer) {
      await chartContainer.hover();
      // Tunggu sebentar agar data muncul
      await page.waitForTimeout(1000);

      // Coba ambil elemen yang menunjukkan data kursor
      // Ini adalah contoh selector yang mungkin berubah
      // TradingView menggunakan banyak div tanpa kelas unik
      // Kita mungkin perlu mencari elemen berdasarkan teks atau struktur relatif
      // Misalnya, elemen dengan teks "Close" dan mengambil nilai di sebelahnya
      // Selector ini sangat rapuh dan mungkin tidak berfungsi
      // const closeValue = await page.$eval('div.some-class:contains("Close") + div', el => el.textContent);
      // console.log('Close Value:', closeValue);

      // Karena TradingView kompleks, kita fokus ke MA dan MACD via indikator
    }
  } catch (e) {
    console.warn("Gagal mengambil harga terakhir:", e.message);
  }

  // *** MENCARI MA5, MA20, MACD, VOLUME ***
  // Langkah 1: Tambahkan Indikator (ini rumit via Puppeteer)
  // Kita tidak akan menambahkan indikator secara otomatis karena membutuhkan banyak interaksi GUI.

  // Langkah 2: Mencoba mengakses data dari indikator yang *sudah* ditambahkan atau ditampilkan
  // Kita asumsikan beberapa indikator standar mungkin sudah ditampilkan atau bisa diakses via API internal
  // Tapi mengakses API internal TradingView sangat rumit dan tidak stabil.

  // Langkah 3: Mencari elemen teks yang mungkin menunjukkan nilai-nilai ini
  // Ini sangat tidak akurat karena TradingView menggunakan canvas sebagian besar.
  // Kita bisa mencoba mencari teks tertentu di halaman, tapi ini tidak dijamin.

  // Contoh: Mencari teks "MA(" atau "MACD(" di elemen tertentu
  // Ini tidak akan berhasil karena nilai di canvas, bukan teks DOM.
  // const maText = await page.evaluate(() => {
  //   return Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('MA('))?.textContent;
  // });

  // *** PENDEKATAN LAIN: Gunakan Screenshot + OCR (Optical Character Recognition) ***
  // Ini adalah pendekatan yang lebih kompleks dan membutuhkan library tambahan seperti Tesseract.js
  // Kita tidak akan lakukan di sini karena menambah kompleksitas.

  // *** PENDEKATAN LAIN: Gunakan API Data Eksternal ***
  // Ini adalah pendekatan terbaik. Ambil data dari API publik (jika tersedia) atau scraping halaman lain.
  // Kita akan kembalikan null untuk sekarang karena mengambil dari TradingView via Puppeteer sangat sulit.
  // Kita simulasikan data yang diambil.
  console.log("Mengekstrak data dari TradingView sangat sulit dan rapuh.");
  console.log(
    "Idealnya, gunakan API data eksternal atau scraping halaman lain."
  );
  console.log("Mensimulasikan data untuk tujuan demonstrasi.");

  // Simulasi data (GANTILAH INI DENGAN LOGIKA SEBENARNYA UNTUK MENGAMBIL DATA)
  const simulatedData = {
    MA5: 123.45,
    MA20: 121.3,
    MACD: { value: 2.15, signal: 1.98, histogram: 0.17 },
    Volume: "1.234.567",
    Support: 120.0,
    Resistance: 125.0,
    Last: lastPrice, // Dari percobaan sebelumnya
  };

  console.log("Data simulasi:", simulatedData);
  return simulatedData;
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

    // Langkah 1: Navigasi ke TradingView dan ambil data
    await page.goto(`https://www.tradingview.com/chart/?symbol=${kodeSaham}`, {
      waitUntil: "networkidle2",
    });

    // Langkah 2: Ekstrak data teknikal (akan mengembalikan simulasi karena kesulitan scraping)
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

// services/marubozu-scanner.js
import puppeteer from "puppeteer";
import { getHistoricalData } from "../utils/data.js";

const IDX_BOARDS = [
  "Utama",
  "Pengembangan",
  "Akselerasi",
  "Pemantauan Khusus",
  "Ekonomi Baru",
];

async function fetchIDXData(board) {
  const url = `https://www.idx.co.id/primary/StockData/GetSecuritiesStock?start=0&length=9999&code=&sector=&board=${encodeURIComponent(
    board
  )}&language=id-id`;

  console.log(`🌐 Fetching papan ${board}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // Ambil isi halaman (biasanya JSON mentah)
  const rawText = await page.evaluate(() => document.body.innerText);
  await browser.close();

  try {
    const json = JSON.parse(rawText);
    console.log(`✅ ${json.data?.length || 0} saham dari papan ${board}`);
    return json.data || [];
  } catch (err) {
    console.error(`❌ Gagal parse JSON papan ${board}:`, err.message);
    return [];
  }
}

// 🔹 Ambil semua saham dari semua papan
export async function getAllStocks() {
  const allStocks = [];

  for (const board of IDX_BOARDS) {
    const data = await fetchIDXData(board);
    allStocks.push(...data);
    await new Promise((r) => setTimeout(r, 1500)); // jeda antar fetch
  }

  console.log(`📊 Total saham dari semua papan: ${allStocks.length}`);
  return allStocks.map((s) => `${s.Code}.JK`);
}

// 🔹 Deteksi candlestick Marubozu
function detectMarubozu(candle, threshold = 0.01) {
  const { open, high, low, close } = candle;
  const body = Math.abs(close - open);
  if (body === 0) return null;
  const upper = high - Math.max(open, close);
  const lower = Math.min(open, close) - low;
  if (upper / body <= threshold && lower / body <= threshold) {
    return close > open ? "bullish" : "bearish";
  }
  return null;
}

// 🔹 Deteksi Golden Cross
function detectGoldenCross(records) {
  if (records.length < 21) return false;
  const ma5 = records.map((_, i, arr) =>
    i < 4 ? null : arr.slice(i - 4, i + 1).reduce((a, b) => a + b.close, 0) / 5
  );
  const ma20 = records.map((_, i, arr) =>
    i < 19
      ? null
      : arr.slice(i - 19, i + 1).reduce((a, b) => a + b.close, 0) / 20
  );
  const t = records.length - 1;
  return ma5[t] > ma20[t] && ma5[t - 1] <= ma20[t - 1];
}

// 🔹 Main scanner
export async function handleMarubozuScanner(bot, chatId) {
  await bot.sendMessage(
    chatId,
    "🔍 Memindai seluruh saham BEI (5 papan) untuk pola Bullish Marubozu + Golden Cross..."
  );

  const symbols = await getAllStocks();
  const results = [];

  for (let i = 0; i < symbols.length; i += 20) {
    const batch = symbols.slice(i, i + 20);
    console.log(
      `🔄 Batch ${i + 1}-${Math.min(i + 20, symbols.length)} dari ${
        symbols.length
      }`
    );

    const promises = batch.map(async (symbol) => {
      try {
        const records = await getHistoricalData(symbol, 25);
        if (!records || records.length < 21) return null;

        const marubozu = detectMarubozu(records[records.length - 1]);
        const goldenCross = detectGoldenCross(records);

        if (marubozu === "bullish" && goldenCross) {
          const last = records[records.length - 1];
          return { symbol, close: last.close, date: last.date };
        }
      } catch {
        // skip
      }
      return null;
    });

    const batchResults = await Promise.allSettled(promises);
    for (const res of batchResults) {
      if (res.status === "fulfilled" && res.value) results.push(res.value);
    }
  }

  if (results.length === 0) {
    return bot.sendMessage(
      chatId,
      "📉 Tidak ditemukan saham dengan Bullish Marubozu + Golden Cross hari ini."
    );
  }

  let msg = `✅ Ditemukan ${results.length} saham:\n\n`;
  results.forEach((r, i) => {
    msg += `${i + 1}. ${r.symbol} @ Rp${r.close.toLocaleString("id-ID")}\n`;
  });
  msg += `\n📅 Data per: ${results[0]?.date || "hari ini"}`;
  await bot.sendMessage(chatId, msg);
}

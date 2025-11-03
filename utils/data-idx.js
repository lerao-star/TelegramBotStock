// utils/data-idx.js
import puppeteer from "puppeteer";

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

export async function fetchAllSymbols() {
  console.log("📥 Mengambil daftar semua saham dari IDX...");
  const allStocks = [];

  for (const board of IDX_BOARDS) {
    const data = await fetchIDXData(board);
    allStocks.push(...data);
    await new Promise((r) => setTimeout(r, 1000)); // jeda ringan antar papan
  }

  const symbols = allStocks.map((s) => `${s.Code}.JK`);
  console.log(`✅ Total ${symbols.length} simbol saham diperoleh.`);
  return symbols;
}

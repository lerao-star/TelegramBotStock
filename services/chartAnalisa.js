const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const yahooFinance = require("yahoo-finance2").default;
const technicalIndicators = require("technicalindicators");
const path = require("path");

async function generateCandlestickChart(symbol = "BBCA.JK") {
  console.log("🚀 Meluncurkan browser Chromium v119 di Railway...");

  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--single-process",
      "--no-zygote",
    ],
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, "../public/chart.html");

  try {
    await page.goto(`file://${filePath}`, { waitUntil: "networkidle2" });

    // Ambil data dari Yahoo Finance
    const quote = await yahooFinance.quote(symbol);
    const chart = await yahooFinance.chart(symbol, {
      range: "3mo",
      interval: "1d",
    });

    const ohlc = chart.timestamp
      .map((t, i) => ({
        time: t,
        open: chart.indicators.quote[0].open[i],
        high: chart.indicators.quote[0].high[i],
        low: chart.indicators.quote[0].low[i],
        close: chart.indicators.quote[0].close[i],
        volume: chart.indicators.quote[0].volume[i],
      }))
      .filter((d) => d.close !== null);

    const closes = ohlc.map((d) => d.close);

    // Moving averages
    const ma5 = technicalIndicators.SMA.calculate({
      period: 5,
      values: closes,
    });
    const ma20 = technicalIndicators.SMA.calculate({
      period: 20,
      values: closes,
    });

    // Golden / Dead Cross detection
    const crosses = [];
    for (let i = 1; i < ma5.length; i++) {
      if (ma5[i - 1] < ma20[i - 1] && ma5[i] > ma20[i]) {
        crosses.push({ type: "Golden Cross", index: i, price: ohlc[i].high });
      } else if (ma5[i - 1] > ma20[i - 1] && ma5[i] < ma20[i]) {
        crosses.push({ type: "Dead Cross", index: i, price: ohlc[i].low });
      }
    }

    // Support & resistance
    const max = Math.max(...closes);
    const min = Math.min(...closes);
    const range = max - min;
    const supportResistance = {
      R1: max - range * 0.25,
      R2: max - range * 0.5,
      S1: min + range * 0.25,
      S2: min + range * 0.5,
    };

    // Kirim data ke chart.html
    await page.evaluate(
      (data) => {
        window.chartData = data;
        window.renderChart?.();
      },
      { symbol: quote.symbol, ohlc, ma5, ma20, crosses, supportResistance }
    );

    await page.waitForTimeout(2500);
    const screenshot = await page.screenshot({ type: "png" });
    await browser.close();
    return screenshot;
  } catch (err) {
    console.error("❌ Error generate chart:", err);
    await browser.close();
    throw err;
  }
}

module.exports = { generateCandlestickChart };

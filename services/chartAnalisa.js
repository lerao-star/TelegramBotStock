const puppeteer = require("puppeteer-core");
const { executablePath } = require("@sparticuz/chromium");
const yahooFinance = require("yahoo-finance2").default;
const technicalIndicators = require("technicalindicators");

async function generateCandlestickChart(symbol = "BBCA.JK") {
  console.log(`🚀 Memulai chart untuk ${symbol}...`);

  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--single-process",
      "--no-zygote",
      "--disable-dev-shm-usage",
    ],
    executablePath: await executablePath({
      cacheDirectory: "/tmp",
      brotli: false,
    }), // ✅
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  const filePath = require("path").resolve(__dirname, "public/chart.html");

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
    const volumes = ohlc.map((d) => d.volume);

    // Hitung indikator
    const ma5 = technicalIndicators.SMA.calculate({
      period: 5,
      values: closes,
    });
    const ma20 = technicalIndicators.SMA.calculate({
      period: 20,
      values: closes,
    });
    const bb = technicalIndicators.BollingerBands.calculate({
      values: closes,
      period: 20,
      stdDev: 2,
    });
    const macdOutput = technicalIndicators.MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    });
    const rsi = technicalIndicators.RSI.calculate({
      values: closes,
      period: 14,
    });

    // Deteksi Golden/Dead Cross
    const crosses = [];
    for (let i = 1; i < ma5.length; i++) {
      if (ma5[i - 1] < ma20[i - 1] && ma5[i] > ma20[i]) {
        crosses.push({ type: "Golden Cross", index: i, price: ohlc[i].high });
      } else if (ma5[i - 1] > ma20[i - 1] && ma5[i] < ma20[i]) {
        crosses.push({ type: "Dead Cross", index: i, price: ohlc[i].low });
      }
    }

    // Support/Resistance
    const max = Math.max(...closes);
    const min = Math.min(...closes);
    const range = max - min;
    const sr = {
      R1: max - range * 0.25,
      R2: max - range * 0.5,
      S1: min + range * 0.25,
      S2: min + range * 0.5,
    };

    // Kirim data ke halaman HTML
    await page.evaluate(
      (data) => {
        window.chartData = data;
        window.renderChart?.();
      },
      {
        symbol: quote.symbol,
        price: quote.regularMarketPrice,
        ohlc,
        ma5: technicalIndicators.padStart(ma5, closes.length),
        ma20: technicalIndicators.padStart(ma20, closes.length),
        bbUpper: technicalIndicators.padStart(bb.upper, closes.length),
        bbLower: technicalIndicators.padStart(bb.lower, closes.length),
        macd: technicalIndicators.padStart(macdOutput.MACD, closes.length),
        signal: technicalIndicators.padStart(macdOutput.signal, closes.length),
        histogram: technicalIndicators.padStart(
          macdOutput.histogram,
          closes.length
        ),
        rsi: technicalIndicators.padStart(rsi, closes.length),
        volume: volumes,
        crosses,
        supportResistance: sr,
      }
    );

    await page.waitForTimeout(2500);
    const screenshot = await page.screenshot({ type: "png" });
    await browser.close();
    return screenshot;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

module.exports = { generateCandlestickChart };

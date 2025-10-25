// src/utils/chart.js
import puppeteer from "puppeteer-core"; // Ganti dengan puppeteer-core
import chromium from "@sparticuz/chromium"; // Impor chromium engine
import fs from "fs";
import path from "path";

const HTML_PATH = path.resolve("src/templates/chart.html");

if (!fs.existsSync(HTML_PATH)) {
  throw new Error("File templates/chart.html tidak ditemukan!");
}

// ... (fungsi-fungsi lainnya seperti calcSMA, detectSwingPoints, calculateSupportResistance, calculateMACD, analyzeTrends, normalizeDate tetap sama) ...

// Fungsi calcSMA
function calcSMA(records, period) {
  return records.map((_, i, arr) => {
    if (i < period - 1) return null;
    const sum = arr
      .slice(i - period + 1, i + 1)
      .reduce((acc, r) => acc + r.close, 0);
    return sum / period;
  });
}

// Fungsi detectSwingPoints
function detectSwingPoints(records, window = 2) {
  const swingLows = [];
  const swingHighs = [];

  for (let i = window; i < records.length - window; i++) {
    const currentLow = records[i].low;
    const currentHigh = records[i].high;

    let isSwingLow = true;
    for (let j = 1; j <= window; j++) {
      if (
        currentLow >= records[i - j].low ||
        currentLow >= records[i + j].low
      ) {
        isSwingLow = false;
        break;
      }
    }

    let isSwingHigh = true;
    for (let j = 1; j <= window; j++) {
      if (
        currentHigh <= records[i - j].high ||
        currentHigh <= records[i + j].high
      ) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingLow) {
      swingLows.push({ price: currentLow });
    }
    if (isSwingHigh) {
      swingHighs.push({ price: currentHigh });
    }
  }

  return { swingLows, swingHighs };
}

// Fungsi calculateSupportResistance (sama seperti sebelumnya)
export function calculateSupportResistance(records, lookback = 60, levels = 5) {
  if (records.length === 0) {
    return {
      supports: Array(levels).fill(null),
      resistances: Array(levels).fill(null),
    };
  }

  const recent = records.slice(-Math.min(lookback, records.length));
  const currentPrice = recent[recent.length - 1].close;

  const { swingLows, swingHighs } = detectSwingPoints(recent, 2);

  const supports = [...new Set(swingLows.map((s) => s.price))]
    .filter((p) => p < currentPrice)
    .sort((a, b) => b - a)
    .slice(0, levels);

  const resistances = [...new Set(swingHighs.map((s) => s.price))]
    .filter((p) => p > currentPrice)
    .sort((a, b) => a - b)
    .slice(0, levels);

  const resultSupports = Array(levels).fill(null);
  const resultResistances = Array(levels).fill(null);

  for (let i = 0; i < levels; i++) {
    resultSupports[i] = supports[i] ?? null;
    resultResistances[i] = resistances[i] ?? null;
  }

  return { supports: resultSupports, resistances: resultResistances };
}

// Fungsi calculateMACD (sama seperti sebelumnya)
function calculateMACD(records) {
  const EMA = (values, period) => {
    const k = 2 / (period + 1);
    const ema = [values[0]];
    for (let i = 1; i < values.length; i++) {
      ema[i] = values[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
  };

  const closes = records.map((r) => r.close);
  const ema12 = EMA(closes, 12);
  const ema26 = EMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = EMA(macdLine.slice(25), 9);
  const histogram = macdLine.slice(33).map((m, i) => m - signalLine[i]);

  const macdData = [],
    signalData = [],
    histData = [];
  for (let i = 33; i < records.length; i++) {
    const date = records[i].date;
    macdData.push({ time: date, value: macdLine[i] });
    signalData.push({ time: date, value: signalLine[i - 33] });
    histData.push({
      time: date,
      value: histogram[i - 33],
      color: histogram[i - 33] >= 0 ? "rgba(0,200,0,0.7)" : "rgba(200,0,0,0.7)",
    });
  }
  return { macdData, signalData, histData };
}

// Fungsi analyzeTrends (sama seperti sebelumnya)
function analyzeTrends(records, ma5, ma20) {
  const annotations = [];
  for (let i = 1; i < records.length; i++) {
    const prev = ma5[i - 1] - ma20[i - 1];
    const curr = ma5[i] - ma20[i];
    const price = records[i].close;

    if (prev < 0 && curr > 0) {
      annotations.push({
        time: records[i].date,
        value: price,
        text: "Golden Cross",
        color: "green",
        direction: "up",
      });
    } else if (prev > 0 && curr < 0) {
      annotations.push({
        time: records[i].date,
        value: price,
        text: "Dead Cross",
        color: "red",
        direction: "down",
      });
    }
  }

  const lastIdx = records.length - 1;
  const phase =
    ma5[lastIdx] > ma20[lastIdx] ? "Bullish Phase" : "Bearish Phase";
  annotations.push({
    time: records[lastIdx].date,
    value: records[lastIdx].close,
    text: phase,
    color: ma5[lastIdx] > ma20[lastIdx] ? "blue" : "red",
  });

  return annotations;
}

// Fungsi normalizeDate (sama seperti sebelumnya)
function normalizeDate(dateStr) {
  if (typeof dateStr === "string") {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  if (typeof dateStr === "number") {
    return new Date(dateStr).toISOString().split("T")[0];
  }
  return "2024-01-01";
}

export async function generateChartImage(
  symbol,
  records,
  { supports: inputSupports, resistances: inputResistances } = {}
) {
  const LIMIT_CANDLES = 300;
  const inputRecords =
    records.length > LIMIT_CANDLES ? records.slice(-LIMIT_CANDLES) : records;

  const normalizedRecords = inputRecords.map((r) => ({
    ...r,
    date: normalizeDate(r.date),
  }));

  const ma5 = calcSMA(normalizedRecords, 5);
  const ma20 = calcSMA(normalizedRecords, 20);

  // 🔁 Gunakan input dari luar, fallback ke internal
  let finalSupports = inputSupports;
  let finalResistances = inputResistances;

  if (!finalSupports || !finalResistances) {
    const autoSR = calculateSupportResistance(records, 90, 5); // ✅ autoSR didefinisikan
    finalSupports = finalSupports ?? autoSR.supports;
    finalResistances = finalResistances ?? autoSR.resistances;
  }

  const s1 = finalSupports[0] ?? null;
  const r1 = finalResistances[0] ?? null;

  const { macdData, signalData, histData } = calculateMACD(normalizedRecords);
  const annotations = analyzeTrends(normalizedRecords, ma5, ma20);
  const volumeData = normalizedRecords.map((r) => ({
    time: r.date,
    value: r.volume,
  }));

  // Ganti puppeteer.launch dengan yang menggunakan @sparticuz/chromium
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      ...chromium.args, // Gunakan args dari @sparticuz/chromium
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    executablePath: await chromium.executablePath(), // Gunakan executablePath dari @sparticuz/chromium
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    const html = fs.readFileSync(HTML_PATH, "utf8");
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    await page.waitForFunction(() => window.chartReady === true, {
      timeout: 30000,
    });

    const supLine =
      s1 !== null
        ? normalizedRecords.map((r) => ({ time: r.date, value: s1 }))
        : [];
    const resLine =
      r1 !== null
        ? normalizedRecords.map((r) => ({ time: r.date, value: r1 }))
        : [];

    await page.evaluate(
      (
        records,
        ma5,
        ma20,
        supLine,
        resLine,
        macdData,
        signalData,
        histData,
        annotations,
        volumeData
      ) => {
        const candles = [],
          ma5Data = [],
          ma20Data = [];

        for (let i = 0; i < records.length; i++) {
          const r = records[i];
          candles.push({
            time: r.date,
            open: r.open,
            high: r.high,
            low: r.low,
            close: r.close,
          });
          if (ma5[i] != null) ma5Data.push({ time: r.date, value: ma5[i] });
          if (ma20[i] != null) ma20Data.push({ time: r.date, value: ma20[i] });
        }

        window.candleSeries.setData(candles);
        window.ma5Series.setData(ma5Data);
        window.ma20Series.setData(ma20Data);
        window.supportSeries.setData(supLine);
        window.resistanceSeries.setData(resLine);
        window.macdSeries.setData(macdData);
        window.signalSeries.setData(signalData);
        window.histogramSeries.setData(histData);
        if (window.volumeSeries) window.volumeSeries.setData(volumeData);

        const markers = annotations.map((a) => ({
          time: a.time,
          position: a.direction === "down" ? "belowBar" : "aboveBar",
          color: a.color,
          shape: a.direction === "down" ? "arrowDown" : "arrowUp",
          text: a.text,
        }));
        window.candleSeries.setMarkers(markers);
      },
      normalizedRecords,
      ma5,
      ma20,
      supLine,
      resLine,
      macdData,
      signalData,
      histData,
      annotations,
      volumeData
    );

    await new Promise((resolve) => setTimeout(resolve, 800));
    // Kembalikan buffer screenshot, bukan menyimpan ke file
    return await page.screenshot({
      clip: { x: 0, y: 0, width: 1200, height: 800 },
    });
  } finally {
    await browser.close();
  }
}

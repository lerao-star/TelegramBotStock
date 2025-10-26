// utils/data.js
import axios from "axios";

/**
 * Ambil data historis saham dari Yahoo Finance
 * @param {string} symbol - Contoh: "BBCA.JK"
 * @param {number} days - Jumlah hari terakhir (default: 60)
 * @returns {Promise<Array|null>} Array data OHLC atau null jika gagal
 */
export async function getHistoricalData(symbol) {
  // Pastikan simbol valid
  if (!symbol || typeof symbol !== "string") return null;

  // URL Yahoo Finance (berfungsi di luar Tiongkok, termasuk Indonesia)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=ytd`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StockBot/1.0)",
      },
      timeout: 10000,
    });

    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      return null;
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const records = [];

    for (let i = 0; i < timestamps.length; i++) {
      // Pastikan semua nilai ada dan valid
      if (
        quotes.open?.[i] != null &&
        quotes.high?.[i] != null &&
        quotes.low?.[i] != null &&
        quotes.close?.[i] != null
      ) {
        records.push({
          date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
          open: parseFloat(quotes.open[i]),
          high: parseFloat(quotes.high[i]),
          low: parseFloat(quotes.low[i]),
          close: parseFloat(quotes.close[i]),
          volume: quotes.volume?.[i] || 0,
        });
      }
    }

    // Minimal 20 data untuk analisis dasar
    return records.length >= 20 ? records : null;
  } catch (err) {
    console.error(`📡 Gagal ambil data ${symbol}:`, err.message);
    return null;
  }
}

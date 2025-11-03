// services/marubozu-detector.js
import { getHistoricalData } from "../utils/data.js";

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

function formatPrice(price) {
  return parseFloat(price).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
  });
}

export async function handleMarubozuDetection(bot, chatId, symbol) {
  await bot.sendMessage(chatId, `🔍 Memeriksa Marubozu untuk ${symbol}...`);
  const records = await getHistoricalData(symbol, 5);
  if (!records) {
    return bot.sendMessage(chatId, `❌ Data tidak tersedia untuk ${symbol}.`);
  }

  const candle = records[records.length - 1];
  const pattern = detectMarubozu(candle);

  let msg = `🕯️ Candle Terakhir: ${symbol}\n`;
  msg += `📅 ${candle.date}\n`;
  msg += `💰 Open: Rp${formatPrice(candle.open)}\n`;
  msg += `📈 High: Rp${formatPrice(candle.high)}\n`;
  msg += `📉 Low: Rp${formatPrice(candle.low)}\n`;
  msg += `💰 Close: Rp${formatPrice(candle.close)}\n\n`;

  if (pattern === "bullish") {
    msg += "✅ **Bullish Marubozu!**\n➡️ Pembeli dominan sepanjang sesi.";
  } else if (pattern === "bearish") {
    msg += "⚠️ **Bearish Marubozu!**\n➡️ Penjual dominan sepanjang sesi.";
  } else {
    msg += "ℹ️ Tidak ada pola Marubozu.";
  }

  await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

import {
  generateChartImage,
  calculateSupportResistance,
} from "../utils/chart.js";
import { getHistoricalData } from "../utils/data.js";

export async function handleTechnicalAnalysis(
  bot,
  chatId,
  symbol,
  onProgress = () => {}
) {
  await onProgress(5, `Memulai analisis untuk ${symbol}...`);

  await onProgress(20, "Mengambil data historis...");
  const records = await getHistoricalData(symbol, 60);
  if (!records || records.length === 0) {
    await onProgress(100, "Gagal: Data tidak tersedia.");
    return bot.sendMessage(chatId, `❌ Data tidak tersedia untuk ${symbol}.`);
  }

  // 🔹 Hitung 3 level S/R
  const { supports, resistances } = calculateSupportResistance(records, 30, 3);

  await onProgress(50, "Membuat grafik teknikal...");
  const screenshot = await generateChartImage(symbol, records, {
    supports,
    resistances,
  });
  if (!screenshot) {
    await onProgress(100, "Gagal: Tidak bisa membuat grafik.");
    return bot.sendMessage(chatId, `❌ Gagal membuat grafik untuk ${symbol}.`);
  }

  await onProgress(90, "Menyiapkan hasil...");

  const last = records[records.length - 1];
  let msg = `📊 Analisis Teknikal ${symbol}\n`;
  msg += `💰 Close: Rp${last.close.toLocaleString("id-ID")}\n\n`;

  // Resistance
  const validResistances = resistances.filter((r) => r !== null);
  if (validResistances.length > 0) {
    msg += `🔴 Resistance:\n`;
    validResistances.forEach((r, i) => {
      msg += `  R${i + 1}: Rp${r.toLocaleString("id-ID")}\n`;
    });
    msg += `\n`;
  }

  // Support
  const validSupports = supports.filter((s) => s !== null);
  if (validSupports.length > 0) {
    msg += `🟢 Support:\n`;
    validSupports.forEach((s, i) => {
      msg += `  S${i + 1}: Rp${s.toLocaleString("id-ID")}\n`;
    });
  }

  await bot.sendPhoto(chatId, screenshot, { caption: msg.trim() });
  await onProgress(100, "Selesai!");
}

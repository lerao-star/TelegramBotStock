// services/breakout-scanner.js
import { fetchAllSymbols } from "../utils/data-idx.js";
import { getHistoricalData } from "../utils/data.js";

// ─── Logika Analisis Teknikal ───────────────────────────────────────
function detectBreakResistance(records, lookback = 10) {
  if (records.length < lookback + 1) return false;
  const recent = records.slice(-lookback - 1);
  const today = recent[recent.length - 1];
  const pastHighs = recent.slice(0, -1).map((r) => r.high);
  const resistance = Math.max(...pastHighs);
  return today.close > resistance;
}

function detectHighVolume(records, threshold = 1.5) {
  if (records.length < 6) return false;
  const today = records[records.length - 1];
  const last5 = records.slice(-6, -1);
  const avgVol = last5.reduce((sum, r) => sum + r.volume, 0) / last5.length;
  return today.volume > avgVol * threshold;
}

function isAboveMA20(records) {
  if (records.length < 20) return false;
  const ma20 = records.slice(-20).reduce((sum, r) => sum + r.close, 0) / 20;
  return records[records.length - 1].close > ma20;
}

// ─── Scanner Utama dengan Edit Pesan Progress ───────────────────────
export async function handleBreakoutScanner(bot, chatId, limitInput = "5") {
  // Langkah 0: Parse limit
  let limit;
  if (limitInput === "all") {
    limit = Infinity; // tampilkan semua
  } else {
    const num = parseInt(limitInput, 10);
    limit = isNaN(num) || num <= 0 ? 5 : num;
  }

  // Kirim pesan awal
  let progressMsg = await bot.sendMessage(
    chatId,
    "📥 Mengambil daftar saham dari IDX..."
  );

  const symbols = await fetchAllSymbols();
  if (symbols.length === 0) {
    await bot.editMessageText("❌ Gagal mengambil daftar saham.", {
      chat_id: chatId,
      message_id: progressMsg.message_id,
    });
    return;
  }

  await bot.editMessageText(
    `✅ Ditemukan ${symbols.length} saham. Memulai pemindaian breakout...`,
    {
      chat_id: chatId,
      message_id: progressMsg.message_id,
    }
  );

  const total = symbols.length;
  const results = [];
  let processed = 0;
  let lastUpdatePercent = 0;

  const updateProgress = async (percent) => {
    const currentPercent = Math.min(100, Math.floor(percent));
    if (currentPercent > lastUpdatePercent) {
      lastUpdatePercent = currentPercent;
      try {
        await bot.editMessageText(
          `⏳ Pemindaian ${currentPercent}% selesai...`,
          {
            chat_id: chatId,
            message_id: progressMsg.message_id,
          }
        );
      } catch (err) {
        console.warn("Gagal edit pesan progress:", err.message);
      }
    }
  };

  // Proses batch
  for (let i = 0; i < symbols.length; i += 20) {
    const batch = symbols.slice(i, i + 20);
    const promises = batch.map(async (symbol) => {
      try {
        const records = await getHistoricalData(symbol, 25);
        if (!records || records.length < 11) return null;

        const brokeRes = detectBreakResistance(records, 10);
        const highVol = detectHighVolume(records, 1.5);
        const aboveMA20 = isAboveMA20(records);

        if (brokeRes && highVol && aboveMA20) {
          const last = records[records.length - 1];
          return {
            symbol: last.symbol || symbol,
            close: last.close,
            open: last.open,
            volume: last.volume,
            date: last.date,
          };
        }
      } catch (err) {
        console.warn(`⚠️ Error pada ${symbol}:`, err.message);
      }
      return null;
    });

    const batchResults = await Promise.allSettled(promises);
    for (const res of batchResults) {
      if (res.status === "fulfilled" && res.value) {
        results.push(res.value);
      }
    }

    processed += batch.length;
    const percent = Math.min(100, Math.floor((processed / total) * 100));
    await updateProgress(percent);
    await new Promise((r) => setTimeout(r, 500));
  }

  // === TAMPILKAN HASIL DENGAN LIMIT DINAMIS ===
  if (results.length === 0) {
    await bot.editMessageText(
      "📉 Tidak ditemukan saham yang memenuhi kriteria:\n" +
        "• Break resistance (10 hari)\n" +
        "• Volume > 1.5x rata-rata 5 hari\n" +
        "• Harga di atas MA20",
      {
        chat_id: chatId,
        message_id: progressMsg.message_id,
        parse_mode: "HTML",
      }
    );
    return;
  }

  // Terapkan limit
  const isAll = limit === Infinity;
  const displayCount = isAll ? results.length : Math.min(limit, results.length);
  const displayedResults = results.slice(0, displayCount);

  let resultText = `✅ <b>Breakout Scanner - ${
    results[0]?.date || "Hari Ini"
  }</b>\n\n`;
  resultText += `<b>Kriteria:</b>\n`;
  resultText += `• Break resistance (10 hari)\n`;
  resultText += `• Volume > 1.5x rata-rata 5 hari\n`;
  resultText += `• Harga di atas MA20\n\n`;

  resultText += `<b>Hasil (${results.length} saham ditemukan)</b>:\n`;
  resultText += `────────────────────\n`;

  displayedResults.forEach((r, i) => {
    const price = r.close.toLocaleString("id-ID");
    const vol = (r.volume / 1_000_000).toFixed(1);

    let changeText = "";
    if (r.open && r.open > 0) {
      const change = ((r.close - r.open) / r.open) * 100;
      const sign = change >= 0 ? "+" : "";
      const emoji = change >= 0 ? "🟢" : "🔴";
      changeText = ` ${emoji} ${sign}${change.toFixed(2)}%`;
    }

    resultText += `${i + 1}. <b>${r.symbol}</b>\n`;
    resultText += `   💰 Rp ${price}\n`;
    resultText += `   📊 Vol: ${vol} juta${changeText}\n`;
    resultText += `────────────────────\n`;
  });

  if (!isAll && results.length > limit) {
    resultText += `\n<i>💡 Menampilkan ${displayCount} dari ${results.length} saham.</i>`;
  }

  await bot.editMessageText(resultText, {
    chat_id: chatId,
    message_id: progressMsg.message_id,
    parse_mode: "HTML",
  });
}

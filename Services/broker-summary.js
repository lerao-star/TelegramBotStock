// services/broker-summary.js
import axios from "axios";
import dotenv from "dotenv";
import { getDateRange, formatNumber } from "../helpers/range-date.js";

// Muat .env (jika belum dimuat di index.js)
dotenv.config();

const BEARER_TOKEN = process.env.STOCKBIT_BEARER_TOKEN;

if (!BEARER_TOKEN) {
  console.warn(
    "⚠️ STOCKBIT_BEARER_TOKEN tidak ditemukan di .env. Broker Summary mungkin gagal."
  );
}

async function fetchBrokerSummary(symbol, dateConfig) {
  const range = getDateRange(dateConfig);
  const { from, to } = range;

  const url = `https://exodus.stockbit.com/marketdetectors/${symbol}?from=${from}&to=${to}&transaction_type=TRANSACTION_TYPE_NET&market_board=MARKET_BOARD_REGULER&investor_type=INVESTOR_TYPE_ALL&limit=25`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        Authorization: BEARER_TOKEN ? `Bearer ${BEARER_TOKEN}` : undefined,
      },
      timeout: 8000,
    });

    if (data?.data?.broker_summary?.brokers_buy) {
      return {
        brokersBuy: data.data.broker_summary.brokers_buy,
        symbol,
        startdate: from,
        enddate: to,
        periodLabel: range.label,
      };
    }
    return null;
  } catch (err) {
    console.error(
      `❌ Gagal ambil broker summary untuk ${symbol}:`,
      err.message
    );
    if (err.response?.status === 401) {
      console.error("❗ Token Stockbit kemungkinan sudah kadaluarsa.");
    }
    return null;
  }
}

export async function handleBrokerSummary(bot, chatId, symbol, config) {
  if (!BEARER_TOKEN) {
    return bot.sendMessage(
      chatId,
      "🔒 Fitur Broker Summary memerlukan token akses. Hubungi admin bot."
    );
  }

  const range = getDateRange(config);
  await bot.sendMessage(
    chatId,
    `🔍 Mengambil Broker Summary untuk ${symbol} (${range.label})...`
  );

  const result = await fetchBrokerSummary(symbol, config);

  if (!result || !result.brokersBuy || result.brokersBuy.length === 0) {
    return bot.sendMessage(
      chatId,
      `📊 Tidak ada data Broker Summary untuk ${symbol} pada periode ini.`
    );
  }

  let msg = `📊 Broker Summary: ${symbol}\n📅 ${result.startdate} – ${result.enddate}\n\n`;

  const top5 = result.brokersBuy.slice(0, 5);
  top5.forEach((broker, i) => {
    const buyValue = parseFloat(broker.bval);
    const buyVol = parseInt(broker.blot);
    const avgPrice = Math.round(broker.netbs_buy_avg_price);
    msg += `${i + 1}. **${broker.netbs_broker_code}** (${broker.type})\n`;
    msg += `   💰 Beli: Rp${formatNumber(buyValue)}\n`;
    msg += `   📦 Volume: ${formatNumber(buyVol)}\n`;
    msg += `   💵 Avg Price: ${formatNumber(avgPrice)}\n\n`;
  });

  await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

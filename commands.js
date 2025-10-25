const axios = require("axios");
const { generateStockChart } = require("./services/chartAnalisa");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

async function handleAnalysis(chatId, args) {
  const symbol = args || "BBCA.JK";

  try {
    const imageBuffer = await generateCandlestickChart(symbol);

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(
      "photo",
      new Blob([imageBuffer], { type: "image/png" }),
      `${symbol}.png`
    );

    await axios.post(`${TELEGRAM_API}/sendPhoto`, form, {
      headers: form.getHeaders(),
    });

    console.log(`✅ Chart ${symbol} terkirim ke ${chatId}`);
  } catch (err) {
    console.error("❌ Gagal kirim chart:", err);
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `⚠️ Gagal membuat grafik untuk ${symbol}. Coba lagi nanti.`,
    });
  }
}

async function handleNews(chatId, args) {
  return `📰 Berita terkini: "${args || "umum"}"`;
}

async function handleBEI(chatId, args) {
  return `📊 Data BEI: "${args || "IHSG"}" sedang diambil...`;
}

async function handleBroksum(chatId, args) {
  return `📊 Data BEI: "${args || "IHSG"}" sedang diambil...`;
}

module.exports = {
  handleAnalysis,
  handleNews,
  handleBEI,
  handleBroksum,
};

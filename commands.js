const axios = require("axios");
const { generateCandlestickChart } = require("./services/chartAnalisa");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

async function handleAnalysis(chatId, args) {
  if (!symbol) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "⚠️ Format salah!\nGunakan: /analisa [kode_saham]\nContoh: /analisa BBCA.JK",
    });
    return;
  }

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `📊 Menganalisis saham *${symbol}*... tunggu sebentar.`,
      parse_mode: "Markdown",
    });

    const imageBuffer = await generateCandlestickChart(symbol);

    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("photo", imageBuffer, {
      filename: `${symbol}.png`,
      contentType: "image/png",
    });

    await axios.post(`${TELEGRAM_API}/sendPhoto`, formData, {
      headers: formData.getHeaders(),
    });

    console.log(`✅ Chart ${symbol} terkirim ke Telegram`);
  } catch (err) {
    console.error("❌ Gagal generate chart:", err);
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `❌ Gagal menganalisa ${symbol}.`,
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

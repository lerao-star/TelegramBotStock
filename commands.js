async function handleAnalysis(chatId, args) {
  return `🔍 Analisis untuk: "${args || "tidak ada input"}" sedang diproses...`;
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

import axios from "axios";
import parser from "xml2js";

async function fetchNews(symbol) {
  const query = `${symbol} site:kontan.co.id OR site:cnbcindonesia.com OR site:investor.id`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=id&gl=ID&ceid=ID:id`;

  try {
    const res = await axios.get(url, { timeout: 8000 });
    const result = await parser.parseStringPromise(res.data);
    const items = result.rss?.channel?.[0]?.item || [];
    return items.slice(0, 3).map((item) => ({
      title: item.title[0],
      link: item.link[0],
      date: new Date(item.pubDate[0]).toLocaleDateString("id-ID"),
    }));
  } catch (err) {
    return [];
  }
}

export async function handleNews(bot, chatId, symbol) {
  await bot.sendMessage(chatId, `🔍 Mencari berita untuk ${symbol}...`);
  const news = await fetchNews(symbol);

  if (news.length === 0) {
    return bot.sendMessage(
      chatId,
      `📰 Tidak ada berita ditemukan untuk ${symbol} dalam 7 hari terakhir.`
    );
  }

  let msg = `📰 Berita Terkini: ${symbol}\n\n`;
  news.forEach((n, i) => {
    msg += `${i + 1}. [${n.title}](${n.link})\n📅 ${n.date}\n\n`;
  });

  await bot.sendMessage(chatId, msg, {
    parse_mode: "Markdown",
    disable_web_page_preview: false,
  });
}

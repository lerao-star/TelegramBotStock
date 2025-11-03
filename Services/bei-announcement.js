import cloudscraper from "cloudscraper";

function formatDateForBEI(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function fetchBEIAnnouncements(symbol) {
  const code = symbol.replace(".JK", "").toUpperCase();
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const dateFrom = formatDateForBEI(sevenDaysAgo);
  const dateTo = formatDateForBEI(today);

  const url = `https://www.idx.co.id/primary/ListedCompany/GetAnnouncement?kodeEmiten=${code}&emitenType=*&indexFrom=0&pageSize=20&dateFrom=${dateFrom}&dateTo=${dateTo}&lang=id`;

  console.log(`🔍 Mengambil data BEI: ${url}`);

  try {
    const response = await cloudscraper.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        Referer:
          "https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi",
      },
      timeout: 10000,
    });

    const data = JSON.parse(response);
    const replies = data?.Replies || [];

    const announcements = [];

    for (const reply of replies) {
      const pengumuman = reply.pengumuman;
      const attachments = reply.attachments || [];

      if (!pengumuman || attachments.length === 0) continue;

      const urls = attachments
        .map((att) => att.FullSavePath?.trim())
        .filter((url) => url && url.startsWith("http"));

      if (urls.length > 0) {
        announcements.push({
          title: pengumuman.JudulPengumuman || "Dokumen Tanpa Judul",
          date: new Date(pengumuman.TglPengumuman).toLocaleDateString("id-ID"),
          urls, // ← semua URL
        });
      }
    }

    return announcements;
  } catch (err) {
    console.error(`❌ Gagal ambil data BEI untuk ${symbol}:`, err.message);
    return [];
  }
}

export async function handleBEIAnnouncement(bot, chatId, symbol) {
  await bot.sendMessage(
    chatId,
    `🔍 Mengecek keterbukaan informasi ${symbol}...`
  );
  const announcements = await fetchBEIAnnouncements(symbol);

  if (announcements.length === 0) {
    return bot.sendMessage(
      chatId,
      `📑 Tidak ada pengumuman resmi dari BEI untuk ${symbol} dalam 7 hari terakhir.`
    );
  }

  let msg = `📑 Keterbukaan Informasi: ${symbol}\n\n`;

  announcements.forEach((ann, i) => {
    msg += `${i + 1}. **${ann.title}**\n`;
    ann.urls.forEach((url, j) => {
      const label = j === 0 ? "📄 Dokumen Utama" : `📎 Lampiran ${j}`;
      msg += `   - [${label}](${url})\n`;
    });
    msg += `📅 ${ann.date}\n\n`;
  });

  await bot.sendMessage(chatId, msg, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
}

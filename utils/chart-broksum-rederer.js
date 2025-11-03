import puppeteer from "puppeteer";

export async function renderHtmlToImage(html, width = 800, height = 500) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: "networkidle0" });
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

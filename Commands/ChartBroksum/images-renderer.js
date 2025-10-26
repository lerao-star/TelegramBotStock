import puppeteer from "puppeteer";
import { BROKER_COLORS } from "./helpers.js";
import fs from "fs";

/**
 * Generate HTML string untuk chart
 */
function generateChartHtml(symbol, rangeLabel, chartData) {
  const safeSymbol = symbol.replace(/[<>"&]/g, "");
  const safeRange = rangeLabel.replace(/[<>"&]/g, "");
  const { labels, datasets, priceRange, valueRange } = chartData;

  // Ambil hanya dataset broker (bukan Price)
  const brokerDatasets = datasets.filter((ds) => ds.label !== "Price");

  // Buat legenda HTML
  const legendItems = brokerDatasets
    .map(
      (ds) =>
        `<div style="display:inline-block;margin-right:15px;vertical-align:middle">
      <div style="display:inline-block;width:12px;height:4px;background-color:${ds.borderColor};margin-right:4px"></div>
      <span style="font-size:12px">${ds.label}</span>
    </div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Broker Flow - ${safeSymbol}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { margin: 0; font-family: sans-serif; background: white; }
    .container { width: 800px; height: 520px; padding: 20px; box-sizing: border-box; }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 16px; font-size: 14px; }
    .legend { margin-top: 10px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">Broker Flow</div>
    <div class="subtitle">${safeSymbol.toUpperCase()} • ${safeRange}</div>
    <canvas id="chart" width="800" height="400"></canvas>
    <div class="legend">
      ${legendItems}
    </div>
  </div>
  <script>
    const ctx = document.getElementById('chart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: ${JSON.stringify(datasets)}
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const val = ctx.parsed.y;
                if (ctx.dataset.yAxisID === 'y1') return ctx.dataset.label + ': ' + val.toFixed(0);
                const sign = val >= 0 ? '+' : '';
                return ctx.dataset.label + ': ' + sign + Math.abs(val).toLocaleString();
              }
            }
          }
        },
        scales: {
          x: { 
            title: { display: true, text: 'Date' }, 
            grid: { display: false } 
          },
          y: {
            position: 'left',
            title: { display: true, text: 'Value (IDR)' },
            min: ${valueRange.min - 1e7},
            max: ${valueRange.max + 1e7},
            ticks: {
              callback: function(v) {
                if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M';
                if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
                return v;
              }
            }
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'Price' },
            min: ${Math.floor(priceRange.min - 5)},
            max: ${Math.ceil(priceRange.max + 5)},
            grid: { drawOnChartArea: false },
            ticks: { stepSize: 5 }
          }
        }
      }
    });
  </script>
</body>
</html>
`;
}
/**
 * Render HTML menjadi buffer gambar
 */
export async function renderChartToImage(symbol, rangeLabel, chartData) {
  const html = generateChartHtml(symbol, rangeLabel, chartData);
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage(); // ✅ "page" didefinisikan di sini
    await page.setViewport({ width: 800, height: 600 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.screenshot({ type: "png" });

    return buffer;
  } catch (err) {
    console.error("Puppeteer error:", err);
    throw new Error("Gagal merender grafik: " + err.message);
  } finally {
    if (browser) await browser.close();
  }
}

export function generateChartHtml(symbol, rangeLabel, chartData) {
  const safeSymbol = symbol.replace(/[<>"&]/g, "");
  const safeRange = rangeLabel.replace(/[<>"&]/g, "");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Broker Flow - ${safeSymbol}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { margin: 0; font-family: sans-serif; background: white; }
    .container { width: 800px; height: 500px; padding: 20px; box-sizing: border-box; }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 16px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">Broker Flow</div>
    <div class="subtitle">${safeSymbol.toUpperCase()} • ${safeRange}</div>
    <canvas id="chart" width="800" height="400"></canvas>
  </div>
  <script>
    const ctx = document.getElementById('chart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
       ${JSON.stringify(chartData)},
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
          x: { title: { display: true, text: 'Date' }, grid: { display: false } },
          y: {
            position: 'left',
            title: { display: true, text: 'Value (IDR)' },
            min: ${chartData.valueRange.min - 1e7},
            max: ${chartData.valueRange.max + 1e7},
            ticks: {
              callback: v => {
                if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M';
                if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
                return v;
              }
            }
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'Price' },
            min: ${Math.floor(chartData.priceRange.min - 5)},
            max: ${Math.ceil(chartData.priceRange.max + 5)},
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

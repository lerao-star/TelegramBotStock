const express = require("express");
const yahooFinance = require("yahoo-finance2").default;
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi canvas
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

app.get("/chart", async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res
      .status(400)
      .json({ error: "Symbol required. Example: ?symbol=BBCA.JK" });
  }

  try {
    // Ambil data historis 30 hari
    const result = await yahooFinance.historical(symbol, {
      period1: "30d",
      interval: "1d",
    });

    if (result.length === 0) {
      return res.status(404).json({ error: "No data found for symbol" });
    }

    // Urutkan dari lama ke baru
    const data = result.sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = data.map((d) => d.date.split("T")[0]);
    const closes = data.map((d) => d.close);
    const volumes = data.map((d) => d.volume);

    // Hitung MA5 dan MA20
    const ma = (arr, window) => {
      const result = [];
      for (let i = 0; i < arr.length; i++) {
        if (i < window - 1) {
          result.push(null);
        } else {
          const sum = arr
            .slice(i - window + 1, i + 1)
            .reduce((a, b) => a + b, 0);
          result.push(sum / window);
        }
      }
      return result;
    };

    const ma5 = ma(closes, 5);
    const ma20 = ma(closes, 20);

    // Konfigurasi chart
    const configuration = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Close",
            data: closes,
            borderColor: "#3399FF",
            borderWidth: 2,
            fill: false,
            yAxisID: "y",
          },
          {
            label: "MA5",
            data: ma5,
            borderColor: "#FF6600",
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            yAxisID: "y",
          },
          {
            label: "MA20",
            data: ma20,
            borderColor: "#00CC66",
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            yAxisID: "y",
          },
          {
            label: "Volume",
            data: volumes,
            type: "bar",
            backgroundColor: "rgba(150,150,150,0.3)",
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: `Analisa Teknikal: ${symbol}`,
          },
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            grid: { drawOnChartArea: false },
          },
        },
      },
    };

    // Generate gambar
    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": image.length,
    });
    res.end(image);
  } catch (err) {
    console.error("Error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to generate chart", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Chart API running on port ${PORT}`);
});

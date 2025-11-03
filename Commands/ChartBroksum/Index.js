import { getDateRange } from "../../shared/Utils/data-helpers.js";
import { fetchBrokerChartData } from "../../Shared/Services/chart_broksum.js";
import {
  calculateBrokerTotals,
  prepareChartDataForVisualization,
  DEFAULT_BROKERS,
} from "./helpers.js";
import { buildTextResponse } from "./text-renderer.js";
import { renderChartToImage } from "./images-renderer.js";

// --- Handler Teks ---
export async function handleChartBrokerSummary(ctx, args) {
  if (args.length < 1) {
    return ctx.reply(
      "UsageId: /chartbroksum <saham> [hari|mtd] [broker1,broker2,...]"
    );
  }

  const symbol = args[0].toUpperCase();
  let periodArg = args[1]?.toLowerCase() || "mtd";
  let brokerList = DEFAULT_BROKERS;

  if (periodArg.includes(",")) {
    brokerList = periodArg.split(",").map((b) => b.trim().toUpperCase());
    periodArg = "mtd";
  } else if (args[2]) {
    brokerList = args[2].split(",").map((b) => b.trim().toUpperCase());
  }

  let dateConfig, rangeLabel;
  if (["mtd", "ytd"].includes(periodArg)) {
    dateConfig = { type: periodArg };
    rangeLabel = periodArg === "mtd" ? "Month-to-Date" : "Year-to-Date";
  } else {
    const days = parseInt(periodArg, 10);
    if (isNaN(days) || days <= 0) {
      return ctx.reply(
        'Periode tidak valid. Gunakan angka (hari), "mtd", atau "ytd".'
      );
    }
    dateConfig = { type: "days", days };
    rangeLabel = `${days} Hari Terakhir`;
  }

  try {
    const { from, to } = getDateRange(dateConfig);
    if (new Date(from) > new Date(to)) {
      return ctx.reply("Rentang tanggal tidak valid.");
    }

    const rawData = await fetchBrokerChartData(symbol, brokerList, from, to);
    const totals = calculateBrokerTotals(rawData.data.broker_chart_data);
    const lastUpdated =
      rawData.data.date_session_info ||
      new Date(rawData.data.data_last_updated).toLocaleDateString("id-ID");

    const message = buildTextResponse(symbol, totals, rangeLabel, lastUpdated);
    ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error in /chartbroksum:", error);
    ctx.reply(`❌ ${error.message || "Terjadi kesalahan."}`);
  }
}

// --- Handler Gambar ---
export async function handleChartBrokerSummaryImage(ctx, args, onProgress) {
  if (args.length < 1) {
    return ctx.reply(
      "UsageId: /chartbroksumimg <saham> [hari|mtd] [broker1,broker2,...]"
    );
  }

  const symbol = args[0].toUpperCase();
  let periodArg = args[1]?.toLowerCase() || "mtd";
  let brokerList = DEFAULT_BROKERS;

  if (periodArg.includes(",")) {
    brokerList = periodArg.split(",").map((b) => b.trim().toUpperCase());
    periodArg = "mtd";
  } else if (args[2]) {
    brokerList = args[2].split(",").map((b) => b.trim().toUpperCase());
  }

  let dateConfig, rangeLabel;
  if (["mtd", "ytd"].includes(periodArg)) {
    dateConfig = { type: periodArg };
    rangeLabel = periodArg === "mtd" ? "Month-to-Date" : "Year-to-Date";
  } else {
    const days = parseInt(periodArg, 10);
    if (isNaN(days) || days <= 0) {
      return ctx.reply(
        'Periode tidak valid. Gunakan angka (hari), "mtd", atau "ytd".'
      );
    }
    dateConfig = { type: "days", days };
    rangeLabel = `${days} Hari Terakhir`;
  }

  try {
    const { from, to } = getDateRange(dateConfig);
    if (new Date(from) > new Date(to)) {
      return ctx.reply("Rentang tanggal tidak valid.");
    }

    // Tahap 1: Fetch data (30%)
    await onProgress(10, "Mengambil data...");
    const rawData = await fetchBrokerChartData(symbol, brokerList, from, to);
    await onProgress(30, "Data diterima");

    // Tahap 2: Proses data (60%)
    await onProgress(40, "Memproses data broker...");
    const chartData = prepareChartDataForVisualization(rawData, brokerList);
    await onProgress(60, "Data siap dirender");

    // Tahap 3: Render gambar (90%)
    await onProgress(70, "Merender grafik...");
    const image = await renderChartToImage(symbol, rangeLabel, {
      labels: chartData.labels,
      datasets: chartData.datasets,
      priceRange: chartData.priceRange,
      valueRange: chartData.valueRange,
    });

    if (!image || !Buffer.isBuffer(image)) {
      throw new Error("Buffer gambar tidak valid.");
    }
    await onProgress(90, "Grafik selesai");

    // Tahap 4: Kirim hasil (100%)
    await ctx.replyWithPhoto(
      {
        source: image,
        filename: "broker-flow.png",
      },
      {
        caption: `<b>${symbol.toUpperCase()} – ${rangeLabel}</b>\n📊 Broker Flow`,
        parse_mode: "HTML",
      }
    );
    await onProgress(100);
  } catch (error) {
    await onProgress(100); // Pastikan progress dihapus saat error
    console.error("Error generating image:", error);
    ctx.reply(`❌ ${error.message}`);
  }
}

import express from "express";
import { Telegraf } from "telegraf";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api"; // Perbaikan 1
import { ExpressAdapter } from "@bull-board/express"; // Perbaikan 2 (jika sebelumnya salah)
import Queue from "bull";
import { analisaJob } from "./jobs/analisaJob.js";
import { bot } from "./bot.js"; // Pastikan ekstensi .js ada

const app = express();
const analisaQueue = new Queue(
  "Analisis",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

// Setup Bull Board (opsional, untuk melihat antrian)
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(analisaQueue)], // Gunakan BullAdapter langsung
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Webhook handler
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, async (req, res) => {
  await bot.handleUpdate(req.body);
  res.status(200).end();
});

// Proses antrian
analisaQueue.process(analisaJob);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

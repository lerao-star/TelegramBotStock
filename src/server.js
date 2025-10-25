import express from "express";
import { Telegraf } from "telegraf";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter.js"; // Path untuk v4
import { ExpressAdapter } from "@bull-board/express";
import Queue from "bull"; // Import default dari bull v4
import { analisaJobProcessor } from "./jobs/analisaJob.js"; // Sesuaikan nama fungsi
import { bot } from "./bot.js";

const app = express();
const analisaQueue = new Queue(
  "Analisis",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(analisaQueue)],
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, async (req, res) => {
  await bot.handleUpdate(req.body);
  res.status(200).end();
});

analisaQueue.process(analisaJobProcessor); // Gunakan .process() dari bull v4

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

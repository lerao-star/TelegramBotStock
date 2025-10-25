require('dotenv').config();
const express = require('express');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.warn('Warning: TELEGRAM_BOT_TOKEN is not set. Set it in environment before using bot features.');
}

const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Telegram webhook server running');
});

// Telegram will POST updates to /webhook
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    const message = update && (update.message || update.edited_message || update.callback_query && update.callback_query.message);

    if (!message || !message.text) {
      // nothing to do, but respond 200 to acknowledge
      return res.status(200).send('no-text');
    }

    const chatId = message.chat && message.chat.id;
    const text = (message.text || '').trim();

    // Extract words (basic): take sequences of non-space characters, then clean punctuation
    const rawWords = text.match(/\b[^\s]+\b/g) || [];
    const cleanWords = rawWords.map(w => w.replace(/[^\p{L}\p{N}_]+/gu, '')).filter(Boolean);

    const wordCount = cleanWords.length;
    const reversedWords = cleanWords.map(w => w.split('').reverse().join('')).join(' ');

    const reply = `Kamu mengirim: ${text}\nKata: ${cleanWords.join(', ')}\nJumlah kata: ${wordCount}\nKata terbalik: ${reversedWords}`;

    if (TELEGRAM_API && chatId) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: reply
      });
    } else {
      console.log('Would send reply:', reply);
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('Error handling webhook:', err?.response?.data || err.message || err);
    return res.status(500).send('error');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

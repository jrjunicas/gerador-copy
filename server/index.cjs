// server/index.cjs  (CommonJS)
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // v2 (CommonJS)

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_ENDPOINT =
  process.env.GEMINI_ENDPOINT ||
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'missing prompt' });

    const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: 'gemini error', detail: t });
    }

    const data = await r.json();
    return res.json(data);
  } catch (e) {
    return res
      .status(500)
      .json({ error: 'internal error', detail: String(e?.message || e) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`✅ API listening on :${port}`));

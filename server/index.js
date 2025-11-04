
/**
 * Express server to proxy Gemini requests securely.
 * Keep GEMINI_API_KEY only on the server.
 */
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("⚠️  Missing GEMINI_API_KEY env var.");
}

// Example Gemini endpoint (adjust if you use a different model/route)
const GEMINI_ENDPOINT = process.env.GEMINI_ENDPOINT || "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'missing prompt' });

    const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const payload = {
      contents: [ { role: "user", parts: [{ text: prompt }] } ]
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: 'gemini error', detail: t });
    }

    const data = await r.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error', detail: String(e && e.message || e) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`✅ API listening on :${port}`));


// ---- Production-safe Gemini proxy call ----
export async function generateViaApi(prompt) {
  const resp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!resp.ok) throw new Error('Falha na geração');
  return await resp.json();
}


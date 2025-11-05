// server/index.cjs
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

const PORT = process.env.PORT || 10000;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.warn("⚠️ GEMINI_API_KEY não encontrada no ambiente do servidor Render!");
}

app.use(cors({
  origin: [
    "https://www.agenciamuum.com.br",
    "https://agenciamuum.com.br",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(bodyParser.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Servidor ativo e funcionando 🚀" });
});

app.post("/api/generate", async (req, res) => {
  try {
    if (!GEMINI_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY ausente no servidor" });
    }
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "prompt inválido ou vazio" });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() || "(Sem resposta gerada)";

    res.json({ ok: true, text });
  } catch (err) {
    console.error("❌ Erro ao gerar conteúdo:", err);
    res.status(500).json({
      error: "falha_gemini",
      detail: err?.message || "Erro desconhecido"
    });
  }
});

app.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log(`✅ API listening on :${process.env.PORT || 10000}`);
});

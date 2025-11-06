// server/index.cjs
/**
 * Backend do Gerador de Conteúdo IA (CommonJS)
 * - Express + CORS
 * - Gemini via @google/generative-ai
 * - Porta: process.env.PORT (Render) ou 10000
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 10000;

/** CORS – libere somente os domínios que vão consumir sua API */
const ALLOWED_ORIGINS = [
  "https://www.agenciamuum.com.br",
  "https://agenciamuum.com.br",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin(origin, cb) {
      // permite chamadas do browser com origin na lista e também chamadas sem origin (ex.: curl, healthcheck)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);

// trata preflight de qualquer rota
app.options("*", cors());

app.use(bodyParser.json({ limit: "1mb" }));

/** Gemini */
const apiKey = (process.env.GEMINI_API_KEY || "").trim();
if (!apiKey) {
  console.error("❌ ERRO: variável GEMINI_API_KEY não encontrada no Render!");
}
const genAI = new GoogleGenerativeAI(apiKey);

/** Healthcheck */
app.get("/", (_req, res) => {
  res.send("✅ API do Gerador de Conteúdo IA rodando (CommonJS)");
});

/** Endpoint de geração */
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt ausente ou inválido." });
    }

    // use um modelo estável suportado pela API
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 },
    });

    const text = result?.response?.text?.();
    if (!text) throw new Error("Resposta vazia do Gemini.");

    res.json({ text });
  } catch (err) {
    console.error("❌ Erro durante a geração:", err);
    res
      .status(500)
      .json({ error: "falha_gemini", detail: err?.message || String(err) });
  }
});

/** Start */
app.listen(port, () => {
  console.log(`🚀 Servidor ativo e escutando na porta ${port}`);
});

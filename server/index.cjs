/**
 * Servidor Node para o Gerador de Conteúdo IA
 * Compatível com o modelo Gemini 1.5-flash-latest
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const port = process.env.PORT || 10000;

// ======= CORS (permitindo origens do seu site) =======
app.use(cors({
  origin: [
    "https://agenciamuum.com.br",
    "https://www.agenciamuum.com.br",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
}));

app.use(bodyParser.json());

// ======= Inicialização segura da API =======
const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  console.error("❌ ERRO: variável GEMINI_API_KEY não encontrada!");
}

const genAI = new GoogleGenerativeAI({ apiKey });

// ======= Rota de teste =======
app.get("/", (req, res) => {
  res.send("✅ API do Gerador de Conteúdo IA rodando com Gemini");
});

// ======= Rota principal de geração =======
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt ausente na requisição." });
    }

    console.log("🧠 Solicitando geração ao modelo Gemini...");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
    });

    const text = result.response.text();

    if (!text) {
      throw new Error("A resposta veio vazia da API Gemini.");
    }

    res.json({ text });
  } catch (err) {
    console.error("❌ Erro durante a geração:", err);
    res.status(500).json({
      error: "falha_gemini",
      detail: err.message || String(err),
    });
  }
});

// ======= Inicialização do servidor =======
app.listen(port, () => {
  console.log(`🚀 Servidor ativo e escutando na porta ${port}`);
});

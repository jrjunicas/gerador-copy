/**
 * Servidor Node simples que recebe o prompt do front-end
 * e chama a API do Gemini 1.5-flash-latest.
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const port = process.env.PORT || 10000;

// Permite requisições do seu domínio
app.use(cors({
  origin: [
    "https://www.agenciamuum.com.br",
    "http://localhost:5173",
    "http://localhost:3000"
  ]
}));
app.use(bodyParser.json());

// Inicializa o cliente Gemini com a chave do Render
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ Nenhuma GEMINI_API_KEY encontrada nas variáveis de ambiente!");
}
const genAI = new GoogleGenerativeAI(apiKey);

// Rota de teste
app.get("/", (req, res) => {
  res.send("✅ API do Gerador de Conteúdo IA rodando com Gemini");
});

// Endpoint principal de geração
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log("🧠 Gerando conteúdo com Gemini...");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      }
    });

    const text = result.response.text();
    res.json({ text });
  } catch (err) {
    console.error("❌ Erro na geração:", err);
    res.status(500).json({
      error: "falha_gemini",
      detail: err.message || String(err)
    });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});

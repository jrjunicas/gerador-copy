// src/services/geminiService.ts
// ------------------------------------------------------
// IMPORTANTE:
// - Este arquivo NÃO usa mais @google/generative-ai no front.
// - Toda geração é feita via seu backend no Render (proxy seguro).
// - Assim, nenhuma API key fica exposta no navegador.
// ------------------------------------------------------

import {
  Client,
  ContentRequest,
  GeneratedContent,
  NetworkContent,
  ContentFormatDefinition,
} from "../types";

// 👉 seu backend no Render:
const API_BASE = "https://gerador-copy.onrender.com";

// ---------- Proxy seguro (único ponto que fala com a API do Render) ----------
export async function generateViaApi(prompt: string): Promise<{ text: string }> {
  const resp = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(`Falha na geração (${resp.status}) ${msg}`);
  }
  return resp.json();
}

// ---------- (Opcional) Extrair tema de arquivo ----------
// Para não expor a API key no front, desabilitamos aqui.
// Se quiser usar extração por IA, crie um endpoint no backend
// (ex.: POST /api/extract-theme) e mova a lógica para lá.
export const extractThemeFromFile = async (_file: File): Promise<string> => {
  throw new Error(
    "Extração de tema por arquivo está desabilitada no front. Implemente um endpoint no backend para habilitar."
  );
};

// ---------- Construir prompt ----------
function buildPrompt(
  request: Omit<ContentRequest, "id">,
  client: Client,
  formats: ContentFormatDefinition[]
): string {
  const allNetworks = request.networks.includes("Outro")
    ? [...request.networks.filter((n) => n !== "Outro"), request.customNetwork].filter(Boolean)
    : request.networks;

  const selectedFormat = formats.find((f) => f.name === request.format);
  const formatInstructions =
    selectedFormat?.description ||
    "Gere um conteúdo criativo e de alta qualidade para o formato especificado.";

  return `
ASSUMA O PAPEL de um estrategista criativo de conteúdo, especialista em crescimento orgânico e viralização com mais de 10 anos de experiência.

**PERSONA DO CLIENTE:**
- Nome: ${client.name}
- Tom de Voz: ${client.toneOfVoice}
- Público-Alvo: ${client.targetAudience}
- Mercado: ${client.market}

**REGRAS DE CONTEÚDO:**
1. Textos curtos, impactantes e diretos.
2. Todo conteúdo deve ter um CTA claro no final.
3. Utilize boas práticas de copywriting para redes sociais.
4. Quando mencionar e-commerce, use o termo "eCommerce".

**TAREFA:**
Gere um conteúdo de alto impacto para redes sociais, com base nos dados abaixo.

**DETALHES DO CONTEÚDO:**
- Tema: ${request.theme}
- Formato: ${request.format}
- Instruções específicas: ${formatInstructions}
- Redes: ${allNetworks.join(", ")}
- Objetivo do CTA: ${request.ctaObjective}
- Direcionamentos: ${request.specificDirections || "Nenhum."}

**SAÍDA OBRIGATÓRIA:**
[START_CREATIVE_SUGGESTION]
(Sugestão criativa com markdown)
[END_CREATIVE_SUGGESTION]

[START_COVER_PHRASES]
1. Primeira frase.
2. Segunda frase.
...
10. Décima frase.
[END_COVER_PHRASES]

${allNetworks
  .map(
    (network) => `
[START_${network.toUpperCase().replace(/\s+/g, "_")}]
**Legenda:**
[Legenda para ${network}]

**Hashtags:**
#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5 #hashtag6
[END_${network.toUpperCase().replace(/\s+/g, "_")}]
`
  )
  .join("\n")}
`;
}

// ---------- Parsear resposta ----------
function parseResponse(
  responseText: string,
  request: Omit<ContentRequest, "id">
): GeneratedContent {
  const allNetworks = request.networks.includes("Outro")
    ? [...request.networks.filter((n) => n !== "Outro"), request.customNetwork].filter(Boolean)
    : request.networks;

  const creativeSuggestion =
    responseText.split("[START_CREATIVE_SUGGESTION]")[1]?.split("[END_CREATIVE_SUGGESTION]")[0]?.trim() ||
    "Nenhuma sugestão criativa gerada.";

  const coverPhrasesText =
    responseText.split("[START_COVER_PHRASES]")[1]?.split("[END_COVER_PHRASES]")[0]?.trim();

  const coverPhrases = coverPhrasesText
    ? coverPhrasesText
        .split("\n")
        .map((p) => p.replace(/^\d+\.\s*/, "").trim())
        .filter((p) => p)
    : [];

  const networkContent: Record<string, NetworkContent> = {};
  allNetworks.forEach((network) => {
    const key = network.toUpperCase().replace(/\s+/g, "_");
    const block = responseText.split(`[START_${key}]`)[1]?.split(`[END_${key}]`)[0]?.trim();

    if (block) {
      const caption = block.split("**Legenda:**")[1]?.split("**Hashtags:**")[0]?.trim() || "";
      const hashtags = block.split("**Hashtags:**")[1]?.trim() || "";
      networkContent[network] = { caption, hashtags };
    } else {
      networkContent[network] = {
        caption: `Conteúdo para ${network} não foi gerado.`,
        hashtags: "",
      };
    }
  });

  return { creativeSuggestion, coverPhrases, networkContent };
}

// ---------- Geração principal (via backend) ----------
export const generateSocialMediaContent = async (
  request: Omit<ContentRequest, "id">,
  client: Client,
  formats: ContentFormatDefinition[]
): Promise<GeneratedContent> => {
  const prompt = buildPrompt(request, client, formats);

  // Chama seu backend, que por sua vez chama a Gemini
  const { text } = await generateViaApi(prompt);

  if (!text || typeof text !== "string") {
    throw new Error("A API não retornou conteúdo. Tente novamente.");
  }

  return parseResponse(text, request);
};

// ---------- Geração em lote ----------
export const generateBatchSocialMediaContent = async (
  requests: ContentRequest[],
  client: Client,
  formats: ContentFormatDefinition[]
): Promise<(GeneratedContent | { error: string })[]> => {
  const promises = requests.map((req) => {
    const { id, ...data } = req;
    return generateSocialMediaContent(data, client, formats).catch((err) => ({
      error:
        err instanceof Error
          ? err.message
          : `Falha ao gerar conteúdo para o tema "${req.theme}".`,
    }));
  });
  return Promise.all(promises);
};

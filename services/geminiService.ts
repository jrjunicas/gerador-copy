import { GoogleGenerativeAI } from "@google/generative-ai";
import { Client, ContentRequest, GeneratedContent, NetworkContent, ContentFormatDefinition } from "../types";

if (!process.env.API_KEY) {
  console.warn("⚠️ API_KEY environment variable not set. API calls will fail if not provided.");
}

const ai = new GoogleGenerativeAI({ apiKey: process.env.API_KEY as string });

// ---------- Função auxiliar: conversão de arquivo ----------
function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === "string") {
        const base64Data = event.target.result.split(",")[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      } else {
        reject(new Error("Falha ao ler o arquivo."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// ---------- Extrair tema de imagem ou texto ----------
export const extractThemeFromFile = async (file: File): Promise<string> => {
  try {
    let contents;

    if (file.type.startsWith("image/")) {
      const imagePart = await fileToGenerativePart(file);
      contents = {
        parts: [
          imagePart,
          {
            text: "Analise esta imagem e descreva o tema principal em uma frase curta e impactante, ideal para um post de rede social.",
          },
        ],
      };
    } else if (file.type === "text/plain") {
      const text = await file.text();
      contents = `Resuma o seguinte texto em um tema central para um post de rede social. O resultado deve ser uma frase curta e cativante:\n\n${text}`;
    } else {
      throw new Error("Tipo de arquivo não suportado. Use imagens (JPEG, PNG) ou texto (.txt).");
    }

    const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" }).generateContent({
      contents,
      generationConfig: { temperature: 0.5 },
    });

    const responseText = response.response.text();
    if (!responseText) throw new Error("A IA não conseguiu extrair um tema do arquivo.");

    return responseText.trim();
  } catch (error) {
    console.error("Erro ao extrair tema do arquivo:", error);
    throw new Error("Falha ao analisar o arquivo. Verifique o console para mais detalhes.");
  }
};

// ---------- Construir prompt ----------
function buildPrompt(request: Omit<ContentRequest, "id">, client: Client, formats: ContentFormatDefinition[]): string {
  const allNetworks = request.networks.includes("Outro")
    ? [...request.networks.filter((n) => n !== "Outro"), request.customNetwork].filter(Boolean)
    : request.networks;

  const selectedFormat = formats.find((f) => f.name === request.format);
  const formatInstructions =
    selectedFormat?.description || "Gere um conteúdo criativo e de alta qualidade para o formato especificado.";

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
function parseResponse(responseText: string, request: Omit<ContentRequest, "id">): GeneratedContent {
  const allNetworks = request.networks.includes("Outro")
    ? [...request.networks.filter((n) => n !== "Outro"), request.customNetwork].filter(Boolean)
    : request.networks;

  const creativeSuggestion =
    responseText.split("[START_CREATIVE_SUGGESTION]")[1]?.split("[END_CREATIVE_SUGGESTION]")[0]?.trim() ||
    "Nenhuma sugestão criativa gerada.";

  const coverPhrasesText = responseText.split("[START_COVER_PHRASES]")[1]?.split("[END_COVER_PHRASES]")[0]?.trim();
  const coverPhrases = coverPhrasesText
    ? coverPhrases
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
      networkContent[network] = { caption: `Conteúdo para ${network} não foi gerado.`, hashtags: "" };
    }
  });

  return { creativeSuggestion, coverPhrases, networkContent };
}

// ---------- Geração principal ----------
export const generateSocialMediaContent = async (
  request: Omit<ContentRequest, "id">,
  client: Client,
  formats: ContentFormatDefinition[]
): Promise<GeneratedContent> => {
  try {
    const prompt = buildPrompt(request, client, formats);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
      },
      tools: [{ googleSearch: {} }],
    });

    const responseText = response.response.text();
    if (!responseText) throw new Error("A API não retornou conteúdo. Tente novamente.");

    return parseResponse(responseText, request);
  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    throw new Error("Falha na comunicação com a IA. Verifique sua conexão e a chave de API.");
  }
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
      error: err instanceof Error ? err.message : `Falha ao gerar conteúdo para o tema "${req.theme}".`,
    }));
  });
  return Promise.all(promises);
};

// ---------- Proxy seguro ----------
export async function generateViaApi(prompt: string) {
  const resp = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!resp.ok) throw new Error("Falha na geração");
  return await resp.json();
}

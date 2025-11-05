// services/geminiService.ts
// Frontend SEM dependência do @google/genai: todas as chamadas vão para o backend no Render.

import { Client, ContentRequest, GeneratedContent, NetworkContent, ContentFormatDefinition } from '../types';

// URL do backend (Render)
const API_BASE = "https://gerador-copy.onrender.com";

// ---- Utilitário seguro para chamar a API própria ----
export async function generateViaApi(prompt: string): Promise<string> {
  const resp = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Falha na geração: ${resp.status} ${txt}`);
  }

  const data = await resp.json();
  // Backend responde { ok: true, text: "..." }
  const text = data?.text ?? data?.result ?? "";
  if (!text) throw new Error("Resposta vazia da IA");
  return text;
}

// ---- Suporte limitado a anexos no front (sem expor chave)
// Para .txt funciona (vira um prompt). Para imagem, exibimos orientação até ativarmos no backend.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error("Falha ao ler o arquivo."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export const extractThemeFromFile = async (file: File): Promise<string> => {
  if (file.type === 'text/plain') {
    // Lemos o .txt e pedimos ao backend para resumir em um tema curto
    const text = await file.text();
    const prompt = `Resuma o seguinte texto em UMA frase curta e cativante, ideal como tema central para um post de rede social:\n\n${text}`;
    const summary = await generateViaApi(prompt);
    return summary.trim();
  }

  if (file.type.startsWith('image/')) {
    // Para imagem, precisamos habilitar no backend (rota que aceite imagem).
    // Mantemos o front seguro e avisamos o usuário por enquanto.
    throw new Error("Extração de tema a partir de imagem requer ajuste no backend. Envie um .txt por enquanto.");
  }

  throw new Error('Tipo de arquivo não suportado. Use imagens (.png/.jpg) após habilitarmos no backend, ou texto (.txt).');
};

// ---- Prompt builder (mantido) ----
function buildPrompt(
  request: Omit<ContentRequest, 'id'>,
  client: Client,
  formats: ContentFormatDefinition[]
): string {
  const allNetworks = request.networks.includes('Outro')
    ? [...request.networks.filter(n => n !== 'Outro'), request.customNetwork].filter(Boolean)
    : request.networks;

  const selectedFormat = formats.find(f => f.name === request.format);
  const formatInstructions = selectedFormat?.description || 'Gere um conteúdo criativo e de alta qualidade para o formato especificado.';

  return `
ASSUMA O PAPEL de um consultor criativo de conteúdo, especialista em crescimento orgânico e viralização com mais de 10 anos de experiência. Você é mestre em comportamento humano, gatilhos mentais e neurociência para criar comunidades engajadas.

**PERSONA DO CLIENTE (MUITO IMPORTANTE):**
Sua tarefa principal é gerar todo o conteúdo estritamente de acordo com a persona do cliente a seguir. A voz, o estilo e o vocabulário devem ser uma personificação direta deste perfil.
- **Nome do Cliente:** ${client.name}
- **Tom de Voz:** ${client.toneOfVoice}
- **Público-Alvo:** ${client.targetAudience}
- **Mercado:** ${client.market}

**REGRAS DE CONTEÚDO (OBRIGATÓRIO):**
1. **CONCISÃO E IMPACTO:** Textos curtos, claros e diretos. Evite parágrafos longos.
2. **CTA OBRIGATÓRIO:** Toda legenda e o final do carrossel DEVEM terminar com um CTA claro.
3. **BOAS PRÁTICAS:** Aplique as melhores práticas de copywriting para maximizar alcance e interação.
4. **eCommerce:** Sempre use o termo 'eCommerce'.

**TAREFA:**
Crie conteúdo para redes sociais que se alinhe perfeitamente à **PERSONA** e siga as **REGRAS**.

**DETALHES DO CONTEÚDO:**
- **Tema Central:** ${request.theme}
- **Formato do Conteúdo:** ${request.format}
  - Instruções Específicas do Formato: ${formatInstructions}
- **Redes Sociais:** ${allNetworks.join(', ')}
- **Objetivo do CTA:** ${request.ctaObjective}
- **Direcionamento Específico Adicional:** ${request.specificDirections || 'Nenhum.'}

**REQUISITOS DE SAÍDA:**
1. **Sugestão Criativa:** (markdown, com **negrito** em rótulos). Para 'Carrossel', liste “Tela X / Texto / Ideia de Imagem”.
2. **Frases de Capa:** 10 opções (máx. 60 caracteres), focadas em curiosidade e engajamento.
3. **Conteúdo por Rede Social** (para cada rede em ${allNetworks.join(', ')}):
   - Uma legenda concisa e impactante (usando o Tom de Voz do cliente).
   - 6 hashtags relevantes (ordem diferente por rede).
   - Lembre-se do CTA no final.

**FORMATO DE SAÍDA ESTRITO:**
[START_CREATIVE_SUGGESTION]
(Aqui vai a sugestão criativa formatada com markdown)
[END_CREATIVE_SUGGESTION]

[START_COVER_PHRASES]
1. Primeira frase de capa.
2. Segunda frase de capa.
...
10. Décima frase de capa.
[END_COVER_PHRASES]

${allNetworks.map(network => `
[START_${network.toUpperCase().replace(/\s+/g, '_')}]
**Legenda:**
[Legenda para ${network}]

**Hashtags:**
#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5 #hashtag6
[END_${network.toUpperCase().replace(/\s+/g, '_')}]
`).join('\n')}
  `;
}

// ---- Parse do retorno (mantido) ----
function parseResponse(responseText: string, request: Omit<ContentRequest, 'id'>): GeneratedContent {
  const allNetworks = request.networks.includes('Outro')
    ? [...request.networks.filter(n => n !== 'Outro'), request.customNetwork].filter(Boolean)
    : request.networks;

  const creativeSuggestion =
    responseText.split('[START_CREATIVE_SUGGESTION]')[1]?.split('[END_CREATIVE_SUGGESTION]')[0]?.trim()
    || 'Nenhuma sugestão criativa gerada.';

  const coverPhrasesText =
    responseText.split('[START_COVER_PHRASES]')[1]?.split('[END_COVER_PHRASES]')[0]?.trim();

  const coverPhrases = coverPhrasesText
    ? coverPhrasesText
        .split('\n')
        .map(p => p.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
    : [];

  const networkContent: Record<string, NetworkContent> = {};
  allNetworks.forEach(network => {
    const key = network.toUpperCase().replace(/\s+/g, '_');
    const block = responseText.split(`[START_${key}]`)[1]?.split(`[END_${key}]`)[0]?.trim();
    if (block) {
      const caption = block.split('**Legenda:**')[1]?.split('**Hashtags:**')[0]?.trim() || '';
      const hashtags = block.split('**Hashtags:**')[1]?.trim() || '';
      networkContent[network] = { caption, hashtags };
    } else {
      networkContent[network] = { caption: `Conteúdo para ${network} não foi gerado.`, hashtags: '' };
    }
  });

  return { creativeSuggestion, coverPhrases, networkContent };
}

// ---- Geração principal usando o backend ----
export const generateSocialMediaContent = async (
  request: Omit<ContentRequest, 'id'>,
  client: Client,
  formats: ContentFormatDefinition[]
): Promise<GeneratedContent> => {
  const prompt = buildPrompt(request, client, formats);
  const responseText = await generateViaApi(prompt);
  return parseResponse(responseText, request);
};

export const generateBatchSocialMediaContent = async (
  requests: ContentRequest[],
  client: Client,
  formats: ContentFormatDefinition[]
): Promise<(GeneratedContent | { error: string })[]> => {
  const promises = requests.map(r => {
    const { id, ...req } = r;
    return generateSocialMediaContent(req, client, formats).catch(err => ({
      error: err instanceof Error ? err.message : `Falha ao gerar conteúdo para o tema "${r.theme}".`
    }));
  });
  return Promise.all(promises);
};

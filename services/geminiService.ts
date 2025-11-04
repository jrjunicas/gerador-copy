import { GoogleGenAI } from "@google/genai";
import { Client, ContentRequest, GeneratedContent, NetworkContent, ContentFormatDefinition } from '../types';

if (!process.env.API_KEY) {
  // In a real app, this might be handled differently,
  // but for this context, we assume it's set.
  console.warn("API_KEY environment variable not set. API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
                const base64Data = event.target.result.split(',')[1];
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

export const extractThemeFromFile = async (file: File): Promise<string> => {
  try {
    let contents;
    
    if (file.type.startsWith('image/')) {
        const imagePart = await fileToGenerativePart(file);
        contents = {
            parts: [
                imagePart, 
                { text: 'Analise esta imagem e descreva o tema principal em uma frase curta e impactante, ideal para um post de rede social.' }
            ],
        };
    } else if (file.type === 'text/plain') {
        const text = await file.text();
        contents = `Resuma a seguinte transcrição/texto em um tema central para um post de rede social. O resultado deve ser uma frase curta e cativante:\n\n---INÍCIO DO TEXTO---\n${text}\n---FIM DO TEXTO---`;
    } else {
        throw new Error('Tipo de arquivo não suportado. Use imagens (JPEG, PNG) ou texto (.txt).');
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
            temperature: 0.5,
        }
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error('A IA não conseguiu extrair um tema do arquivo.');
    }

    return responseText.trim();

  } catch (error) {
    console.error("Erro ao extrair tema do arquivo:", error);
    throw new Error(error instanceof Error ? error.message : "Falha ao analisar o arquivo. Verifique o console para mais detalhes.");
  }
};

function buildPrompt(request: Omit<ContentRequest, 'id'>, client: Client, formats: ContentFormatDefinition[]): string {
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
    1.  **CONCISÃO E IMPACTO:** Todos os textos, tanto para os criativos (carrossel, imagem) quanto para as legendas, DEVEM ser curtos, claros e diretos. Otimize para leitura rápida, retenção e engajamento. Evite parágrafos longos.
    2.  **CTA OBRIGATÓRIO:** TODA legenda e o final de todo carrossel DEVEM terminar com um Call-to-Action (CTA) claro e convidativo, alinhado ao objetivo definido.
    3.  **BOAS PRÁTICAS:** Aplique as melhores e mais atuais práticas de copywriting para redes sociais para maximizar o alcance e a interação.
    4.  **eCommerce:** Sempre que se referir a comércio eletrônico, use o termo 'eCommerce'.

    **TAREFA:**
    Faça uma pesquisa aprofundada na internet sobre o tema fornecido. Crie conteúdo para redes sociais que se alinhe perfeitamente com a **PERSONA DO CLIENTE** e siga todas as **REGRAS DE CONTEÚDO** acima.

    **DETALHES DO CONTEÚDO:**
    - **Tema Central:** ${request.theme}
    - **Formato do Conteúdo:** ${request.format}
      - Instruções Específicas do Formato: ${formatInstructions}
    - **Redes Sociais:** ${allNetworks.join(', ')}
    - **Objetivo do CTA:** ${request.ctaObjective}
    - **Direcionamento Específico Adicional:** ${request.specificDirections || 'Nenhum.'}

    **REQUISITOS DE SAÍDA:**
    1.  **Sugestão Criativa:** Forneça uma sugestão criativa detalhada e bem estruturada. Use markdown para formatação, especificamente negrito (usando **texto**) para títulos e rótulos para melhorar a legibilidade. Para o formato 'Carrossel', ESTRUTURE A RESPOSTA PARA CADA TELA DA SEGUINTE FORMA, com os rótulos em negrito e com quebras de linha:
        **Tela 1**
        **Texto:** [Seu texto para a tela 1 aqui]
        **Ideia de Imagem:** [Sua ideia de imagem para a tela 1 aqui]

        **Tela 2**
        **Texto:** [Seu texto para a tela 2 aqui]
        **Ideia de Imagem:** [Sua ideia de imagem para a tela 2 aqui]
        (e assim por diante para as demais telas)
    2.  **Frases de Capa:** Gere 10 opções de frases curtas (máximo de 60 caracteres) para a capa do conteúdo, focadas em gerar curiosidade e engajamento.
    3.  **Conteúdo por Rede Social:** Para CADA rede social, produza o seguinte, sempre incorporando o **Tom de Voz** do cliente e seguindo as **REGRAS DE CONTEÚDO**:
        - Uma legenda CONCISA e impactante que fale diretamente com o **Público-Alvo**.
        - 6 hashtags relevantes e populares, em uma ordem diferente para cada rede.
        - Lembre-se, o CTA no final da legenda é obrigatório.

    **FORMATO DE SAÍDA ESTRITO (MUITO IMPORTANTE):**
    Use os delimitadores exatos abaixo para estruturar sua resposta. Não adicione nenhum texto, explicação ou formatação fora destes blocos.

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

function parseResponse(responseText: string, request: Omit<ContentRequest, 'id'>): GeneratedContent {
    const allNetworks = request.networks.includes('Outro') 
        ? [...request.networks.filter(n => n !== 'Outro'), request.customNetwork].filter(Boolean) 
        : request.networks;

    const creativeSuggestion = responseText.split('[START_CREATIVE_SUGGESTION]')[1]?.split('[END_CREATIVE_SUGGESTION]')[0]?.trim() || 'Nenhuma sugestão criativa gerada.';

    const coverPhrasesText = responseText.split('[START_COVER_PHRASES]')[1]?.split('[END_COVER_PHRASES]')[0]?.trim();
    const coverPhrases = coverPhrasesText ? coverPhrasesText.split('\n').map(p => p.replace(/^\d+\.\s*/, '').trim()).filter(p => p) : [];

    const networkContent: Record<string, NetworkContent> = {};
    allNetworks.forEach(network => {
        const networkKey = network.toUpperCase().replace(/\s+/g, '_');
        const networkBlock = responseText.split(`[START_${networkKey}]`)[1]?.split(`[END_${networkKey}]`)[0]?.trim();
        
        if (networkBlock) {
            const caption = networkBlock.split('**Legenda:**')[1]?.split('**Hashtags:**')[0]?.trim() || '';
            const hashtags = networkBlock.split('**Hashtags:**')[1]?.trim() || '';
            networkContent[network] = { caption, hashtags };
        } else {
             networkContent[network] = { caption: `Conteúdo para ${network} não foi gerado.`, hashtags: '' };
        }
    });

    return { creativeSuggestion, coverPhrases, networkContent };
}


export const generateSocialMediaContent = async (request: Omit<ContentRequest, 'id'>, client: Client, formats: ContentFormatDefinition[]): Promise<GeneratedContent> => {
  try {
    const prompt = buildPrompt(request, client, formats);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        temperature: 0.7,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("A API não retornou conteúdo. Tente refinar sua solicitação.");
    }
    
    return parseResponse(responseText, request);

  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    throw new Error("Falha na comunicação com a IA. Verifique sua conexão e a chave de API.");
  }
};

export const generateBatchSocialMediaContent = async (
  requests: ContentRequest[], 
  client: Client,
  formats: ContentFormatDefinition[]
): Promise<(GeneratedContent | { error: string })[]> => {
  const promises = requests.map(request => {
      const { id, ...requestData } = request;
      return generateSocialMediaContent(requestData, client, formats)
        .catch(err => ({ 
          error: err instanceof Error ? err.message : `Falha ao gerar conteúdo para o tema "${request.theme}".`
        }));
    }
  );
  
  return Promise.all(promises);
};

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


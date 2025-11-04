import React, { useState, useCallback } from 'react';
import { Client, GeneratedContent, ContentRequest, ContentFormatDefinition, PromptTemplate } from './types';
import { generateBatchSocialMediaContent } from './services/geminiService';
import ContentForm from './components/ContentForm';
import GeneratedContentDisplay from './components/GeneratedContentDisplay';
import { LogoIcon } from './components/Icons';

const App: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'TechInova Solutions',
      toneOfVoice: 'Profissional, inovador e inspirador',
      targetAudience: 'Startups de tecnologia, investidores e entusiastas de inovação.',
      market: 'Software como Serviço (SaaS) e Inteligência Artificial',
    },
    {
      id: '2',
      name: 'ModaUrbana',
      toneOfVoice: 'Jovem, descolado e autêntico',
      targetAudience: 'Jovens de 18-25 anos, interessados em streetwear e cultura pop.',
      market: 'Moda e vestuário',
    },
  ]);
  
  const [formats, setFormats] = useState<ContentFormatDefinition[]>([
    { id: 'default-1', name: 'Carrossel', description: 'Para o Carrossel: Sugira o número de telas. Para CADA tela, forneça um texto CURTO, claro e direto (ideal para leitura rápida) e uma ideia de imagem. O último slide DEVE conter um CTA claro e convidativo.', isDefault: true },
    { id: 'default-2', name: 'Imagem Estática', description: 'Para Imagem Estática: Sugira textos CURTOS e impactantes para o criativo e ideias de imagem.', isDefault: true },
    { id: 'default-3', name: 'Reels', description: 'Para Reels: Crie um roteiro detalhado, incluindo cenas, falas e sugestões de áudio, com foco em estratégias de retenção de audiência. Diálogos e textos na tela devem ser concisos.', isDefault: true },
  ]);

  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    {
      id: 'prompt-1',
      name: 'Padrão (campo livre)',
      command: '',
    },
    {
      id: 'prompt-2',
      name: 'Corte de Podcast',
      command: 'A partir da transcrição ou ideia central de um podcast, extraia o insight mais poderoso. Crie um post que funcione como um "gancho" para o episódio completo, gerando curiosidade. Foque em uma única ideia forte e desenvolva a legenda a partir dela.',
    },
    {
      id: 'prompt-3',
      name: 'Lançamento de Produto',
      command: 'Foque nos benefícios e na transformação que o produto oferece, não apenas nas características. Use uma linguagem persuasiva e destaque o principal diferencial competitivo. A legenda deve criar um senso de urgência ou exclusividade. O CTA deve ser direto para a ação de compra ou "saber mais".',
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [batchGeneratedContent, setBatchGeneratedContent] = useState<(GeneratedContent | { error: string; })[] | null>(null);
  const [sentRequests, setSentRequests] = useState<ContentRequest[]>([]);


  const handleAddClient = (client: Omit<Client, 'id'>) => {
    setClients(prev => [...prev, { ...client, id: Date.now().toString() }]);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const handleDeleteClient = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  const handleAddFormat = (format: Omit<ContentFormatDefinition, 'id' | 'isDefault'>) => {
    const newFormat = { ...format, id: Date.now().toString(), isDefault: false };
    setFormats(prev => [...prev, newFormat]);
  };

  const handleUpdateFormat = (updatedFormat: ContentFormatDefinition) => {
      setFormats(prev => prev.map(f => f.id === updatedFormat.id ? updatedFormat : f));
  };

  const handleDeleteFormat = (formatId: string) => {
      setFormats(prev => prev.filter(f => f.id !== formatId));
  };

  const handleAddPrompt = (prompt: Omit<PromptTemplate, 'id'>) => {
    setPrompts(prev => [...prev, { ...prompt, id: Date.now().toString() }]);
  };

  const handleUpdatePrompt = (updatedPrompt: PromptTemplate) => {
    setPrompts(prev => prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p));
  };

  const handleDeletePrompt = (promptId: string) => {
    setPrompts(prev => prev.filter(p => p.id !== promptId));
  };

  const handleGenerateBatchContent = useCallback(async (requests: ContentRequest[], clientId: string) => {
    if (requests.length === 0) {
      setError("Nenhum conteúdo para gerar. Adicione pelo menos um item à fila.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setBatchGeneratedContent(null);
    setSentRequests(requests);

    const selectedClient = clients.find(c => c.id === clientId);
    if (!selectedClient) {
      setError("Cliente selecionado não encontrado.");
      setIsLoading(false);
      return;
    }

    try {
      const content = await generateBatchSocialMediaContent(requests, selectedClient, formats);
      setBatchGeneratedContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante o processo em lote.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [clients, formats]);

  return (
    <div className="min-h-screen bg-brand-dark font-sans">
      <header className="p-4 sm:p-6 border-b border-brand-light-gray flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-brand-purple" />
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerador de Conteúdo IA
          </h1>
        </div>
      </header>
      
      <main className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 xl:col-span-4">
          <ContentForm 
            clients={clients} 
            formats={formats}
            prompts={prompts}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onAddFormat={handleAddFormat}
            onUpdateFormat={handleUpdateFormat}
            onDeleteFormat={handleDeleteFormat}
            onAddPrompt={handleAddPrompt}
            onUpdatePrompt={handleUpdatePrompt}
            onDeletePrompt={handleDeletePrompt}
            onSubmitBatch={handleGenerateBatchContent} 
            isLoading={isLoading} 
          />
        </div>
        
        <div className="lg:col-span-7 xl:col-span-8">
          <GeneratedContentDisplay 
            batchContent={batchGeneratedContent}
            originalRequests={sentRequests}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>

      <footer className="text-center p-4 text-brand-text-light text-sm border-t border-brand-light-gray mt-8">
        <p>&copy; {new Date().getFullYear()} Gerador de Conteúdo para Redes Sociais. Criado com React e Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;

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


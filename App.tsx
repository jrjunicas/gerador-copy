import React, { useEffect, useMemo, useState } from "react";
import ContentForm from "./components/ContentForm";
import GeneratedContentDisplay from "./components/GeneratedContentDisplay";

import {
  Client,
  ContentRequest,
  ContentFormatDefinition,
  PromptTemplate,
  GeneratedContent,
} from "./types";

import {
  generateBatchSocialMediaContent,
} from "./services/geminiService";

import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  listFormats,
  createFormat,
  updateFormat,
  deleteFormat,
  listPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from "./services/db";

const App: React.FC = () => {
  // estados principais
  const [clients, setClients] = useState<Client[]>([]);
  const [formats, setFormats] = useState<ContentFormatDefinition[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // resultados gerados (um para cada item da fila)
  const [generated, setGenerated] = useState<
    (GeneratedContent | { error: string })[]
  >([]);

  // ====== carga inicial (clientes / formatos / prompts) ======
  useEffect(() => {
    (async () => {
      try {
        const [cRes, fRes, pRes] = await Promise.all([
          listClients(),
          listFormats(),
          listPrompts(),
        ]);
        if (Array.isArray(cRes?.clients)) setClients(cRes.clients);
        if (Array.isArray(fRes?.formats)) setFormats(fRes.formats);
        if (Array.isArray(pRes?.prompts)) setPrompts(pRes.prompts);
      } catch (e) {
        console.warn("Falha ao carregar dados iniciais:", e);
      }
    })();
  }, []);

  // ====== handlers CRUD – CLIENTES ======
  const handleAddClient = async (client: Omit<Client, "id">) => {
    const res = await createClient({
      name: client.name,
      tone_of_voice: client.toneOfVoice,
      audience: client.targetAudience,
      market: client.market,
    });
    // re-carrega
    const cRes = await listClients();
    if (Array.isArray(cRes?.clients)) setClients(cRes.clients);
    return res;
  };

  const handleUpdateClient = async (client: Client) => {
    await updateClient({
      id: Number(client.id),
      name: client.name,
      tone_of_voice: client.toneOfVoice,
      audience: client.targetAudience,
      market: client.market,
    });
    const cRes = await listClients();
    if (Array.isArray(cRes?.clients)) setClients(cRes.clients);
  };

  const handleDeleteClient = async (clientId: string) => {
    await deleteClient(Number(clientId));
    const cRes = await listClients();
    if (Array.isArray(cRes?.clients)) setClients(cRes.clients);
  };

  // ====== handlers CRUD – FORMATOS ======
  const handleAddFormat = async (format: Omit<ContentFormatDefinition, "id" | "isDefault">) => {
    await createFormat({ name: format.name, description: format.description });
    const res = await listFormats();
    if (Array.isArray(res?.formats)) setFormats(res.formats);
  };

  const handleUpdateFormat = async (format: ContentFormatDefinition) => {
    await updateFormat({ id: Number(format.id), name: format.name, description: format.description });
    const res = await listFormats();
    if (Array.isArray(res?.formats)) setFormats(res.formats);
  };

  const handleDeleteFormat = async (formatId: string) => {
    await deleteFormat(Number(formatId));
    const res = await listFormats();
    if (Array.isArray(res?.formats)) setFormats(res.formats);
  };

  // ====== handlers CRUD – PROMPTS ======
  const handleAddPrompt = async (prompt: Omit<PromptTemplate, "id">) => {
    await createPrompt({ name: prompt.name, command: prompt.command });
    const res = await listPrompts();
    if (Array.isArray(res?.prompts)) setPrompts(res.prompts);
  };

  const handleUpdatePrompt = async (prompt: PromptTemplate) => {
    await updatePrompt({ id: Number(prompt.id), name: prompt.name, command: prompt.command });
    const res = await listPrompts();
    if (Array.isArray(res?.prompts)) setPrompts(res.prompts);
  };

  const handleDeletePrompt = async (promptId: string) => {
    await deletePrompt(Number(promptId));
    const res = await listPrompts();
    if (Array.isArray(res?.prompts)) setPrompts(res.prompts);
  };

  // ====== Gerar Conteúdos (onde disparamos a IA via backend) ======
  const handleSubmitBatch = async (requests: ContentRequest[], clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      alert("Cliente inválido.");
      return;
    }

    setIsLoading(true);
    setGenerated([]);
    try {
      const out = await generateBatchSocialMediaContent(requests, client, formats);
      setGenerated(out);
    } catch (e) {
      console.error("Falha geral na geração:", e);
      setGenerated([{ error: "Falha geral na geração" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-bold text-white mb-6">
        Gerador de Conteúdo IA
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
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
          onSubmitBatch={handleSubmitBatch}
          isLoading={isLoading}
        />

        <GeneratedContentDisplay results={generated} />
      </div>
    </div>
  );
};

export default App;

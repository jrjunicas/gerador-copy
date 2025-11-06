import { useEffect, useState } from "react";
import "./App.css";

import {
  // CLIENTES (API PHP)
  listClients,
  createClient,
  updateClient,
  deleteClient,

  // FORMATS (LocalStorage)
  listFormats,
  createFormat,
  updateFormat,
  deleteFormat,

  // PROMPTS (LocalStorage)
  listPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from "./services/db";

function App() {
  const [clients, setClients] = useState<any[]>([]);
  const [formats, setFormats] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // ================================
  // CLIENTES
  // ================================
  async function loadClients() {
    try {
      const data = await listClients();
      setClients(data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  }

  async function handleCreateClient() {
    const name = prompt("Nome do cliente:");
    if (!name) return;
    await createClient({ name });
    await loadClients();
  }

  async function handleUpdateClient(id: number) {
    const client = clients.find((c) => c.id === id);
    const newName = prompt("Novo nome do cliente:", client?.name || "");
    if (!newName) return;
    await updateClient({ id, name: newName });
    await loadClients();
  }

  async function handleDeleteClient(id: number) {
    if (!confirm("Excluir este cliente?")) return;
    await deleteClient(id);
    await loadClients();
  }

  // ================================
  // FORMATS (LocalStorage)
  // ================================
  async function loadFormats() {
    const data = await listFormats();
    setFormats(data);
  }

  async function handleCreateFormat() {
    const name = prompt("Nome do formato:");
    const description = prompt("Descrição do formato:");
    if (!name || !description) return;
    await createFormat({ name, description });
    await loadFormats();
  }

  async function handleUpdateFormat(id: string) {
    const format = formats.find((f) => f.id === id);
    const newName = prompt("Novo nome:", format?.name);
    const newDesc = prompt("Nova descrição:", format?.description);
    if (!newName || !newDesc) return;
    await updateFormat({ ...format, name: newName, description: newDesc });
    await loadFormats();
  }

  async function handleDeleteFormat(id: string) {
    if (!confirm("Excluir este formato?")) return;
    await deleteFormat(id);
    await loadFormats();
  }

  // ================================
  // PROMPTS (LocalStorage)
  // ================================
  async function loadPrompts() {
    const data = await listPrompts();
    setPrompts(data);
  }

  async function handleCreatePrompt() {
    const name = prompt("Nome do prompt:");
    const command = prompt("Comando:");
    if (!name) return;
    await createPrompt({ name, command: command || "" });
    await loadPrompts();
  }

  async function handleUpdatePrompt(id: string) {
    const promptObj = prompts.find((p) => p.id === id);
    const newName = prompt("Novo nome:", promptObj?.name);
    const newCmd = prompt("Novo comando:", promptObj?.command);
    if (!newName) return;
    await updatePrompt({ ...promptObj, name: newName, command: newCmd || "" });
    await loadPrompts();
  }

  async function handleDeletePrompt(id: string) {
    if (!confirm("Excluir este prompt?")) return;
    await deletePrompt(id);
    await loadPrompts();
  }

  // ================================
  // INICIALIZAÇÃO
  // ================================
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadClients(), loadFormats(), loadPrompts()]);
      setLoading(false);
    }
    init();
  }, []);

  // ================================
  // RENDER
  // ================================
  if (loading) return <div className="p-8">Carregando dados...</div>;

  return (
    <div className="app-container">
      <h1>Gerador de Conteúdo IA</h1>

      {/* CLIENTES */}
      <section>
        <h2>Clientes</h2>
        <button onClick={handleCreateClient}>+ Novo Cliente</button>
        <ul>
          {clients.map((c) => (
            <li key={c.id}>
              {c.name}{" "}
              <button onClick={() => handleUpdateClient(c.id)}>✏️</button>
              <button onClick={() => handleDeleteClient(c.id)}>🗑️</button>
            </li>
          ))}
        </ul>
      </section>

      {/* FORMATS */}
      <section>
        <h2>Formatos</h2>
        <button onClick={handleCreateFormat}>+ Novo Formato</button>
        <ul>
          {formats.map((f) => (
            <li key={f.id}>
              <strong>{f.name}</strong> — {f.description}{" "}
              {!f.isDefault && (
                <>
                  <button onClick={() => handleUpdateFormat(f.id)}>✏️</button>
                  <button onClick={() => handleDeleteFormat(f.id)}>🗑️</button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* PROMPTS */}
      <section>
        <h2>Prompts</h2>
        <button onClick={handleCreatePrompt}>+ Novo Prompt</button>
        <ul>
          {prompts.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong> — {p.command || "(vazio)"}{" "}
              <button onClick={() => handleUpdatePrompt(p.id)}>✏️</button>
              <button onClick={() => handleDeletePrompt(p.id)}>🗑️</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;

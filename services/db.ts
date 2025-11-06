// src/services/db.ts

// ==================== BACKEND (Hostinger - PHP) ====================
const DB_API = "https://www.agenciamuum.com.br/gerador-copy/api";
const API_KEY = "jK-2K4mP9-new123"; // a MESMA do api/config.php

async function jfetch(url: string, init: RequestInit = {}) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(init.headers || {}),
    },
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Falha na requisição: ${resp.status} ${t}`);
  }
  return resp.json();
}

// ---------- PRESETS (Cliente + Estilo + Prompt) ----------
export async function savePreset(data: {
  client_name: string;
  content_style: string;
  prompt: string;
}) {
  return jfetch(`${DB_API}/create_preset.php`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listPresets(filters?: {
  client_name?: string;
  content_style?: string;
}) {
  const qs = new URLSearchParams();
  if (filters?.client_name) qs.set("client_name", filters.client_name);
  if (filters?.content_style) qs.set("content_style", filters.content_style);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return jfetch(`${DB_API}/list_presets.php${q}`);
}

// Helper usado no ContentForm: salva o último preset do cliente
export async function saveCurrentPreset(
  clientName: string,
  contentStyle: string,
  promptText: string
) {
  if (!clientName || !contentStyle) return;
  await savePreset({
    client_name: clientName,
    content_style: contentStyle,
    prompt: promptText || "",
  });
}

// ---------- CLIENTES (modal) ----------
export async function createClient(data: {
  name: string;
  tone_of_voice?: string;
  audience?: string;
  market?: string;
}) {
  return jfetch(`${DB_API}/create_client.php`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listClients(params?: { q?: string; limit?: number }) {
  const q = params?.q
    ? `?q=${encodeURIComponent(params.q)}${
        params?.limit ? `&limit=${params.limit}` : ""
      }`
    : params?.limit
    ? `?limit=${params.limit}`
    : "";
  return jfetch(`${DB_API}/list_clients.php${q}`);
}

export async function getClient(id: number) {
  return jfetch(`${DB_API}/get_client.php?id=${id}`);
}

export async function updateClient(data: {
  id: number;
  name: string;
  tone_of_voice?: string;
  audience?: string;
  market?: string;
}) {
  return jfetch(`${DB_API}/update_client.php`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: number) {
  return jfetch(`${DB_API}/delete_client.php?id=${id}`, { method: "POST" });
}

// ==================== FRONT (LocalStorage) ====================
// Formats e Prompts não precisam de API. Persistimos no navegador.

type Format = { id: string; name: string; description: string; isDefault?: boolean };
type Prompt = { id: string; name: string; command: string };

const LS_FORMATS = "gc_formats_v1";
const LS_PROMPTS = "gc_prompts_v1";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Defaults ----------
const DEFAULT_FORMATS: Format[] = [
  {
    id: "fmt_default_carrossel",
    name: "Carrossel",
    description:
      "Crie um carrossel com 5–8 telas. Em cada tela, forneça: **Texto** curto e **Ideia de Imagem**.",
    isDefault: true,
  },
  {
    id: "fmt_reels",
    name: "Reels curto",
    description:
      "Roteiro de vídeo curto (30–45s): gancho inicial, 3–4 pontos, CTA final.",
  },
];

const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: "prm_padrao",
    name: "Padrão (campo livre)",
    command: "",
  },
];

// ---------- FORMATS ----------
export async function listFormats(): Promise<Format[]> {
  const items = readLS<Format[]>(LS_FORMATS, DEFAULT_FORMATS);
  if (!localStorage.getItem(LS_FORMATS)) {
    writeLS(LS_FORMATS, items);
  }
  return items;
}

export async function createFormat(data: { name: string; description: string }) {
  const items = await listFormats();
  const newItem: Format = {
    id: Date.now().toString(),
    name: data.name,
    description: data.description,
    isDefault: false,
  };
  const next = [...items, newItem];
  writeLS(LS_FORMATS, next);
  return newItem;
}

export async function updateFormat(data: Format) {
  const items = await listFormats();
  const idx = items.findIndex((f) => f.id === data.id);
  if (idx >= 0) {
    // Protege o default de perder flag
    const isDefault = items[idx].isDefault;
    items[idx] = { ...items[idx], ...data, isDefault };
    writeLS(LS_FORMATS, items);
    return items[idx];
  }
  throw new Error("Formato não encontrado");
}

export async function deleteFormat(id: string) {
  const items = await listFormats();
  const found = items.find((f) => f.id === id);
  if (found?.isDefault) {
    throw new Error("Não é possível excluir um formato padrão.");
  }
  const next = items.filter((f) => f.id !== id);
  writeLS(LS_FORMATS, next);
  return { ok: true };
}

// ---------- PROMPTS ----------
export async function listPrompts(): Promise<Prompt[]> {
  const items = readLS<Prompt[]>(LS_PROMPTS, DEFAULT_PROMPTS);
  if (!localStorage.getItem(LS_PROMPTS)) {
    writeLS(LS_PROMPTS, items);
  }
  return items;
}

export async function createPrompt(data: { name: string; command: string }) {
  const items = await listPrompts();
  const newItem: Prompt = {
    id: Date.now().toString(),
    name: data.name,
    command: data.command,
  };
  const next = [...items, newItem];
  writeLS(LS_PROMPTS, next);
  return newItem;
}

export async function updatePrompt(data: Prompt) {
  const items = await listPrompts();
  const idx = items.findIndex((p) => p.id === data.id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...data };
    writeLS(LS_PROMPTS, items);
    return items[idx];
  }
  throw new Error("Prompt não encontrado");
}

export async function deletePrompt(id: string) {
  const items = await listPrompts();
  const next = items.filter((p) => p.id !== id);
  writeLS(LS_PROMPTS, next);
  return { ok: true };
}

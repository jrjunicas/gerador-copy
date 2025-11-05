// src/services/db.ts
const DB_API = "https://www.agenciamuum.com.br/gerador-copy/api";
const API_KEY = "troque-por-uma-chave-bem-forte"; // a MESMA do config.php

async function jfetch(url: string, init: RequestInit = {}) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(init.headers || {}),
    },
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Falha na requisição: ${resp.status} ${t}`);
  }
  return resp.json();
}

export async function savePreset(data: {
  client_name: string;
  content_style: string;
  prompt: string;
}) {
  return jfetch(`${DB_API}/create_preset.php`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listPresets(filters?: { client_name?: string; content_style?: string }) {
  const qs = new URLSearchParams();
  if (filters?.client_name) qs.set('client_name', filters.client_name);
  if (filters?.content_style) qs.set('content_style', filters.content_style);
  const q = qs.toString() ? `?${qs.toString()}` : '';
  return jfetch(`${DB_API}/list_presets.php${q}`);
}

export async function createClient(data: {
  name: string;
  tone_of_voice?: string;
  audience?: string;
  market?: string;
}) {
  return jfetch(`${DB_API}/create_client.php`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listClients(params?: { q?: string; limit?: number }) {
  const q = params?.q ? `?q=${encodeURIComponent(params.q)}${params?.limit ? `&limit=${params.limit}`:''}` :
            params?.limit ? `?limit=${params.limit}` : '';
  return jfetch(`${DB_API}/list_clients.php${q}`);
}

export async function updateClient(data: { id:number; name:string; tone_of_voice?:string; audience?:string; market?:string }) {
  return jfetch(`${DB_API}/update_client.php`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getClient(id: number) {
  return jfetch(`${DB_API}/get_client.php?id=${id}`);
}

export async function deleteClient(id: number) {
  return jfetch(`${DB_API}/delete_client.php?id=${id}`, { method: 'POST' });
}

const DB_API = "https://www.agenciamuum.com.br/gerador-copy/api"; // PHP na Hostinger
const API_KEY = "defina-uma-chave-forte-aqui"; // igual ao EXPECTED_KEY do config.php

async function jfetch(url: string, init: RequestInit = {}) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(init.headers || {}),
    },
  });
  if (!resp.ok) throw new Error('Falha na requisição');
  return resp.json();
}

export async function createClient(data: {
  name: string; email?: string; phone?: string; company?: string; notes?: string;
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

// opcionais
export async function getClient(id: number) {
  return jfetch(`${DB_API}/get_client.php?id=${id}`);
}

export async function updateClient(data: {
  id: number; name: string; email?: string; phone?: string; company?: string; notes?: string;
}) {
  return jfetch(`${DB_API}/update_client.php`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: number) {
  return jfetch(`${DB_API}/delete_client.php?id=${id}`, { method: 'POST' });
}

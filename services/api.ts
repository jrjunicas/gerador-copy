// src/services/api.ts
const API_BASE = "https://gerador-copy.onrender.com"; // sua API no Render

export async function generateViaApi(prompt: string) {
const resp = await fetch('https://gerador-copy.onrender.com/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!resp.ok) throw new Error('Falha na geração');
  return await resp.json();
}

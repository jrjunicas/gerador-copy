// src/services/api.ts
// Usa variável de ambiente quando existir, senão cai no Render por padrão.
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || "https://gerador-copy.onrender.com";

export async function generateViaApi(prompt: string) {
  const url = `${API_BASE}/api/generate`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("Erro da API:", resp.status, text);
    throw new Error("Falha na geração");
  }
  return resp.json();
}

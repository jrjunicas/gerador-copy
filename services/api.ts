// services/api.ts
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || "https://gerador-copy.onrender.com";

export async function generateViaApi(prompt: string) {
  const resp = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!resp.ok) throw new Error(`Falha na geração (${resp.status})`);
  return resp.json();
}

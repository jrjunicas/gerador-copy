# Instruções - Integração BD (Hostinger) + Front (Vite)

Gerado em 2025-11-05T11:34:09.013488Z

## O que foi adicionado
- `src/services/db.ts`: serviço para gravar e listar *Presets* (Cliente + Estilo + Prompt) e *Clientes* no MySQL via API PHP (Hostinger).

## Uso rápido
```ts
import { savePreset, listPresets } from '@/src/services/db';
await savePreset({ client_name:'Cliente X', content_style:'Carrossel', prompt:'...' });
const r = await listPresets({ client_name:'Cliente X' });
```

## Build
Use a Action do GitHub para gerar `dist/` e suba o conteúdo em `public_html/gerador-copy/`.

## Segurança
- Troque a `API_KEY` no `db.ts` e use a mesma no `config.php` da API PHP (não publique `config.php` no GitHub).

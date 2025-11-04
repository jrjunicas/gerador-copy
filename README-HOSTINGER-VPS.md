
# Deploy na Hostinger (VPS) — App Vite/React + API Node (Gemini Seguro)

Este pacote já está ajustado para produção segura: o **front-end** (Vite/React) roda como site estático, e a **API** com a chave da Gemini fica **no servidor** (Node/Express), evitando expor a chave no navegador.

## 📦 Estrutura
- `server/index.js` — API Express (rota `POST /api/generate`).
- `deploy-hostinger/nginx.conf.example` — modelo de site para Nginx.
- `deploy-hostinger/ecosystem.config.js` — configuração PM2 (process manager).
- `src/...` — seu front Vite/React.
- `dist/` — será gerada após `npm run build`.

## 🔐 Variáveis de ambiente
- `GEMINI_API_KEY` — **defina no servidor**, nunca no front.
- `GEMINI_ENDPOINT` — opcional. Padrão: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`.

---

## 🛠️ Passo a passo — VPS Hostinger (Ubuntu)

### 1) Preparar servidor
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

### 2) Subir o projeto
```bash
sudo mkdir -p /var/www/seuapp
sudo chown -R $USER:$USER /var/www/seuapp
cd /var/www/seuapp
# clone ou SFTP do ZIP
```

### 3) Instalar deps e build do front
```bash
npm ci || npm install
npm run build   # gera dist/
```

### 4) Iniciar API com PM2
```bash
export GEMINI_API_KEY="SUA_CHAVE_AQUI"
pm2 start deploy-hostinger/ecosystem.config.js
pm2 save
pm2 startup
```

### 5) Nginx (site + proxy)
```bash
sudo nano /etc/nginx/sites-available/seuapp.conf
# cole o conteúdo de deploy-hostinger/nginx.conf.example e ajuste SEU_DOMINIO_AQUI e paths

sudo ln -s /etc/nginx/sites-available/seuapp.conf /etc/nginx/sites-enabled/seuapp.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 6) HTTPS
```bash
sudo snap install core; sudo snap refresh core
sudo apt remove certbot -y || true
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d SEU_DOMINIO_AQUI
```

### 7) Teste
- Front: `https://SEU_DOMINIO_AQUI`
- API: `POST https://SEU_DOMINIO_AQUI/api/generate` com body `{ "prompt": "teste" }`

## 🧪 Teste local
```bash
GEMINI_API_KEY="SUA_CHAVE" npm run start:server
# Em outro terminal:
npm run build && npx serve -s dist -l 5173
# ou: npm run preview
```

## ❗ Importante
- Não exponha `GEMINI_API_KEY` no front.
- Onde você chamava a Gemini no cliente, agora use `generateViaApi(prompt)`.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚙️ Configuração do Vite
export default defineConfig({
  plugins: [react()],
  base: '/gerador-copy/', // 👈 importante para funcionar na subpasta da Hostinger
})

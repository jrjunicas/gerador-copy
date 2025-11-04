import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vite para rodar em subpasta /gerador-copy/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // ⚠️ Não injete a chave no front. O backend já cuida disso.
    define: {
      // Se algum código ainda usa process.env.API_KEY no front, remova esses usos.
      // Mantemos vazio para não vazar chave.
      'process.env.API_KEY': JSON.stringify(''),
      'process.env.GEMINI_API_KEY': JSON.stringify(''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    base: '/gerador-copy/', // 👈 importante p/ hospedar em subpasta
  }
})

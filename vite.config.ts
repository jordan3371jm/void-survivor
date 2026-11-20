import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

// Versione per itch.io (VITE_TARGET=itch): la pagina non carica Playgama Bridge.
const itchHtml = (): Plugin => ({
  name: 'itch-html',
  transformIndexHtml(html) {
    if (process.env.VITE_TARGET !== 'itch') return html;
    return html
      .replace(/\s*<link rel="preconnect" href="https:\/\/bridge\.playgama\.com" crossorigin \/>/, '')
      .replace(/\s*<!-- Playgama Bridge[\s\S]*?<\/script>/, '');
  },
});

// Percorsi relativi: la build funziona sia alla radice di un dominio
// sia dentro una sottocartella / iframe (es. Playgama).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), itchHtml()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: '0.0.0.0',
  },
});

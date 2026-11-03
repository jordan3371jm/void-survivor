import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

// Build per Klyo Games (VITE_TARGET=klyo): il kit di Klyo deve essere il PRIMO script della pagina
// (cosi' copia da solo i salvataggi del giocatore sul suo account); Playgama non serve.
const klyoHtml = (): Plugin => ({
  name: 'klyo-html',
  transformIndexHtml(html) {
    if (process.env.VITE_TARGET !== 'klyo') return html;
    return html
      .replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n    <script src="https://games.klyo.pl/sdk/klyo-gry-sdk.js"></script>')
      .replace(/\s*<link rel="preconnect" href="https:\/\/bridge\.playgama\.com" crossorigin \/>/, '')
      .replace(/\s*<!-- Playgama Bridge[\s\S]*?<\/script>/, '');
  },
});

// Percorsi relativi: la build funziona sia alla radice di un dominio
// sia dentro una sottocartella / iframe (es. Playgama).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), klyoHtml()],
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
          if (process.env.VITE_TARGET !== 'klyo' && id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
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

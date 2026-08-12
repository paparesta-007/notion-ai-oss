import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Il backend Express (progetto ../server) gira su :3000.
      // Il proxy fa sì che, dal punto di vista del browser, tutto giri sulla
      // stessa origin: i cookie di sessione (httpOnly) funzionano senza CORS.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});

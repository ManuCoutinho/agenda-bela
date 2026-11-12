import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // notificação das 18h (RF11): recebe o push do Cloud Messaging e abre /lembretes
      workbox: { importScripts: ['push-sw.js'] },
      manifest: {
        name: 'Agenda Bela',
        short_name: 'Agenda',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        theme_color: '#FEF9F6',
        background_color: '#FEF9F6',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});

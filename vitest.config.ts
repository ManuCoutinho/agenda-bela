import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'dominio',
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./src/setupTests.ts'],
          // o teste de contraste lê os tokens de index.css (`?raw`); o resto do CSS segue ignorado
          css: { include: [/src\/index\.css/] },
        },
      },
      {
        test: {
          name: 'regras',
          include: ['testes/regras/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
        },
      },
    ],
  },
});

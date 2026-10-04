import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production build goes straight into Spring Boot's static folder (Exp 9: one deployable jar).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' }
  }
});

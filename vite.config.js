import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/llm': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api/rag': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    emptyOutDir: true,   // 빌드 전 dist/ 자동 정리 — 구 파일 잔존 방지
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
            return 'react-vendor';
          }

          if (id.includes('node_modules/three') || id.includes('@react-three')) {
            return 'three-vendor';
          }

          if (id.includes('/src/screens/booth-guide/')) {
            return 'booth-guide';
          }

          if (id.includes('/src/screens/event-info/')) {
            return 'event-info';
          }

          if (id.includes('/src/data/')) {
            return 'data';
          }

          return undefined;
        },
      },
    },
  },
});

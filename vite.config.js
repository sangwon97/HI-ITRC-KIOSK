import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,   // 빌드 전 dist/ 자동 정리 — 구 파일 잔존 방지
  },
});

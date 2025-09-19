/**
 * title: Vite Config (빌드/개발 서버 설정)
 * purpose: React 플러그인과 Tailwind v4 PostCSS 플러그인을 등록하고 dev 서버(5174)를 구성합니다.
 * created: 2025-09-19T01:25:00+09:00
 * last_modified: 2025-09-19T01:25:00+09:00
 * maintainer: Cascade / Team GG
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwind(),
        autoprefixer(),
      ],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    open: false,
  },
})

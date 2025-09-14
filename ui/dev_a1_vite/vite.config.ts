/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/vite.config.ts
 * @분석일자: 2025-09-10T16:21Z (UTC) / 2025-09-11 01:21 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - Vite 개발 서버와 빌드 프로세스의 모든 동작을 제어하는 핵심 설정 파일입니다.
 *
 * @핵심역할
 *  - 1. (경로 설정) `base`와 `alias`를 통해 앱의 URL 경로와 임포트 경로를 설정합니다.
 *  - 2. (프록시 설정) `/api`와 `/bridge` 요청을 각각 백엔드와 브릿지 서버로 전달합니다.
 *  - 3. (개발 서버) `server` 객체를 통해 개발 서버의 포트, 호스트 등을 설정합니다.
 *  - 4. (빌드) `build` 객체를 통해 프로덕션 빌드 결과물의 출력 경로, 소스맵, 코드 분할 등을 정의합니다.
 *
 * @주요관계
 *  - (설정 제공) → Vite 개발 서버 및 빌드 프로세스
 *  - (경로 일치) → `index.html` (`base` 태그)
 *  - (프록시 대상) → FastAPI 백엔드 (포트 8000), 브릿지 서버 (포트 3037)
 *
 * @참고사항
 *  - 이 파일은 설정 파일로서 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    base: "/ui-dev/",

    plugins: [react()],

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    envPrefix: ["VITE_", "GG_", "GUMGANG_"],

    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      open: false,
      proxy: {
        "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/bridge": {
          target: "http://127.0.0.1:3037",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bridge/, ""),
        },
      },
    },

    preview: { host: "127.0.0.1", port: 5173, open: false },

    publicDir: "public",

    build: {
      outDir: "dist",
      sourcemap: isDev,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) return "vendor";
          },
        },
      },
    },
  };
});

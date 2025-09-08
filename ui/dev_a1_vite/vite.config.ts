import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    // 개발 시에도 고정된 base로 동작 (index.html의 <base href="/ui-dev/">와 일치)
    base: "/ui-dev/",

    plugins: [react()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    envPrefix: ["VITE_", "GG_", "GUMGANG_"],

    server: {
      // Listen on all interfaces (IPv4/IPv6) for better localhost/::1 compatibility
      host: "::",
      port: 5173,
      strictPort: true,
      open: false,
      proxy: {
        // Backend (FastAPI)
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
        // Bridge (serves static UI and file ops)
        // Add rewrite: strip `/bridge` prefix so requests like `/bridge/api/health`
        // become `/api/health` at the Bridge server (3037).
        "/bridge": {
          target: "http://127.0.0.1:3037",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bridge/, ""),
        },
      },
    },

    preview: {
      host: "localhost",
      port: 5173,
      open: false,
    },

    publicDir: "public",

    build: {
      outDir: "dist",
      sourcemap: isDev,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) return "vendor";
            return undefined;
          },
        },
      },
    },
  };
});

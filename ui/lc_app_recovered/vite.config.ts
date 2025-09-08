import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

// Vite config for recovered Gumgang LC App (React + TS)
// - Dev server: http://localhost:5173 or http://localhost:5173/ui-dev/
// - Proxies:
//    /api    -> FastAPI backend (http://127.0.0.1:8000)
//    /bridge -> Bridge server   (http://127.0.0.1:3037)

/**
 * Allow visiting the dev server under a prefixed path (/ui-dev/)
 * without changing the actual base('/') used by Vite.
 * This avoids redirect loops and keeps direct / working too.
 */
function devBaseRewrite(prefix = "/ui-dev/"): Plugin {
  const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return {
    name: "dev-base-rewrite",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url) return next();
        // If user opens http://localhost:5173/ui-dev/..., strip the prefix
        // so Vite can serve from '/' while the URL still contains /ui-dev/.
        if (req.url === base || req.url.startsWith(base)) {
          req.url = req.url.slice(base.length - 1) || "/";
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    // Keep base in sync with index.html <base href="/"> if you change it
    base: "/",

    plugins: [react(), isDev && devBaseRewrite("/ui-dev/")].filter(
      Boolean,
    ) as Plugin[],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    envPrefix: ["VITE_", "GG_", "GUMGANG_"],

    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      open: false,
      proxy: {
        // FastAPI backend
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
        // Bridge (UI + file ops)
        "/bridge": {
          target: "http://127.0.0.1:3037",
          changeOrigin: true,
        },
      },
    },

    preview: {
      host: "localhost",
      port: 5173,
      open: false,
    },

    publicDir: "public",

    optimizeDeps: {
      include: ["react", "react-dom"],
    },

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

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The Anthropic key is injected server-side by the dev proxy and never reaches the browser.
// Production builds are static and run in demo mode (recorded AI responses), so no key ships.
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // GitHub Pages serves a project site from /<repo-name>/, not the domain root.
    base: command === "build" ? "/auditmate-copilot/" : "/",
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      proxy: {
        "/api/anthropic": {
          target: "https://api.anthropic.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ""),
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY || "",
            "anthropic-version": "2023-06-01",
          },
        },
      },
    },
    build: { outDir: "dist", sourcemap: false },
  };
});

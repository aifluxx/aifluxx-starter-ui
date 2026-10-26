import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxyTarget = `http://127.0.0.1:${process.env.AIFLUXX_PROXY_PORT || 8787}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: { "/proxy": proxyTarget, "/local": proxyTarget },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
} as never);

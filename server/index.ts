import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { createApp } from "./app.js";
import { loadConfig, maskKey } from "./config.js";

const config = loadConfig();
const port = Number(process.env.AIFLUXX_PROXY_PORT || 8787);
const app = createApp({ config });

// Serve the built UI when present (npm run build && npm start).
if (existsSync("dist")) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, () => {
  const mode = config.mock ? "MOCK mode (fixtures, no network)" : `live → ${config.apiRoot} (key ${maskKey(config.apiKey)} from ${config.keySource})`;
  console.log(`AIFluxx proxy on http://127.0.0.1:${port} — ${mode}`);
});

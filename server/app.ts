import { Hono } from "hono";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { isAllowed } from "./allowlist.js";
import { classifyTools, CONNECTORS, publicToolId } from "./catalog.js";
import { maskKey, type ProxyConfig } from "./config.js";
import { MOCK_AGENTS, MOCK_KEYS, MOCK_ME, MOCK_RUN_LINES, MOCK_SPEC } from "./fixtures.js";

export interface AppOptions {
  config: ProxyConfig;
  fetchImpl?: typeof fetch;
  specPath?: string;
  mockDelayMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createApp({ config, fetchImpl = fetch, specPath, mockDelayMs = 250 }: AppOptions) {
  const app = new Hono();

  app.get("/local/config", (c) =>
    c.json({
      mock: config.mock,
      apiRoot: config.mock ? null : config.apiRoot,
      keyMasked: config.mock ? null : maskKey(config.apiKey),
      keySource: config.mock ? null : config.keySource,
      mcpUrl: config.mcpUrl,
    }),
  );

  app.get("/local/tools", (c) => {
    let text = MOCK_SPEC;
    let source = "bundled example (compliance template)";
    const path = specPath ?? join(process.cwd(), "spec.yaml");
    if (!config.mock && existsSync(path)) {
      text = readFileSync(path, "utf8");
      source = path;
    }
    let spec: { slug?: string; tools?: string[]; knowledge?: { connectors?: string[] } };
    try {
      spec = parseYaml(text) ?? {};
    } catch {
      return c.json({ error: "spec.yaml could not be parsed", source }, 400);
    }
    const connectors = (spec.knowledge?.connectors ?? []).map((id) => ({ id, known: CONNECTORS.includes(id) }));
    return c.json({ source, slug: spec.slug ?? null, tools: classifyTools(spec.tools ?? []), connectors });
  });

  app.all("/proxy/*", async (c) => {
    const url = new URL(c.req.url);
    const path = url.pathname.replace(/^\/proxy/, "");
    const method = c.req.method.toUpperCase();
    if (!isAllowed(method, path)) {
      return c.json({ error: "not_allowed", detail: `${method} ${path} is not on the starter UI allow-list.` }, 403);
    }
    if (config.mock) return mockRoute(method, path, c.req.raw, mockDelayMs);

    const target = `${config.apiRoot}${path}${url.search}`;
    const headers: Record<string, string> = { Authorization: `Bearer ${config.apiKey}`, Accept: c.req.header("accept") ?? "*/*" };
    const ct = c.req.header("content-type");
    if (ct) headers["Content-Type"] = ct;
    let upstream: Response;
    try {
      upstream = await fetchImpl(target, {
        method,
        headers,
        body: method === "GET" ? undefined : await c.req.arrayBuffer(),
        redirect: "manual",
      });
    } catch (err) {
      return c.json({ error: "upstream_unreachable", detail: (err as Error).message, url: target }, 502);
    }
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location") ?? "";
      const downgrade = location.startsWith("http://");
      return c.json(
        {
          error: "redirect_blocked",
          upstreamStatus: upstream.status,
          location,
          downgrade,
          detail: downgrade
            ? "The API tried to redirect to plain http (TLS downgrade). Not followed. Check the API root and trailing slashes."
            : "The API returned a redirect. The proxy does not follow redirects.",
        },
        502,
      );
    }
    const out = new Headers();
    for (const h of ["content-type", "cache-control"]) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  });

  return app;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function mockRoute(method: string, path: string, req: Request, delay: number): Promise<Response> {
  if (path === "/api/dev/me") return json(MOCK_ME);
  if (path === "/api/dev/agents") return json(MOCK_AGENTS);
  if (path === "/api/dev/keys") return json(MOCK_KEYS);
  if (/\/api\/dev\/keys\/.+\/rotate$/.test(path))
    return json({ id: "key_mock_b", secret: "afx_dev_mock_not_a_real_key_0000", last4: "0000", note: "Mock secret, shown once." });
  if (/\/api\/dev\/keys\/.+\/revoke$/.test(path)) return json({ revoked: true });
  if (path.endsWith("/runs")) {
    let prompt = "";
    try {
      prompt = String(((await req.json()) as { prompt?: string }).prompt ?? "");
    } catch {
      /* empty body */
    }
    const p = prompt.toLowerCase();
    if (p.includes("401")) return json({ detail: "Invalid or expired developer key. Sign in again." }, 401);
    if (p.includes("500")) return json({ detail: "Internal server error (simulated)." }, 500);
    if (p.includes("307"))
      return json({ error: "redirect_blocked", upstreamStatus: 307, location: "http://api.aifluxx.co.za/mcp", downgrade: true, detail: "The API tried to redirect to plain http (TLS downgrade). Not followed." }, 502);
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(ctrl) {
        for (const line of MOCK_RUN_LINES) {
          ctrl.enqueue(enc.encode(JSON.stringify(line) + "\n"));
          await sleep(delay);
        }
        ctrl.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "application/x-ndjson" } });
  }
  return json({ error: "not_found" }, 404);
}

export { publicToolId };

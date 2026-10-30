import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { isAllowed } from "../server/allowlist";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_API_ROOT, deriveMcpUrl, loadConfig, maskKey, parseDotenv, type ProxyConfig } from "../server/config";

const V = "11111111-1111-4111-8111-111111111111";
const live: ProxyConfig = {
  mock: false,
  apiRoot: "https://api.example.com",
  mcpUrl: "https://api.example.com/mcp/",
  apiKey: "afx_dev_testkey_abcd",
  keySource: "env",
};

function credsEnv(url: string, key = "afx_dev_fromfile_zzzz"): NodeJS.ProcessEnv {
  const dir = mkdtempSync(join(tmpdir(), "aifluxx-creds-"));
  const path = join(dir, "credentials");
  writeFileSync(path, JSON.stringify({ url, api_key: key }));
  return { AIFLUXX_CREDENTIALS: path };
}

describe("allow-list", () => {
  it("allows public dev routes", () => {
    expect(isAllowed("GET", "/api/dev/me")).toBe(true);
    expect(isAllowed("POST", `/api/dev/agents/standup/versions/${V}/runs`)).toBe(true);
    expect(isAllowed("POST", "/api/dev/keys/k1/rotate")).toBe(true);
  });
  it("refuses everything else", () => {
    expect(isAllowed("POST", "/api/dev/me")).toBe(false);
    expect(isAllowed("GET", "/api/companies/1/mail/send")).toBe(false);
    expect(isAllowed("POST", "/api/dev/agents/x/versions/not-a-uuid/runs")).toBe(false);
    expect(isAllowed("GET", "/api/dev/../admin")).toBe(false);
  });
});

describe("config", () => {
  const absent = { AIFLUXX_CREDENTIALS: "/nonexistent" } as NodeJS.ProcessEnv;
  it("defaults to mock with no key and derives MCP from prod", () => {
    const c = loadConfig(absent, "/nonexistent");
    expect(c.mock).toBe(true);
    expect(c.apiKey).toBeNull();
    expect(c.apiRoot).toBe(DEFAULT_API_ROOT);
    expect(c.mcpUrl).toBe(deriveMcpUrl(DEFAULT_API_ROOT));
    expect(c.mcpUrl.endsWith("/mcp/")).toBe(true);
  });
  it("uses AIFLUXX_API_URL and derives MCP from that root", () => {
    const c = loadConfig({ ...credsEnv("https://dev.developer.aifluxx.co.za"), AIFLUXX_API_URL: "https://staging.example/", AIFLUXX_API_KEY: "afx_dev_envkey_abcd" }, "/nonexistent");
    expect(c.apiRoot).toBe("https://staging.example");
    expect(c.mcpUrl).toBe("https://staging.example/mcp/");
    expect(c.keySource).toBe("env");
  });
  it("follows a dev URL from the CLI credentials file", () => {
    const c = loadConfig(credsEnv("https://dev.developer.aifluxx.co.za/"), "/nonexistent");
    expect(c.mock).toBe(false);
    expect(c.apiRoot).toBe("https://dev.developer.aifluxx.co.za");
    expect(c.mcpUrl).toBe("https://dev.developer.aifluxx.co.za/mcp/");
    expect(c.keySource).toBe("credentials");
  });
  it("keeps prod when the saved URL is not dev, including when the key comes from that file", () => {
    const c = loadConfig(credsEnv("https://developer.aifluxx.co.za"), "/nonexistent");
    expect(c.apiRoot).toBe(DEFAULT_API_ROOT);
    expect(c.mcpUrl).toBe(deriveMcpUrl(DEFAULT_API_ROOT));
    expect(c.keySource).toBe("credentials");
  });
  it("uses a dev credentials URL even when the key comes from the environment", () => {
    const c = loadConfig({ ...credsEnv("https://dev.developer.aifluxx.co.za", "afx_dev_filekey_zzzz"), AIFLUXX_API_KEY: "afx_dev_envkey_abcd" }, "/nonexistent");
    expect(c.apiRoot).toBe("https://dev.developer.aifluxx.co.za");
    expect(c.mcpUrl).toBe("https://dev.developer.aifluxx.co.za/mcp/");
    expect(c.keySource).toBe("env");
  });
  it("reads AIFLUXX_API_URL and MCP_URL from .env.local", () => {
    const dir = mkdtempSync(join(tmpdir(), "aifluxx-env-"));
    writeFileSync(join(dir, ".env.local"), "AIFLUXX_API_URL=https://from-file.example\nAIFLUXX_API_KEY=afx_dev_localkey_wxyz\nMCP_URL=https://mcp.from-file.example/mcp/\n");
    const c = loadConfig(absent, dir);
    expect(c.apiRoot).toBe("https://from-file.example");
    expect(c.mcpUrl).toBe("https://mcp.from-file.example/mcp/");
    expect(c.keySource).toBe(".env.local");
  });
  it("lets MCP_URL override the derived endpoint", () => {
    const c = loadConfig({ ...absent, AIFLUXX_API_URL: "https://api.example.com", AIFLUXX_API_KEY: "afx_dev_envkey_abcd", MCP_URL: "https://mcp.example.com/custom" }, "/nonexistent");
    expect(c.apiRoot).toBe("https://api.example.com");
    expect(c.mcpUrl).toBe("https://mcp.example.com/custom/");
    expect(c.mcpUrl).not.toContain("api.aifluxx.co.za");
  });
  it("masks keys and parses dotenv", () => {
    expect(maskKey("afx_dev_secretvalue1234")).toBe("afx_dev_…1234");
    expect(parseDotenv("# c\nA=1\nB=\"two\"\n")).toEqual({ A: "1", B: "two" });
  });
});

describe("proxy", () => {
  it("injects the key server-side and never returns it", async () => {
    let seen: RequestInit | undefined;
    let seenUrl = "";
    const app = createApp({ config: live, fetchImpl: (async (u: string, init: RequestInit) => { seenUrl = u; seen = init; return new Response('{"email":"agent@example.com"}', { headers: { "content-type": "application/json" } }); }) as never });
    const res = await app.request("/proxy/api/dev/me");
    expect(res.status).toBe(200);
    expect(seenUrl).toBe("https://api.example.com/api/dev/me");
    expect((seen?.headers as Record<string, string>).Authorization).toBe("Bearer afx_dev_testkey_abcd");
    expect(seen?.redirect).toBe("manual");
    const cfg = await (await app.request("/local/config")).text();
    expect(cfg).not.toContain("testkey");
    expect(cfg).toContain("https://api.example.com/mcp/");
    expect(cfg).not.toContain("https://api.aifluxx.co.za/mcp");
  });
  it("blocks redirects and flags http downgrades", async () => {
    const app = createApp({ config: live, fetchImpl: (async () => new Response(null, { status: 307, headers: { location: "http://api.example.com/mcp" } })) as never });
    const res = await app.request("/proxy/api/dev/agents");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("redirect_blocked");
    expect(body.downgrade).toBe(true);
  });
  it("rejects non-allow-listed paths", async () => {
    const app = createApp({ config: live, fetchImpl: (() => { throw new Error("should not fetch"); }) as never });
    expect((await app.request("/proxy/api/admin/users")).status).toBe(403);
  });
});

describe("mock mode", () => {
  const app = createApp({ config: { ...live, mock: true, apiKey: null }, mockDelayMs: 0 });
  it("serves fixtures and streams a run", async () => {
    const me = await (await app.request("/proxy/api/dev/me")).json();
    expect(me.email).toBe("agent@example.com");
    const run = await app.request(`/proxy/api/dev/agents/compliance-checklist/versions/${V}/runs`, { method: "POST", body: JSON.stringify({ prompt: "hi" }), headers: { "content-type": "application/json" } });
    const lines = (await run.text()).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.at(-1).type).toBe("done");
  });
  it("simulates a 401", async () => {
    const run = await app.request(`/proxy/api/dev/agents/x/versions/${V}/runs`, { method: "POST", body: JSON.stringify({ prompt: "show 401" }) });
    expect(run.status).toBe(401);
  });
  it("relabels legacy tool ids", async () => {
    const tools = await (await app.request("/local/tools")).json();
    expect(tools.tools.length).toBeGreaterThan(0);
  });
});

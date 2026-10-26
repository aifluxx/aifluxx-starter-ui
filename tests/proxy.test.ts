import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { isAllowed } from "../server/allowlist";
import { loadConfig, maskKey, parseDotenv, type ProxyConfig } from "../server/config";

const V = "11111111-1111-4111-8111-111111111111";
const live: ProxyConfig = { mock: false, apiRoot: "https://api.example.com", apiKey: "afx_dev_testkey_abcd", keySource: "env" };

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
  it("defaults to mock with no key", () => {
    const c = loadConfig({ AIFLUXX_CREDENTIALS: "/nonexistent" } as NodeJS.ProcessEnv, "/nonexistent");
    expect(c.mock).toBe(true);
    expect(c.apiKey).toBeNull();
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

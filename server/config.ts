import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_API_ROOT = "https://api.aifluxx.co.za";

export interface ProxyConfig {
  mock: boolean;
  apiRoot: string;
  /** Derived from the API root unless MCP_URL is set. Trailing slash included. */
  mcpUrl: string;
  /** Never sent to the browser. */
  apiKey: string | null;
  keySource: "env" | ".env.local" | "credentials" | null;
}

export function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

export function normalizeApiRoot(url: string): string {
  return (url || "").trim().replace(/\/+$/, "");
}

export function maskKey(key: string | null): string | null {
  if (!key) return null;
  return `afx_dev_…${key.slice(-4)}`;
}

function readCredentials(env: NodeJS.ProcessEnv): { url?: string; api_key?: string } | null {
  const override = env.AIFLUXX_CREDENTIALS?.trim();
  const path = override || join(homedir(), ".aifluxx", "credentials");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** CLI `aifluxx login --platform dev` stores a host whose first label is `dev`. */
function isDevApiUrl(url: string): boolean {
  const normalized = normalizeApiRoot(url);
  if (!normalized) return false;
  try {
    const host = new URL(normalized).hostname.replace(/\.$/, "").toLowerCase();
    return host === "dev" || host.startsWith("dev.");
  } catch {
    return false;
  }
}

/** MCP lives on the resolved API root. The trailing slash avoids an http redirect. */
export function deriveMcpUrl(apiRoot: string): string {
  return `${normalizeApiRoot(apiRoot)}/mcp/`;
}

function resolveMcpUrl(override: string, apiRoot: string): string {
  const explicit = override.trim();
  if (!explicit) return deriveMcpUrl(apiRoot);
  return `${explicit.replace(/\/+$/, "")}/`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): ProxyConfig {
  const local = existsSync(join(cwd, ".env.local")) ? parseDotenv(readFileSync(join(cwd, ".env.local"), "utf8")) : {};
  const get = (k: string) => (env[k]?.trim() || local[k]?.trim() || "");
  const creds = readCredentials(env);
  let apiKey: string | null = null;
  let keySource: ProxyConfig["keySource"] = null;
  if (env.AIFLUXX_API_KEY?.trim()) {
    apiKey = env.AIFLUXX_API_KEY.trim();
    keySource = "env";
  } else if (local.AIFLUXX_API_KEY?.trim()) {
    apiKey = local.AIFLUXX_API_KEY.trim();
    keySource = ".env.local";
  } else if (creds?.api_key && String(creds.api_key).trim()) {
    apiKey = String(creds.api_key).trim();
    keySource = "credentials";
  }
  const savedUrl = normalizeApiRoot(String(creds?.url ?? ""));
  const credUrl = isDevApiUrl(savedUrl) ? savedUrl : "";
  const apiRoot = normalizeApiRoot(get("AIFLUXX_API_URL") || credUrl || DEFAULT_API_ROOT);
  const mcpUrl = resolveMcpUrl(get("MCP_URL"), apiRoot);
  const mockFlag = ["1", "true", "yes"].includes(get("AIFLUXX_MOCK").toLowerCase());
  return { mock: mockFlag || !apiKey, apiRoot, mcpUrl, apiKey, keySource };
}

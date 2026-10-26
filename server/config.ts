import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_API_ROOT = "https://api.aifluxx.co.za";
export const MCP_URL = "https://api.aifluxx.co.za/mcp/";

export interface ProxyConfig {
  mock: boolean;
  apiRoot: string;
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

function readCredentials(): { url?: string; api_key?: string } | null {
  const override = process.env.AIFLUXX_CREDENTIALS?.trim();
  const path = override || join(homedir(), ".aifluxx", "credentials");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): ProxyConfig {
  const local = existsSync(join(cwd, ".env.local")) ? parseDotenv(readFileSync(join(cwd, ".env.local"), "utf8")) : {};
  const get = (k: string) => (env[k]?.trim() || local[k]?.trim() || "");
  let apiKey: string | null = null;
  let keySource: ProxyConfig["keySource"] = null;
  let credUrl = "";
  if (env.AIFLUXX_API_KEY?.trim()) {
    apiKey = env.AIFLUXX_API_KEY.trim();
    keySource = "env";
  } else if (local.AIFLUXX_API_KEY?.trim()) {
    apiKey = local.AIFLUXX_API_KEY.trim();
    keySource = ".env.local";
  } else {
    const creds = readCredentials();
    if (creds?.api_key) {
      apiKey = String(creds.api_key).trim();
      keySource = "credentials";
      credUrl = String(creds.url || "");
    }
  }
  const apiRoot = normalizeApiRoot(get("AIFLUXX_API_URL") || credUrl || DEFAULT_API_ROOT);
  const mockFlag = ["1", "true", "yes"].includes(get("AIFLUXX_MOCK").toLowerCase());
  return { mock: mockFlag || !apiKey, apiRoot, apiKey, keySource };
}

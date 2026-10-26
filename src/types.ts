export interface LocalConfig { mock: boolean; apiRoot: string | null; keyMasked: string | null; keySource: string | null; mcpUrl: string }
export interface Version { id: string; version: string; status: string; created_at?: string }
export interface Agent { slug: string; name?: string; category?: string; versions?: Version[] }
export interface RunRecord {
  id: number; slug: string; versionId: string; prompt: string; startedAt: string;
  lines: string[]; state: "running" | "done" | "error"; error?: { status: number; method: string; url: string; body: unknown; hint: string | null };
}

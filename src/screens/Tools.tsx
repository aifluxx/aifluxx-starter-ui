import { useEffect, useState } from "react";
import { request } from "../lib/api";

interface ToolsResp { source: string; slug: string | null; tools: { id: string; kind: string }[]; connectors: { id: string; known: boolean }[] }

export const TOOL_LABELS: Record<string, string> = { ask_knowledge: "Ask (knowledge)" };

export function Tools() {
  const [data, setData] = useState<ToolsResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { request<ToolsResp>("GET", "/local/tools").then(setData).catch((e) => setErr(String(e))); }, []);
  if (err) return <section><h2>Tools</h2><div className="error">{err}</div></section>;
  if (!data) return <section><h2>Tools</h2><p className="muted">Loading…</p></section>;
  const group = (k: string) => data.tools.filter((t) => t.kind === k);
  return (
    <section>
      <h2>Tools</h2>
      <p className="muted">From <code>{data.source}</code>{data.slug && <> · agent <code>{data.slug}</code></>}. Grouped with the SDK’s offline catalog.</p>
      {(["read", "write", "unknown"] as const).map((k) => group(k).length > 0 && (
        <div key={k}>
          <h3>{k === "read" ? "Read tools" : k === "write" ? "Write tools ⚠" : "Not in catalog"}</h3>
          <ul className="chips">{group(k).map((t) => <li key={t.id} className={`chip ${k}`}>{TOOL_LABELS[t.id] ?? t.id}</li>)}</ul>
        </div>
      ))}
      <h3>Knowledge connectors</h3>
      {data.connectors.length === 0 ? <p className="muted">None.</p> : <ul className="chips">{data.connectors.map((c) => <li key={c.id} className="chip">{c.id}{!c.known && " (unknown)"}</li>)}</ul>}
    </section>
  );
}

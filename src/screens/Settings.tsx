import { useEffect, useState } from "react";
import { ApiError, devPath, request } from "../lib/api";
import { ErrorBox } from "../components";
import type { LocalConfig, RunRecord } from "../types";

interface Key { id: string; label?: string; last4?: string; status?: string; created_at?: string }

export function mcpSnippet(url: string) {
  return JSON.stringify({ mcpServers: { aifluxx: { url, headers: { Authorization: "Bearer ${AIFLUXX_API_KEY}" } } } }, null, 2);
}

export function Settings({ cfg }: { cfg: LocalConfig }) {
  const [me, setMe] = useState<Record<string, unknown> | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [err, setErr] = useState<RunRecord["error"] | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const toErr = (e: unknown) => (e instanceof ApiError ? { status: e.status, method: e.method, url: e.url, body: e.body, hint: e.hint } : { status: 0, method: "", url: "", body: String(e), hint: null });

  async function check() {
    setErr(null);
    try {
      setMe(await request("GET", devPath("/me")));
      setKeys(await request<Key[]>("GET", devPath("/keys")));
    } catch (e) { setMe(null); setErr(toErr(e)); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { check(); }, []);

  async function act(id: string, action: "rotate" | "revoke") {
    if (!window.confirm(`${action === "rotate" ? "Rotate" : "Revoke"} key ${id}? ${action === "revoke" ? "Anything using it stops working." : "The old key stops working."}`)) return;
    try {
      const res = await request<{ secret?: string }>("POST", devPath(`/keys/${encodeURIComponent(id)}/${action}`));
      if (res.secret) setSecret(res.secret);
      await check();
    } catch (e) { setErr(toErr(e)); }
  }

  return (
    <section>
      <h2>Settings</h2>
      <dl>
        <dt>Mode</dt><dd>{cfg.mock ? "Mock (fixtures, no network)" : "Live"}</dd>
        <dt>API root</dt><dd><code>{cfg.apiRoot ?? "—"}</code> <span className="muted">(AIFLUXX_API_URL, or a dev URL from aifluxx login; restart to change)</span></dd>
        <dt>Key</dt><dd>{cfg.keyMasked ? <><code>{cfg.keyMasked}</code> from {cfg.keySource}</> : "none (mock)"} · {me ? <span className="badge published">valid</span> : err ? <span className="badge error">invalid</span> : "checking…"} <button className="small" onClick={check}>Check</button></dd>
        {me && <><dt>Signed in as</dt><dd>{String(me.email ?? me.name ?? "")}</dd></>}
      </dl>
      {err && <ErrorBox error={err} />}
      {secret && <div className="notice"><strong>New key — shown once. Copy it into your credential store now.</strong><pre>{secret}</pre><button className="small" onClick={() => setSecret(null)}>I saved it</button></div>}
      <h3>Keys</h3>
      <table><thead><tr><th>Id</th><th>Label</th><th>Key</th><th>Status</th><th /></tr></thead>
        <tbody>{keys.map((k) => <tr key={k.id}><td><code>{k.id}</code></td><td>{k.label}</td><td><code>afx_dev_…{k.last4}</code></td><td>{k.status}</td>
          <td><button className="small" onClick={() => act(k.id, "rotate")}>Rotate</button> <button className="small danger" onClick={() => act(k.id, "revoke")}>Revoke</button></td></tr>)}</tbody></table>
      <h3>MCP config</h3>
      <p className="muted">The trailing slash is required; without it the server redirects to http.</p>
      <pre>{mcpSnippet(cfg.mcpUrl)}</pre>
    </section>
  );
}

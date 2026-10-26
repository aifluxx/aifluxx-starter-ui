import { ErrorBox } from "../components";
import type { Agent, RunRecord } from "../types";

export function Status({ agents, runs, error, reload }: { agents: Agent[]; runs: RunRecord[]; error: RunRecord["error"] | null; reload: () => void }) {
  return (
    <section>
      <h2>Status &amp; logs <button className="small" onClick={reload}>Refresh</button></h2>
      {error && <ErrorBox error={error} />}
      <table>
        <thead><tr><th>Agent</th><th>Version</th><th>Status</th><th>Version id</th></tr></thead>
        <tbody>
          {agents.flatMap((a) => (a.versions ?? []).map((v) => (
            <tr key={v.id}><td>{a.name ?? a.slug}</td><td>{v.version}</td><td><span className={`badge ${v.status}`}>{v.status}</span></td><td><code>{v.id}</code></td></tr>
          )))}
        </tbody>
      </table>
      <h3>Run logs (this session)</h3>
      {runs.length === 0 && <p className="muted">No runs yet.</p>}
      {runs.map((r) => (
        <details key={r.id}>
          <summary><span className={`badge ${r.state}`}>{r.state}</span> {r.slug} · {new Date(r.startedAt).toLocaleTimeString()} · {r.prompt}</summary>
          <pre>{r.lines.join("\n") || "(no stream lines)"}</pre>
          {r.error && <ErrorBox error={r.error} />}
        </details>
      ))}
    </section>
  );
}

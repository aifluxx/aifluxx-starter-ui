import { useState } from "react";
import { ApiError, startRun, streamLines } from "../lib/api";
import { renderLine } from "../lib/stream";
import { ErrorBox } from "../components";
import type { Agent, RunRecord } from "../types";

interface Props { agents: Agent[]; runs: RunRecord[]; onRun: (r: RunRecord) => void; mock: boolean }

export function RunConsole({ agents, runs, onRun, mock }: Props) {
  const options = agents.flatMap((a) => (a.versions ?? []).map((v) => ({ key: `${a.slug}|${v.id}`, label: `${a.name ?? a.slug} · v${v.version} (${v.status})` })));
  const [sel, setSel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const current = runs[0];
  const choice = sel || options[0]?.key || "";

  async function go() {
    const [slug, versionId] = choice.split("|");
    if (!slug || !prompt.trim()) return;
    const rec: RunRecord = { id: Date.now(), slug, versionId, prompt, startedAt: new Date().toISOString(), lines: [], state: "running" };
    onRun({ ...rec });
    setBusy(true);
    try {
      const res = await startRun(slug, versionId, prompt);
      for await (const line of streamLines(res)) {
        rec.lines = [...rec.lines, line];
        onRun({ ...rec });
      }
      rec.state = "done";
    } catch (e) {
      rec.state = "error";
      if (e instanceof ApiError) rec.error = { status: e.status, method: e.method, url: e.url, body: e.body, hint: e.hint };
      else rec.error = { status: 0, method: "POST", url: "", body: String(e), hint: "Could not reach the local proxy." };
    }
    onRun({ ...rec });
    setBusy(false);
    setPrompt("");
  }

  return (
    <section>
      <h2>Run console</h2>
      <p className="muted">Runs a pushed agent version and streams its output. Labelled “run” until conversational chat is available.</p>
      <div className="row">
        <select value={choice} onChange={(e) => setSel(e.target.value)} aria-label="Agent version">
          {options.length === 0 && <option value="">No agents found</option>}
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      <textarea rows={3} value={prompt} placeholder={mock ? "Try a prompt. Include 401, 500 or 307 to see simulated errors." : "Ask the agent something…"}
        onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) go(); }} />
      <button disabled={busy || !choice || !prompt.trim()} onClick={go}>{busy ? "Running…" : "Run"}</button>
      {current && (
        <div className="output">
          <div className="muted">› {current.prompt}</div>
          <div className="stream">
            {current.lines.map(renderLine).map((r, i) => r && <span key={i} className={`l-${r.kind}`}>{r.kind === "text" ? r.text : <><br />{r.text}<br /></>}</span>)}
          </div>
          {current.error && <ErrorBox error={current.error} />}
        </div>
      )}
      {runs.length > 1 && (
        <>
          <h3>Session prompts</h3>
          <ul className="history">{runs.slice(1).map((r) => <li key={r.id}><code>{r.slug}</code> {r.prompt} <span className={`badge ${r.state}`}>{r.state}</span></li>)}</ul>
        </>
      )}
    </section>
  );
}

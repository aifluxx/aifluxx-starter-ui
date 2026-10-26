import type { RunRecord } from "./types";

export function ErrorBox({ error }: { error: NonNullable<RunRecord["error"]> }) {
  return (
    <div className="error">
      <strong>HTTP {error.status}</strong> · {error.method} <code>{error.url}</code>
      {error.hint && <p>{error.hint}</p>}
      <pre>{typeof error.body === "string" ? error.body : JSON.stringify(error.body, null, 2)}</pre>
    </div>
  );
}

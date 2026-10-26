/** Browser-side client. Talks only to the local proxy; never sees a key. */
export class ApiError extends Error {
  constructor(public status: number, public method: string, public url: string, public body: unknown) {
    super(`${method} ${url} → ${status}`);
  }
  get hint(): string | null {
    const b = this.body as { error?: string; downgrade?: boolean } | null;
    if (this.status === 401) return "Sign in again: run `aifluxx login` or update AIFLUXX_API_KEY, then restart the proxy.";
    if (b?.error === "redirect_blocked") return b.downgrade ? "TLS downgrade blocked: the API redirected to http and the proxy did not follow it." : "Redirect not followed.";
    if (b?.error === "not_allowed") return "This path is not on the proxy allow-list.";
    return null;
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, method, url, await readBody(res));
  return (await readBody(res)) as T;
}

export const devPath = (p: string) => `/proxy/api/dev${p}`;

/** Split a byte stream into lines as they arrive. */
export async function* streamLines(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, "");
      buf = buf.slice(i + 1);
      if (line.trim()) yield line;
    }
  }
  if (buf.trim()) yield buf;
}

export async function startRun(slug: string, versionId: string, prompt: string): Promise<Response> {
  const url = devPath(`/agents/${encodeURIComponent(slug)}/versions/${encodeURIComponent(versionId)}/runs`);
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
  if (!res.ok) throw new ApiError(res.status, "POST", url, await readBody(res));
  return res;
}

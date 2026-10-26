/**
 * Renders one run-stream line. The exact host format is still an open
 * question, so JSON lines are rendered by type, SSE `data:` is unwrapped,
 * and anything else is shown as plain text.
 */
export type Rendered =
  | { kind: "text"; text: string }
  | { kind: "tool"; text: string }
  | { kind: "citation"; text: string }
  | { kind: "status"; text: string }
  | { kind: "raw"; text: string };

export function renderLine(line: string): Rendered | null {
  let s = line.trim();
  if (!s || s.startsWith(":") || s.startsWith("event:")) return null;
  if (s.startsWith("data:")) s = s.slice(5).trim();
  if (s === "[DONE]") return { kind: "status", text: "done" };
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(s);
  } catch {
    return { kind: "text", text: s };
  }
  if (typeof obj !== "object" || obj === null) return { kind: "text", text: String(obj) };
  const type = String(obj.type ?? "");
  if (type === "text" || "delta" in obj) return { kind: "text", text: String(obj.delta ?? obj.text ?? "") };
  if (type === "tool") return { kind: "tool", text: `tool: ${String(obj.name)}` };
  if (type === "citation") return { kind: "citation", text: `[${String(obj.index)}] ${String(obj.title)}` };
  if (type === "status" || type === "done") return { kind: "status", text: String(obj.message ?? obj.status ?? type) };
  return { kind: "raw", text: s };
}

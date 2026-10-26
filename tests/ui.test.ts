import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderLine } from "../src/lib/stream";
import { publicToolId } from "../server/catalog";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
}

describe("stream renderer", () => {
  it("handles JSON lines, SSE and plain text", () => {
    expect(renderLine('{"type":"text","delta":"hi"}')).toEqual({ kind: "text", text: "hi" });
    expect(renderLine('data: {"type":"citation","index":1,"title":"A.pdf"}')).toEqual({ kind: "citation", text: "[1] A.pdf" });
    expect(renderLine("plain")).toEqual({ kind: "text", text: "plain" });
    expect(renderLine(": keepalive")).toBeNull();
  });
});

describe("branding", () => {
  it("relabels the legacy knowledge tool", () => {
    expect(publicToolId("ask_" + "truest")).toBe("ask_knowledge");
  });
  it("UI source has no legacy brand or key strings", () => {
    for (const f of [...walk("src"), "index.html"]) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/truest/i);
      expect(text, f).not.toMatch(/afx_dev_[A-Za-z0-9]{8,}/);
    }
  });
});

/** Public /api/dev/* routes the starter UI may reach. Everything else is refused. */
const SEG = "[A-Za-z0-9._-]+";
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

const RULES: Array<{ method: string; re: RegExp }> = [
  { method: "GET", re: /^\/api\/dev\/me$/ },
  { method: "GET", re: /^\/api\/dev\/agents$/ },
  { method: "POST", re: new RegExp(`^/api/dev/agents/${SEG}/versions/${UUID}/runs$`) },
  { method: "GET", re: /^\/api\/dev\/keys$/ },
  { method: "POST", re: new RegExp(`^/api/dev/keys/${SEG}/(rotate|revoke)$`) },
];

export function isAllowed(method: string, path: string): boolean {
  if (path.includes("..") || path.includes("//")) return false;
  return RULES.some((r) => r.method === method.toUpperCase() && r.re.test(path));
}

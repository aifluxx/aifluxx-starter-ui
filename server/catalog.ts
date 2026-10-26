/**
 * Copy of the SDK's offline allow-lists (aifluxx_sdk/catalog.py).
 * The host becomes the source of truth once GET /api/dev/tools exists.
 */
export const READ_TOOLS = [
  "list_compliance_obligations",
  "get_compliance_status",
  "search_documents",
  "get_document",
  "ask_knowledge",
  "list_mandate_tasks",
  "list_contacts",
  "list_businesses",
];
export const WRITE_TOOLS = ["send", "send_mail", "mail_send", "create_task", "update_task", "add_note", "create_document", "write_document"];
export const CONNECTORS = ["gmail_mail", "imap_mail", "ms_graph_mail", "sharepoint", "google_drive", "onedrive", "slack"];

/**
 * Legacy host tool ids still published by the API, mapped to the public name
 * shown in the UI. Kept server-side so the browser bundle never carries them.
 */
const LEGACY_ALIASES: Record<string, string> = { ask_truest: "ask_knowledge" };

export function publicToolId(id: string): string {
  return LEGACY_ALIASES[id] ?? id;
}

export interface ToolRow { id: string; kind: "read" | "write" | "unknown" }

export function classifyTools(ids: string[]): ToolRow[] {
  return ids.map(publicToolId).map((id) => ({
    id,
    kind: READ_TOOLS.includes(id) ? "read" : WRITE_TOOLS.includes(id) ? "write" : "unknown",
  }));
}

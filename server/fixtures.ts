/** Fake data for mock mode. No real customers, no network. */
export const MOCK_ME = { email: "agent@example.com", name: "Example Developer", developer_id: "dev_mock_0001" };

export const MOCK_AGENTS = [
  {
    slug: "compliance-checklist",
    name: "Compliance checklist",
    category: "compliance",
    versions: [
      { id: "11111111-1111-4111-8111-111111111111", version: "0.1.0", status: "draft", created_at: "2026-10-20T09:00:00Z" },
      { id: "22222222-2222-4222-8222-222222222222", version: "0.2.0", status: "in_review", created_at: "2026-10-24T09:00:00Z" },
    ],
  },
  {
    slug: "qa-over-documents",
    name: "Q&A over documents",
    category: "general",
    versions: [{ id: "33333333-3333-4333-8333-333333333333", version: "0.1.0", status: "published", created_at: "2026-10-22T09:00:00Z" }],
  },
];

export const MOCK_KEYS = [
  { id: "key_mock_a", label: "laptop", last4: "m0ck", created_at: "2026-10-01T08:00:00Z", status: "active" },
];

export const MOCK_RUN_LINES = [
  { type: "status", message: "Run started" },
  { type: "tool", name: "search_documents", args: { query: "open obligations" } },
  { type: "text", delta: "There are 2 open obligations for Example Co. " },
  { type: "text", delta: "The annual return is due 30 Nov [1]; the beneficial-ownership filing is missing evidence [2]." },
  { type: "citation", index: 1, title: "Annual return checklist.pdf" },
  { type: "citation", index: 2, title: "Ownership register (example).xlsx" },
  { type: "done", status: "completed" },
];

export const MOCK_SPEC = `schema: aifluxx/agent/v1
slug: compliance-checklist
name: Compliance Checklist
description: >
  List open obligations and missing evidence for a jurisdiction the caller can already see.
version: 0.1.0
category: compliance
trigger:
  type: chat
tools:
  - list_compliance_obligations
  - get_compliance_status
  - search_documents
  - get_document
pricing:
  model: free
  amount_minor: 0
  currency: USD
`;

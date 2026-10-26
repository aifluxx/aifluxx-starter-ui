# Security

## Model
- The browser only talks to `http://127.0.0.1` (Vite on 5173, proxy on 8787). The proxy binds to 127.0.0.1 only.
- The proxy reads your `afx_dev_` key from `AIFLUXX_API_KEY`, `.env.local`, or `~/.aifluxx/credentials` (the `aifluxx login` store) and adds the `Authorization` header server-side. The key is never sent to the browser, never stored in localStorage, and there are no `VITE_*` key variables. The UI only sees a masked form (`afx_dev_…abcd`).
- The one exception: a newly rotated secret is shown once in Settings so you can save it.
- Only an allow-list of public `/api/dev/*` routes is forwarded (`me`, `agents`, `runs`, `keys`). Everything else gets 403.
- Redirects are never followed. A redirect to `http://` is reported as a TLS downgrade.
- Never commit `.env` / `.env.local`. Only `.env.example` (placeholders) is tracked.

## Reporting a vulnerability
Email **developer@aifluxx.com** with details and steps to reproduce. Please do not open a public issue for security reports.

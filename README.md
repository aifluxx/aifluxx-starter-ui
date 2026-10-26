# AIFluxx Starter Console

A small local web console for trying out agent packages you built with `aifluxx init`: run a pushed version and watch it stream, check status and logs, see its tools, and manage your developer key.

Vite + React + TypeScript, plus a tiny local proxy (Hono) that keeps your key server-side.

## Quickstart

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. With no key configured, it starts in **mock mode**.

### Mock mode
Fixtures only: no network, no key. A **MOCK** badge shows in the header. Force it any time with:

```bash
npm run dev:mock      # or AIFLUXX_MOCK=1 npm run dev
```

In the run console, put `401`, `500` or `307` in a prompt to see simulated errors.

### Connecting a key
Any one of these works (first match wins):

1. `aifluxx login` (the SDK stores the key in `~/.aifluxx/credentials`). Nothing else needed.
2. `cp .env.example .env.local` and set `AIFLUXX_API_KEY=afx_dev_…`.
3. `AIFLUXX_API_KEY=afx_dev_… npm run dev`.

Restart `npm run dev`, then open **Settings** to check the key against `/api/dev/me`. Optional `AIFLUXX_API_URL` overrides the API root (default `https://api.aifluxx.co.za`).

To see your agent's tools, put its `spec.yaml` in the project root (or run from your package directory).

## Screens
- **Run**: pick an agent version, send a prompt, watch the streamed output.
- **Status**: your agents, versions and statuses; raw stream log and HTTP errors (status, method, URL, body) for each run.
- **Tools**: tools and connectors from `spec.yaml`, grouped read/write; write tools flagged.
- **Settings**: API root, key status (masked), keys list with rotate/revoke, MCP config snippet.

## Scripts
`npm run dev` · `npm run dev:mock` · `npm run build` then `npm start` (serves `dist/` from the proxy) · `npm run lint` · `npm run typecheck` · `npm test`

## Security
See [SECURITY.md](SECURITY.md). In short: the key stays in the local proxy, only public `/api/dev/*` routes are forwarded, redirects are never followed.

## Contact
Questions or feedback: **developer@aifluxx.com**

MIT licensed.

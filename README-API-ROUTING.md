# Same-origin API gateway

The Cadence website's current frontend requests REST paths as `/api/...` on
`geometrydash.devs.li`. The Express backend is a separate Enzonic service.
This Worker bridges those same-origin paths to that backend.

## Configure and deploy

1. From the repository root, install Wrangler in your deployment environment:
   `npm install --save-dev wrangler`
2. Authenticate Wrangler with the Cloudflare account that owns the `devs.li` zone.
3. Set the Worker secret to the exact Enzonic Node service origin:
   `npx wrangler secret put API_ORIGIN`
   Use the backend origin only (for example, `https://your-existing-enzonic-service.example`),
   without an `/api` suffix. Do not put credentials or tokens in this repository.
4. Deploy: `npx wrangler deploy`.
5. Verify `https://geometrydash.devs.li/api/health` returns JSON with
   `ok: true` and response header `x-gd-api-proxy: enzonic`.

The Worker forwards only to `API_ORIGIN`; it never calls Boomlings or another
Geometry Dash service. Missing configuration returns HTTP 503, upstream connection
failure returns HTTP 502, timeout returns HTTP 504, and actual Express route
responses (including genuine 404s) pass through unchanged.

The Express backend must have `CORS_ORIGIN=https://geometrydash.devs.li`.
Do not configure the frontend to point directly at the backend: same-origin
routing keeps browser requests simple and avoids exposing backend topology.

## Routes

- `/api/*` — Express REST API (accounts, profiles, game, levels, social, leaderboards)
- `/relay/*` — Cadence protocol relay paths
- `/database/*` — Cadence protocol paths

This repository does not contain your Enzonic service origin or Cloudflare
account configuration. Deployment must be completed in the connected Cloudflare
account with the correct secret.

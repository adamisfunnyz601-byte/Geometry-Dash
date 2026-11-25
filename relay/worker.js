/**
 * Same-origin API gateway for geometrydash.devs.li.
 *
 * Set API_ORIGIN as a Worker secret to the Enzonic Node/Express service origin.
 * Requests are forwarded only to that origin; there is deliberately no official
 * Geometry Dash/Boomlings fallback.
 */
const ROUTED_PREFIXES = ["/api/", "/relay/", "/database/"];
const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host"
]);

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (!ROUTED_PREFIXES.some((prefix) => incoming.pathname.startsWith(prefix))) {
      return new Response("Not found", { status: 404 });
    }

    if (!env.API_ORIGIN) {
      return jsonError(503, "API gateway is not configured: API_ORIGIN is missing");
    }

    let upstream;
    try {
      upstream = new URL(env.API_ORIGIN);
      if (upstream.protocol !== "https:" && upstream.hostname !== "localhost") {
        return jsonError(500, "API_ORIGIN must use HTTPS");
      }
    } catch {
      return jsonError(500, "API_ORIGIN is not a valid URL");
    }

    upstream.pathname = upstream.pathname.replace(/\/$/, "") + incoming.pathname;
    upstream.search = incoming.search;

    const headers = new Headers(request.headers);
    for (const name of HOP_BY_HOP) headers.delete(name);
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", incoming.protocol.slice(0, -1));

    try {
      const response = await fetch(upstream, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "manual",
        signal: AbortSignal.timeout(25000)
      });
      const outHeaders = new Headers(response.headers);
      outHeaders.set("x-gd-api-proxy", "enzonic");
      outHeaders.set("cache-control", "no-store");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: outHeaders
      });
    } catch (error) {
      const timedOut = error?.name === "TimeoutError";
      return jsonError(timedOut ? 504 : 502,
        timedOut ? "Enzonic API timed out" : "Enzonic API is unreachable");
    }
  }
};

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-gd-api-proxy": "enzonic"
    }
  });
}

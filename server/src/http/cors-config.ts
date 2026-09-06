import type { CorsOptions } from "cors";

/**
 * Local dev (frontend and server both on localhost) and the default,
 * ALLOWED_ORIGINS-unset case both keep the original permissive behavior —
 * this must never require a config change just to run `npm run dev`.
 * Production sets ALLOWED_ORIGINS to the exact Vercel origin(s), which is
 * the "genuinely required" cross-origin change once frontend and server
 * are deployed separately: tightening from "any origin" to "this specific
 * one" now that the API is a public, real-cost-bearing surface.
 */
export function buildCorsOptions(): CorsOptions {
  const configured = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (configured.length === 0) {
    return { origin: true };
  }

  return {
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, same-origin) — allow.
      if (!origin || configured.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin "${origin}" is not allowed`));
    },
  };
}

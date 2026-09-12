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
/**
 * A browser's `Origin` header is always exactly scheme + host + port — never
 * a path, query string, or trailing slash. Someone configuring this by
 * pasting a URL straight out of an address bar (query string and all, as
 * happened in testing) is an easy, one-character-invisible mistake to make,
 * and getting it wrong doesn't fail loudly — it just makes the whole
 * frontend look permanently "reconnecting." Parsing each configured value
 * down to its origin means that mistake stops mattering.
 */
function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function buildCorsOptions(): CorsOptions {
  const configured = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(toOrigin)
    .filter((o): o is string => o !== null);

    return { origin: true };
    },
  };
}

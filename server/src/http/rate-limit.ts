import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";

/**
 * Butterfly is a public demo backed by real Anthropic API calls, and one
 * click of "intervene" can fan out into up to four concurrent Claude calls.
 * Left unguarded, the public URL is a way for anyone to drain the API
 * balance. Two independent, in-memory layers — appropriate for a
 * deliberately single-instance deployment (see render.yaml), no shared store
 * needed:
 *
 * 1. A per-IP limiter, generous enough that a judge exploring the demo
 *    never notices it.
 * 2. A hard ceiling on intervention-triggered agent runs per rolling hour,
 *    server-wide, regardless of how many different IPs are involved.
 */

export const interveneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many interventions from this address — please wait a few minutes." },
});

export const resetLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many resets — please wait a moment." },
});

export const interceptionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const MAX_PER_HOUR = Number(process.env.MAX_INTERVENTIONS_PER_HOUR) || 200;
const HOUR_MS = 60 * 60 * 1000;
let windowStart = Date.now();
let countThisWindow = 0;

/** Hard ceiling independent of per-IP limiting — protects the Anthropic balance even against a distributed burst. */
export function globalBudgetGuard(_req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  if (now - windowStart > HOUR_MS) {
    windowStart = now;
    countThisWindow = 0;
  }
  if (countThisWindow >= MAX_PER_HOUR) {
    res.status(429).json({ error: "Demo budget reached for this hour — please try again shortly." });
    return;
  }
  countThisWindow += 1;
  next();
}

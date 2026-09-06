import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { buildSnapshot } from "./snapshot.js";
import { addClient, removeClient } from "./sse.js";
import { buildCorsOptions } from "./cors-config.js";
import { globalBudgetGuard, interceptionLimiter, interveneLimiter, resetLimiter } from "./rate-limit.js";
import { applyIntervention, INTERVENTIONS } from "../world/interventions.js";
import { startScenario } from "../runtime/scenario.js";
import { resolveDecision } from "../runtime/interception.js";
import type { InterventionKind } from "../world/types.js";

export function createServer() {
  const app = express();
  app.disable("x-powered-by"); // no reason to advertise the framework on a public endpoint
  // Render (and most PaaS hosts) sit in front of the app as one reverse-proxy
  // hop. Without this, every request's req.ip resolves to the proxy's
  // address — collapsing the per-IP rate limiters onto one shared bucket
  // for every visitor — and express-rate-limit's own validation throws on
  // an X-Forwarded-For header it can't trust. `1` = trust exactly one hop,
  // which is also correct (a no-op, since there's no proxy) for local dev.
  app.set("trust proxy", 1);
  app.use(cors(buildCorsOptions()));
  app.use(express.json());

  // Render's health check — deliberately state-free so it never reflects
  // simulation health (a resolved/idle scenario is not a sick server).
  app.get("/healthz", (_req, res) => {
    res.status(200).send("ok");
  });

  // Full snapshot — what a reconnecting/late-joining browser (or a judge
  // reading the API directly) needs to render the current world state.
  app.get("/api/state", (_req, res) => {
    res.json(buildSnapshot());
  });

  app.get("/api/interventions", (_req, res) => {
    res.json(INTERVENTIONS);
  });

  // Live feed: every semantic event the Observer logs, plus turn
  // start/end, streamed as they happen. This is what makes concurrency
  // visible in real time rather than only reconstructable after the fact.
  app.get("/api/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`event: snapshot\ndata: ${JSON.stringify(buildSnapshot())}\n\n`);

    addClient(res);
    req.on("close", () => removeClient(res));
  });

  // The player's fixed, deterministic action space — the one human
  // decision the whole demo hinges on. Rate-limited on two independent
  // layers (see rate-limit.ts) because this is the one endpoint that fans
  // out into real, paid Anthropic API calls.
  app.post("/api/intervene", interveneLimiter, globalBudgetGuard, (req, res) => {
    const kind = req.body?.kind as InterventionKind | undefined;
    const isValid = kind != null && INTERVENTIONS.some((i) => i.kind === kind);
    if (!isValid) {
      res.status(400).json({ error: "Unknown intervention kind" });
      return;
    }
    const result = applyIntervention(kind as InterventionKind);
    res.json(result);
  });

  // The human half of Interception: approve or block one agent's paused
  // high-impact tool call. A stale/unknown id (already resolved, or expired
  // via its own auto-approve timeout) is reported, not treated as an error.
  app.post("/api/interception/:id/resolve", interceptionLimiter, (req, res) => {
    const approved = req.body?.approved === true;
    const ok = resolveDecision(req.params.id, approved, false);
    if (!ok) {
      res.status(409).json({ error: "That decision was already resolved or has expired." });
      return;
    }
    res.json({ ok: true });
  });

  app.post("/api/reset", resetLimiter, (_req, res) => {
    startScenario();
    res.json(buildSnapshot());
  });

  // Express's default error page includes the full stack trace (absolute
  // file paths included) unless NODE_ENV is exactly "production" — not
  // something to rely on implicitly for a publicly reachable server. The
  // only error this app currently throws into Express itself is a rejected
  // CORS origin, but this catches anything else the same way: no internals
  // leaked to the client, regardless of NODE_ENV.
  const handleError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error("[butterfly] request error:", err);
    if (res.headersSent) return;
    res.status(403).json({ error: "Request rejected." });
  };
  app.use(handleError);

  return app;
}

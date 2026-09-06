import express from "express";
import cors from "cors";
import { buildSnapshot } from "./snapshot.js";
import { addClient, removeClient } from "./sse.js";
import { applyIntervention, INTERVENTIONS } from "../world/interventions.js";
import { startScenario } from "../runtime/scenario.js";
import { resolveDecision } from "../runtime/interception.js";
import type { InterventionKind } from "../world/types.js";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

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
  // decision the whole demo hinges on.
  app.post("/api/intervene", (req, res) => {
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
  app.post("/api/interception/:id/resolve", (req, res) => {
    const approved = req.body?.approved === true;
    const ok = resolveDecision(req.params.id, approved, false);
    if (!ok) {
      res.status(409).json({ error: "That decision was already resolved or has expired." });
      return;
    }
    res.json({ ok: true });
  });

  app.post("/api/reset", (_req, res) => {
    startScenario();
    res.json(buildSnapshot());
  });

  return app;
}

/**
 * Headless proof that Mozaik's Interception mechanism genuinely pauses one
 * agent's pending tool call for a human decision. This script deliberately
 * joins only the Detective (plus a Player) — concurrency across all four
 * roles is already proven by prove-concurrency.ts; this one isolates and
 * verifies the pause/resume path on its own.
 *
 * Seeds `evidence` high enough that the Detective's own persona ("raid needs
 * evidence >= 55") makes calling `raid` the rational move, then exercises
 * both resolutions against the real Anthropic API: a manual veto, and the
 * auto-approve fallback nobody responds to in time.
 *
 * Run with: npm run prove-interception
 */
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), override: true });

const { createAgent, createHuman } = await import("@mozaik-ai/core");
const { initializeRuntime, installCrashGuard, resolveRuntime, join } = await import("../runtime/runtime.js");
const { HeistState } = await import("../world/state.js");
const { personaFor } = await import("../agents/personas.js");
const { detectiveTools } = await import("../agents/tools/detective.js");
const { reactionHandler } = await import("../agents/handlers.js");
const { registerRole, setPlayerId, playerParticipantId } = await import("../agents/registry.js");
const { createObserver } = await import("../observer.js");
const { emitWorldEvent } = await import("../world/events.js");
const { listPending, resolveDecision, INTERCEPTION_DECISION_MS } = await import("../runtime/interception.js");
const { resetTurns } = await import("../runtime/turn-tracker.js");
const { resetInterceptions } = await import("../runtime/interception.js");

installCrashGuard();
initializeRuntime({ state: new HeistState() });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const detective = createAgent({
  name: "Detective Reyes",
  capabilities: ["inference"],
  instruction: personaFor("detective"),
  tools: detectiveTools(),
  handlers: [reactionHandler("detective")],
});
registerRole("detective", detective);

const player = createHuman({ name: "Player", capabilities: [], handlers: [] });
setPlayerId(player.getId());
const observer = createObserver(); // closes turns on model.answer and populates state.log — without it every turn "times out" by definition

join(detective);
join(player);
join(observer);

async function waitForPending(afterMs: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = listPending().find((p) => p.startedAt >= afterMs);
    if (found) return found;
    await sleep(150);
  }
  return null;
}

async function runOnce(label: string, resolution: "veto" | "auto"): Promise<void> {
  console.log(`\n--- ${label} ---`);
  resetTurns();
  resetInterceptions();

  const state = resolveRuntime().state;
  state.reset();
  state.phase = "active";
  state.meters.evidence = 60; // seeded: "the case is airtight" — raid is now the rational call

  const t0 = Date.now();
  emitWorldEvent(playerParticipantId(), {
    summary: "A wiretap comes back clean and damning — this is the piece that closes the case.",
    relevantRoles: ["detective"],
    tags: ["test:seed"],
  });

  const pending = await waitForPending(t0, 20_000);
  if (!pending) {
    console.log("No interception fired within 20s — the model chose a different tool this time. Re-run to try again.");
    return;
  }
  console.log(`Intercepted: Detective's pending call is "${pending.toolName}", args:`, pending.args);

  if (resolution === "veto") {
    console.log("-> Resolving as VETO.");
    resolveDecision(pending.id, false, false);
  } else {
    console.log(`-> Not resolving manually — waiting out the ${INTERCEPTION_DECISION_MS}ms auto-approve window...`);
  }

  // Give the redirected/approved tool call and the follow-up narrated answer time to complete.
  await sleep(18_000);
  const turn = state.turns.find((t) => t.role === "detective" && t.startedAt >= t0);
  console.log("Final turn status:", turn?.status, "| result:", turn?.resultSummary);
  console.log(
    "World log this run:",
    state.log.filter((e) => e.at >= t0).map((e) => e.headline),
  );
}

async function main() {
  await runOnce("Run 1: human vetoes the raid", "veto");
  await runOnce("Run 2: nobody responds — auto-approves", "auto");
  process.exit(0);
}

void main();

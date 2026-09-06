/**
 * Headless proof that four agents genuinely run at the same time — no UI,
 * no HTTP server, just the Mozaik runtime, one broadcast event, and real
 * wall-clock timestamps. This is meant to be read, not just run: if you
 * only trust one file in this repo to tell you whether "concurrent agents"
 * is real here, make it this one.
 *
 * Run with: npm run prove-concurrency
 */
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// override: true so .env wins over any unrelated ANTHROPIC_API_KEY the
// parent shell happens to have exported (see index.ts for why).
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), override: true });

const { initializeRuntime, installCrashGuard, resolveRuntime } = await import("../runtime/runtime.js");
const { HeistState } = await import("../world/state.js");
const { startScenario } = await import("../runtime/scenario.js");
const { applyIntervention } = await import("../world/interventions.js");

installCrashGuard();
initializeRuntime({ state: new HeistState() });
startScenario();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("[prove-concurrency] model:", process.env.MOZAIK_MODEL?.trim() || "claude-haiku-4-5");
  console.log("[prove-concurrency] firing ONE broadcast event tagged relevantRoles: [mastermind, detective, insider, driver]...\n");

  const t0 = Date.now();
  applyIntervention("police_early");

  const state = resolveRuntime().state;
  const deadline = t0 + 30_000;
  while (Date.now() < deadline) {
    const turns = state.turns.filter((t) => t.startedAt >= t0);
    if (turns.length >= 4 && turns.every((t) => t.endedAt !== null)) break;
    await sleep(200);
  }

  const turns = state.turns.filter((t) => t.startedAt >= t0);
  console.log("role        start(ms)  end(ms)  duration(ms)  status");
  for (const t of turns) {
    const start = t.startedAt - t0;
    const end = t.endedAt ? t.endedAt - t0 : -1;
    const duration = t.endedAt ? t.endedAt - t.startedAt : -1;
    console.log(
      `${t.role.padEnd(11)} ${String(start).padEnd(10)} ${(end < 0 ? "—" : String(end)).padEnd(8)} ${(duration < 0 ? "—" : String(duration)).padEnd(13)} ${t.status}`,
    );
  }

  let overlapFound = false;
  for (let i = 0; i < turns.length; i++) {
    for (let j = i + 1; j < turns.length; j++) {
      const a = turns[i];
      const b = turns[j];
      if (!a.endedAt || !b.endedAt) continue;
      if (a.startedAt < b.endedAt && b.startedAt < a.endedAt) {
        console.log(`\n✅ CONCURRENT: "${a.role}" and "${b.role}" were both mid-turn at the same wall-clock moment.`);
        overlapFound = true;
      }
    }
  }

  if (!overlapFound) {
    console.log(
      "\n⚠️  No overlapping windows found. Check ANTHROPIC_API_KEY and network access, then rerun — with 4 agents reacting to one event this should overlap on any real network.",
    );
  }

  process.exit(overlapFound ? 0 : 1);
}

void main();

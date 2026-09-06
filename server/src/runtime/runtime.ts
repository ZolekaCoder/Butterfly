import { defineRuntime } from "@mozaik-ai/core";
import { HeistState } from "../world/state.js";

/**
 * The Mozaik runtime is created exactly once per process and shared by every
 * module in the server. `defineRuntime` returns bound functions (not classes)
 * so we re-export them from one place rather than re-deriving them.
 */
export const { initializeRuntime, resolveRuntime, resolveParticipant, join, leave, sendMessage, sendEvent, runLoop } =
  defineRuntime<HeistState>();

let started = false;

/**
 * `runLoop` fires agent turns without returning a promise we can await or
 * `.catch()` (that's the point — it's fire-and-forget concurrency). That
 * means a transient provider error (rate limit, network blip) inside an
 * agent's inference call surfaces as an unhandled rejection, which Node
 * would otherwise use to crash the process. For a live demo, one flaky
 * model call must not take down the whole simulation, so we neutralize the
 * crash here; the per-turn watchdog (see turn-tracker.ts) is what makes the
 * UI recover gracefully for the specific agent that failed.
 */
export function installCrashGuard(): void {
  if (started) return;
  started = true;
  process.on("unhandledRejection", (reason) => {
    console.error("[butterfly] swallowed unhandled rejection (agent turn likely failed):", reason);
  });
}

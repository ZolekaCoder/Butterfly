import { randomUUID } from "node:crypto";
import { broadcast } from "../http/sse.js";
import { TURN_WATCHDOG_MS } from "./model.js";
import { resolveRuntime } from "./runtime.js";
import type { RoleId, TurnRecord } from "../world/types.js";

/**
 * Tracks, per role, the single in-flight `runLoop` turn (if any). This is
 * what makes concurrency *provable* rather than just asserted: every turn
 * has a real wall-clock startedAt/endedAt, so the frontend can render
 * overlapping bars across roles, and the JSONL log carries the same
 * timestamps for anyone auditing the run after the fact.
 *
 * It also doubles as the reliability backstop the brief calls for: `runLoop`
 * gives us no promise to await, so if a model call hangs or silently fails,
 * nothing would otherwise tell the UI to stop showing "Thinking...". The
 * watchdog guarantees every turn resolves one way or another.
 */

const openTurns = new Map<RoleId, TurnRecord>();
const watchdogs = new Map<RoleId, NodeJS.Timeout>();

export function isBusy(role: RoleId): boolean {
  return openTurns.has(role);
}

export function beginTurn(role: RoleId, causeEventId: string | null, causeSummary: string | null): string {
  const turn: TurnRecord = {
    turnId: randomUUID(),
    role,
    startedAt: Date.now(),
    endedAt: null,
    status: "thinking",
    causeEventId,
    causeSummary,
    resultSummary: null,
  };
  openTurns.set(role, turn);
  resolveRuntime().state.turns.push(turn);

  const watchdog = setTimeout(() => {
    endTurn(role, "timeout", "No response before the watchdog window elapsed.");
  }, TURN_WATCHDOG_MS);
  watchdogs.set(role, watchdog);

  broadcast("turn.started", turn);
  return turn.turnId;
}

export function endTurn(role: RoleId, status: "done" | "error" | "timeout", resultSummary: string | null): void {
  const turn = openTurns.get(role);
  if (!turn) return;

  const watchdog = watchdogs.get(role);
  if (watchdog) clearTimeout(watchdog);
  watchdogs.delete(role);
  openTurns.delete(role);

  turn.endedAt = Date.now();
  turn.status = status;
  turn.resultSummary = resultSummary;

  broadcast("turn.ended", turn);
}

export function getOpenTurn(role: RoleId): TurnRecord | undefined {
  return openTurns.get(role);
}

/**
 * Resets a role's watchdog to fire `extraMs` from now instead of from the
 * original turn start. Used only when an interception pauses that role's
 * turn for a human decision — without this, the ordinary turn watchdog
 * (sized for a normal 2-inference-call turn) could fire *while* we're
 * legitimately waiting on a human, not because anything actually failed.
 */
export function extendTurnWatchdog(role: RoleId, extraMs: number): void {
  const turn = openTurns.get(role);
  if (!turn) return;
  const existing = watchdogs.get(role);
  if (existing) clearTimeout(existing);
  const watchdog = setTimeout(() => {
    endTurn(role, "timeout", "No response before the watchdog window elapsed.");
  }, extraMs);
  watchdogs.set(role, watchdog);
}

/** Clears every in-flight turn and its watchdog. Call when the scenario resets. */
export function resetTurns(): void {
  for (const watchdog of watchdogs.values()) clearTimeout(watchdog);
  watchdogs.clear();
  openTurns.clear();
}

import { randomUUID } from "node:crypto";
import { broadcast } from "../http/sse.js";
import { ROLE_META } from "../agents/roles.js";
import { playerParticipantId } from "../agents/registry.js";
import { emitWorldEvent } from "../world/events.js";
import type { RoleId } from "../world/types.js";

/**
 * The human-in-the-loop half of Mozaik's Interception mechanism: a small,
 * in-memory store of "this agent's tool call is paused, waiting on a
 * decision" records. The actual pause/resume happens inside the
 * InterceptionHandler built in agents/interception.ts — this module only
 * tracks the pending state and lets an HTTP request (or a timeout) resolve
 * it. Deliberately not a Mozaik SemanticEvent itself: it's a pause in *our*
 * application layer, sitting on top of runLoop's own interception hook.
 */

export const INTERCEPTION_DECISION_MS = 10_000;

export type PendingInterception = {
  id: string;
  role: RoleId;
  toolName: string;
  args: Record<string, unknown>;
  startedAt: number;
};

type Entry = {
  record: PendingInterception;
  resolve: (approved: boolean) => void;
  timeout: NodeJS.Timeout;
};

const pending = new Map<string, Entry>();

function prettyTool(name: string): string {
  return name.replace(/_/g, " ");
}

/** Called from an InterceptionHandler.handle() — resolves once a human decides, or the window lapses. */
export function requestDecision(role: RoleId, toolName: string, args: Record<string, unknown>): Promise<boolean> {
  const id = randomUUID();
  const record: PendingInterception = { id, role, toolName, args, startedAt: Date.now() };

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolveDecision(id, true, true), INTERCEPTION_DECISION_MS);
    pending.set(id, { record, resolve, timeout });
    broadcast("interception.pending", record);
  });
}

/** Resolves a pending decision. Returns false if `id` is unknown (already resolved/expired). */
export function resolveDecision(id: string, approved: boolean, auto = false): boolean {
  const entry = pending.get(id);
  if (!entry) return false;

  clearTimeout(entry.timeout);
  pending.delete(id);

  const { role, toolName } = entry.record;
  const name = ROLE_META[role].name;
  const tool = prettyTool(toolName);
  const summary = approved
    ? auto
      ? `Nobody intervened — ${name}'s ${tool} proceeds.`
      : `A human lets ${name}'s ${tool} go through.`
    : `A human pulls ${name} back from ${tool} at the last second.`;

  emitWorldEvent(playerParticipantId(), {
    summary,
    relevantRoles: [],
    tags: ["interception", approved ? "approved" : "vetoed", auto ? "auto" : "manual"],
  });

  broadcast("interception.resolved", { id, approved, auto });
  entry.resolve(approved);
  return true;
}

export function listPending(): PendingInterception[] {
  return [...pending.values()].map((e) => e.record);
}

/**
 * Called on scenario reset. Deliberately does NOT call `entry.resolve(...)`:
 * resolving would resume the abandoned agent's paused `handle()`, which
 * would go on to call a tool's `invoke()` and look up `idOf(role)` against a
 * registry that `buildCast()` has by then repointed at the *new* agent for
 * that role — misattributing an event to the wrong participant. Leaving the
 * promise unresolved just lets that one abandoned loop sit idle forever,
 * which is harmless: it never touches state or the registry again.
 */
export function resetInterceptions(): void {
  for (const [, entry] of pending) clearTimeout(entry.timeout);
  pending.clear();
}

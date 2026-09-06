import { randomUUID } from "node:crypto";
import { createHuman, SituationSpecification, type SituationContext, type SituationHandler } from "@mozaik-ai/core";
import { WORLD_EVENT_TYPE } from "./world/events.js";
import { roleOf, isPlayer } from "./agents/registry.js";
import { ROLE_META } from "./agents/roles.js";
import { endTurn } from "./runtime/turn-tracker.js";
import { resolveRuntime } from "./runtime/runtime.js";
import { broadcast } from "./http/sse.js";
import type { LogEntry, WorldEventPayload } from "./world/types.js";

/**
 * The Observer never calls `runLoop` or `sendEvent` — it only reacts. It is
 * the "logger/broadcaster" participant the brief asks for: every semantic
 * event that crosses the runtime is timestamped, attributed to its
 * producer, and pushed to the shared log (and out over SSE) here, which is
 * also how an agent's turn gets closed out (on `model.answer`) so the UI
 * stops showing "Thinking...".
 */
class AlwaysTrue extends SituationSpecification {
  isSatisfiedBy(): boolean {
    return true;
  }
}

type ModelAnswerPayload = { answer: { content: { text: string } } };

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function pushLog(entry: LogEntry): void {
  resolveRuntime().state.log.push(entry);
  broadcast("log.entry", entry);
}

/**
 * Every tool `invoke()` mutates `state.meters`/`state.phase` *before* calling
 * `emitWorldEvent`, so by the time this fires the mutation has already
 * happened — this is just telling already-connected browsers about it. Without
 * this, the frontend only ever sees meters as of its initial `snapshot` and
 * silently goes stale the moment any agent (or intervention) changes state.
 */
function broadcastWorldUpdate(): void {
  const state = resolveRuntime().state;
  broadcast("world.update", { phase: state.phase, meters: state.meters, outcome: state.outcome });
}

function producerLabel(producerId: string): LogEntry["producer"] {
  const role = roleOf(producerId);
  if (role) return role;
  if (isPlayer(producerId)) return "player";
  return "world";
}

const loggerHandler: SituationHandler = {
  specification: new AlwaysTrue(),
  processor: {
    apply({ event }: SituationContext) {
      if (event.type === WORLD_EVENT_TYPE) {
        const payload = event.payload as WorldEventPayload;
        pushLog({
          id: payload.id,
          at: event.occurredAt.getTime(),
          kind: "world",
          producer: producerLabel(event.producerId),
          headline: payload.summary,
          detail: payload.detail,
          causeEventId: payload.causedByEventId,
          tags: payload.tags,
        });
        broadcastWorldUpdate();
        return;
      }

      if (event.type === "model.answer") {
        const role = roleOf(event.producerId);
        if (!role) return;
        const text = (event.payload as ModelAnswerPayload)?.answer?.content?.text ?? "";
        endTurn(role, "done", text || null);
        pushLog({
          id: randomUUID(),
          at: event.occurredAt.getTime(),
          kind: "turn",
          producer: role,
          headline: text
            ? `${ROLE_META[role].name} concludes: "${truncate(text, 140)}"`
            : `${ROLE_META[role].name} finishes the turn without a final word.`,
        });
      }
    },
  },
};

export function createObserver() {
  return createHuman({ name: "Observer", capabilities: [], handlers: [loggerHandler] });
}

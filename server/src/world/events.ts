import { randomUUID } from "node:crypto";
import { SemanticEvent } from "@mozaik-ai/core";
import { sendEvent } from "../runtime/runtime.js";
import { getOpenTurn } from "../runtime/turn-tracker.js";
import { roleOf } from "../agents/registry.js";
import type { RoleId, WorldEventPayload } from "./types.js";

export const WORLD_EVENT_TYPE = "world.event";

/**
 * The one custom semantic event type every participant in Butterfly speaks.
 * `relevantRoles` is what replaces a scheduler: whoever emits an event
 * decides who it concerns (sometimes one role, sometimes all four), and each
 * agent's own situation specification decides independently whether that
 * makes it worth a turn. Nothing here decides *who acts next* — that's
 * still each agent's call once the event lands.
 *
 * If the producer is an agent mid-turn, its open turn's cause is threaded
 * through automatically as `causedByEventId` (unless the caller overrides
 * it) so the frontend can draw the causal arrow without every tool having
 * to know about turn bookkeeping.
 */
export function emitWorldEvent(
  producerId: string,
  payload: {
    summary: string;
    detail?: string;
    relevantRoles: RoleId[];
    causedByEventId?: string;
    tags?: string[];
  },
): WorldEventPayload {
  const producerRole = roleOf(producerId);
  const inheritedCause = producerRole ? getOpenTurn(producerRole)?.causeEventId ?? undefined : undefined;
  const full: WorldEventPayload = {
    id: randomUUID(),
    ...payload,
    causedByEventId: payload.causedByEventId ?? inheritedCause,
  };
  sendEvent(SemanticEvent.create(WORLD_EVENT_TYPE, producerId, full), producerId);
  return full;
}

import { SituationSpecification, type SituationContext } from "@mozaik-ai/core";
import { WORLD_EVENT_TYPE } from "../world/events.js";
import { resolveRuntime } from "../runtime/runtime.js";
import { isBusy } from "../runtime/turn-tracker.js";
import type { RoleId, WorldEventPayload } from "../world/types.js";

/**
 * "Do I care about this?" — the only decision a scheduler would otherwise
 * make for an agent. Here it's just a predicate over the event and the
 * agent's own role, checked independently by every joined participant the
 * moment an event is published. Multiple roles can (and regularly do)
 * satisfy this for the very same event, which is what makes their
 * `runLoop` calls fire concurrently rather than in a fixed order.
 */
export class RelevantWorldEvent extends SituationSpecification {
  constructor(private readonly role: RoleId) {
    super();
  }

  isSatisfiedBy({ event, participant }: SituationContext): boolean {
    if (event.type !== WORLD_EVENT_TYPE) return false;
    if (event.producerId === participant.getId()) return false; // don't react to your own action

    const payload = event.payload as WorldEventPayload;
    if (!payload.relevantRoles.includes(this.role)) return false;

    // One in-flight turn per agent: a second qualifying event while this
    // role is already thinking is dropped rather than queued, so a burst of
    // reactions can't pile up unbounded turns on the same participant.
    if (isBusy(this.role)) return false;

    if (resolveRuntime().state.isResolved()) return false;

    return true;
  }
}

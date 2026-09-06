import { ROLE_IDS } from "../world/types.js";
import { buildCast, type Cast } from "../agents/setup.js";
import { resetTurns } from "./turn-tracker.js";
import { resetInterceptions } from "./interception.js";
import { join, leave, resolveRuntime } from "./runtime.js";

let cast: Cast | null = null;

export function currentCast(): Cast {
  if (!cast) throw new Error("Scenario not started yet — call startScenario() first");
  return cast;
}

/**
 * (Re)builds the entire cast and world state from scratch. Reused for both
 * the initial boot and every "Reset" click: a live demo needs to be run more
 * than once, and reliably resetting to identical starting conditions is
 * what makes repeated takes (and the butterfly-effect A/B comparison)
 * trustworthy.
 */
export function startScenario(): void {
  if (cast) {
    leave(cast.player);
    leave(cast.observer);
    for (const role of ROLE_IDS) leave(cast.agents[role]);
  }
  resetTurns();
  resetInterceptions();

  const state = resolveRuntime().state;
  state.reset();

  cast = buildCast();
  join(cast.observer);
  join(cast.player);
  for (const role of ROLE_IDS) join(cast.agents[role]);

  state.phase = "active";
}

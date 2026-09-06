import { resolveRuntime } from "../runtime/runtime.js";
import { ROLE_META } from "../agents/roles.js";
import { MODEL } from "../runtime/model.js";
import { listPending } from "../runtime/interception.js";

export function buildSnapshot() {
  const state = resolveRuntime().state;
  return {
    phase: state.phase,
    meters: state.meters,
    turns: state.turns,
    log: state.log,
    outcome: state.outcome,
    startedAt: state.startedAt,
    roles: ROLE_META,
    model: MODEL,
    pendingInterceptions: listPending(),
  };
}

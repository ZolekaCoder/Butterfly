import type { SituationHandler } from "@mozaik-ai/core";
import { RelevantWorldEvent } from "./specifications.js";
import { agentOf, idOf } from "./registry.js";
import { highImpactInterception } from "./interception.js";
import { runLoop, resolveRuntime } from "../runtime/runtime.js";
import { MODEL, MAX_OUTPUT_TOKENS } from "../runtime/model.js";
import { beginTurn } from "../runtime/turn-tracker.js";
import { visibleSituation } from "../world/perception.js";
import type { RoleId, WorldEventPayload } from "../world/types.js";

/**
 * The single reaction every agent has: when a world event tags my role, and
 * I'm not already mid-turn, think about it. Building the turn's message is
 * the only place "what does this role get to know" and "what happened" mix
 * — the tool `invoke()` functions never see the model's framing, only its
 * structured choice.
 */
export function reactionHandler(role: RoleId): SituationHandler {
  return {
    specification: new RelevantWorldEvent(role),
    processor: {
      apply({ event }) {
        const payload = event.payload as WorldEventPayload;
        const state = resolveRuntime().state;

        const message = [
          `New development: ${payload.summary}`,
          payload.detail ? `Detail you're aware of: "${payload.detail}"` : null,
          "",
          "Current situation, as far as you know it:",
          visibleSituation(role, state),
          "",
          "Decide your move now. Call exactly one tool.",
        ]
          .filter((line): line is string => line !== null)
          .join("\n");

        beginTurn(role, payload.id, payload.summary);

        const agent = agentOf(role);
        runLoop(
          idOf(role),
          message,
          {
            model: MODEL,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            context: agent.getMemory().getContext(),
            tools: agent.getTools(),
          },
          highImpactInterception(role),
        );
      },
    },
  };
}

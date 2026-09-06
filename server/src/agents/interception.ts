import { FunctionCallItem, type ExecutableTransition, type InterceptionHandler } from "@mozaik-ai/core";
import { extendTurnWatchdog } from "../runtime/turn-tracker.js";
import { requestDecision } from "../runtime/interception.js";
import type { RoleId } from "../world/types.js";

/**
 * Only two tool calls in the whole scenario are "high-impact" enough to
 * pause for a human: the two symmetric, resolution-triggering moves — the
 * Detective's raid and the Mastermind's commit-to-the-vault. Everything else
 * (bribes, warnings, holds, covert tips) runs exactly as before, untouched.
 * This is deliberately narrow: Interception earns its place here by making
 * one real, high-stakes moment interruptible, not by wrapping every tool.
 */
const HIGH_IMPACT: Partial<Record<RoleId, string>> = {
  detective: "raid",
  mastermind: "hit_the_vault",
};

/** Extra time given to the turn's watchdog once a decision is pending, on top of whatever remained. */
const INTERCEPTION_WATCHDOG_EXTRA_MS = 14_000;

export function highImpactInterception(role: RoleId): InterceptionHandler {
  const toolName = HIGH_IMPACT[role];
  // Scoped to one turn: `highImpactInterception(role)` is built fresh in
  // handlers.ts on every dispatch, so this resets naturally per turn. Without
  // it, a vetoed agent can simply reconsider and call the same tool again a
  // moment later — observed in testing — pausing a *second* time for a
  // decision nobody is watching for anymore, which then silently
  // auto-approves. One human decision should hold for the rest of the turn.
  let decided: boolean | null = null;

  return {
    isSatisfiedBy(transition: ExecutableTransition): boolean {
      if (!toolName) return false;
      return transition.nextStateId === "function_call" && transition.input.call.name === toolName;
    },

    async handle(transition: ExecutableTransition): Promise<ExecutableTransition> {
      if (transition.nextStateId !== "function_call") return transition;
      const { call, inferenceInput } = transition.input;

      let approved: boolean;
      if (decided !== null) {
        approved = decided;
      } else {
        extendTurnWatchdog(role, INTERCEPTION_WATCHDOG_EXTRA_MS);
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.args);
        } catch {
          // Leave args empty — the decision is still meaningful without them.
        }
        approved = await requestDecision(role, call.name, args);
        decided = approved;
      }

      if (approved) return transition;

      // Vetoed: redirect this exact call (same callId, so the function-call/
      // output round trip still lines up) into the harmless fallback every
      // role already has, rather than inventing a new "blocked" tool.
      const overridden = FunctionCallItem.rehydrate({
        callId: call.callId,
        name: "hold_and_observe",
        args: JSON.stringify({ reason: "An outside signal pulled this back at the last second." }),
      });

      return { nextStateId: "function_call", input: { call: overridden, inferenceInput } };
    },
  };
}

import type { Tool } from "@mozaik-ai/core";
import { resolveRuntime } from "../../runtime/runtime.js";
import { emitWorldEvent } from "../../world/events.js";
import type { RoleId } from "../../world/types.js";
import { idOf } from "../registry.js";

/** Returns a rejection string if the scenario is already over, else null. */
export function blockedByResolution(): string | null {
  const state = resolveRuntime().state;
  if (state.isResolved()) {
    return `No-op: the scenario already ended (${state.outcome ?? state.phase}). Nothing changes now.`;
  }
  return null;
}

/** Every role gets this as an always-legal fallback so a "no strong move" turn still resolves cleanly. */
export function holdTool(role: RoleId): Tool {
  return {
    type: "function",
    name: "hold_and_observe",
    description: "Take no concrete action this turn beyond watching. Always legal, no cost.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "One sentence: what you're watching for, in character." },
      },
      required: ["reason"],
      additionalProperties: false,
    },
    strict: true,
    invoke: async (args: { reason: string }) => {
      const blocked = blockedByResolution();
      if (blocked) return blocked;
      emitWorldEvent(idOf(role), {
        summary: `${roleLabel(role)} holds and watches.`,
        detail: args.reason,
        relevantRoles: [],
        tags: ["tool:hold"],
      });
      return "You hold your position. Nothing about the shared situation changes.";
    },
  };
}

const LABELS: Record<RoleId, string> = {
  mastermind: "The Mastermind",
  detective: "The Detective",
  insider: "The Insider",
  driver: "The Driver",
};

export function roleLabel(role: RoleId): string {
  return LABELS[role];
}

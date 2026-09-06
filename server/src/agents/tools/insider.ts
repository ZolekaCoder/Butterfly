import type { Tool } from "@mozaik-ai/core";
import { resolveRuntime } from "../../runtime/runtime.js";
import { clamp } from "../../world/meters.js";
import { emitWorldEvent } from "../../world/events.js";
import { TUNING } from "../../world/tuning.js";
import type { RoleId } from "../../world/types.js";
import { idOf } from "../registry.js";
import { blockedByResolution, holdTool } from "./common.js";

const ME: RoleId = "insider";

export function insiderTools(): Tool[] {
  return [
    {
      type: "function",
      name: "tip_detective",
      description: "Quietly pass the detective something useful. Covert — the crew does not see this happen.",
      parameters: {
        type: "object",
        properties: {
          fact: { type: "string", description: "What you tip them off about." },
          reason: { type: "string" },
        },
        required: ["fact", "reason"],
        additionalProperties: false,
      },
      strict: true,
      invoke: async (args: { fact: string; reason: string }) => {
        const blocked = blockedByResolution();
        if (blocked) return blocked;
        const state = resolveRuntime().state;
        state.meters.evidence = clamp(state.meters.evidence + TUNING.insider.tipEvidence);
        state.adjustTrust("insider", -TUNING.insider.tipSelfTrustCost);
        emitWorldEvent(idOf(ME), {
          summary: `The Insider covertly tips off the Detective: ${args.fact}.`,
          detail: args.reason,
          relevantRoles: [], // covert from the crew's point of view
          tags: ["tool:tip_detective"],
        });
        return `Passed along. The detective's case grows. It weighs on you a little — your own resolve reads ${state.trustOf("insider")}.`;
      },
    },
    {
      type: "function",
      name: "warn_crew",
      description: "Warn the crew about a real risk you've noticed. Protects the plan and your standing with them.",
      parameters: {
        type: "object",
        properties: {
          fact: { type: "string" },
          reason: { type: "string" },
        },
        required: ["fact", "reason"],
        additionalProperties: false,
      },
      strict: true,
      invoke: async (args: { fact: string; reason: string }) => {
        const blocked = blockedByResolution();
        if (blocked) return blocked;
        const state = resolveRuntime().state;
        state.meters.heistProgress = clamp(state.meters.heistProgress + TUNING.insider.warnProgress);
        state.adjustTrust("insider", TUNING.insider.warnTrustGain);
        emitWorldEvent(idOf(ME), {
          summary: `The Insider warns the crew: ${args.fact}.`,
          detail: args.reason,
          relevantRoles: ["mastermind", "driver"],
          tags: ["tool:warn_crew"],
        });
        return `The crew adjusts. Your standing with them is now ${state.trustOf("insider")}.`;
      },
    },
    {
      type: "function",
      name: "flip_and_flee",
      description: "Drop the act entirely, side openly with the law, and abandon the crew. Big, irreversible move.",
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
        additionalProperties: false,
      },
      strict: true,
      invoke: async (args: { reason: string }) => {
        const blocked = blockedByResolution();
        if (blocked) return blocked;
        const state = resolveRuntime().state;
        state.meters.evidence = clamp(state.meters.evidence + TUNING.insider.flipEvidence);
        state.adjustTrust("insider", -TUNING.insider.flipTrustLoss);
        emitWorldEvent(idOf(ME), {
          summary: "The Insider drops the act — openly siding with the law.",
          detail: args.reason,
          relevantRoles: ["mastermind", "driver", "detective"],
          tags: ["tool:flip_and_flee"],
        });
        return `There's no walking this back. Evidence is now ${state.meters.evidence}/100.`;
      },
    },
    holdTool(ME),
  ];
}

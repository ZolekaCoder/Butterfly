import type { Tool } from "@mozaik-ai/core";
import { resolveRuntime } from "../../runtime/runtime.js";
import { clamp } from "../../world/meters.js";
import { emitWorldEvent } from "../../world/events.js";
import { TUNING } from "../../world/tuning.js";
import type { RoleId } from "../../world/types.js";
import { idOf } from "../registry.js";
import { blockedByResolution, holdTool } from "./common.js";

const ME: RoleId = "driver";

export function driverTools(): Tool[] {
  return [
    {
      type: "function",
      name: "flee",
      description: "Abandon the job right now and get clear. Protects you; wrecks the crew's plan.",
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
        state.meters.heistProgress = clamp(state.meters.heistProgress - TUNING.driver.fleeProgressLoss);
        state.meters.chaos = clamp(state.meters.chaos + TUNING.driver.fleeChaos);
        state.adjustTrust("driver", -TUNING.driver.fleeTrustLoss);
        emitWorldEvent(idOf(ME), {
          summary: "The Driver bails — the getaway car is gone.",
          detail: args.reason,
          relevantRoles: ["mastermind", "insider", "detective"],
          tags: ["tool:flee"],
        });
        return `You're clear, for now. The plan behind you is in pieces (progress ${state.meters.heistProgress}).`;
      },
    },
    {
      type: "function",
      name: "flip_to_detective",
      description: "Cut a deal with the law openly. Irreversible, but may be the safest bet left.",
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
        state.meters.evidence = clamp(state.meters.evidence + TUNING.driver.flipEvidence);
        state.adjustTrust("driver", -TUNING.driver.flipTrustLoss);
        emitWorldEvent(idOf(ME), {
          summary: "The Driver flips — talking to the Detective openly.",
          detail: args.reason,
          relevantRoles: ["mastermind", "insider", "detective"],
          tags: ["tool:flip_to_detective"],
        });
        return `Done. Evidence against the crew is now ${state.meters.evidence}/100.`;
      },
    },
    {
      type: "function",
      name: "demand_more_money",
      description: "Push the Mastermind for a bigger cut before you commit further. Raises tension, no direct risk to you.",
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
        state.meters.chaos = clamp(state.meters.chaos + TUNING.driver.demandChaos);
        emitWorldEvent(idOf(ME), {
          summary: "The Driver demands more money before going further.",
          detail: args.reason,
          relevantRoles: ["mastermind"],
          tags: ["tool:demand_more_money"],
        });
        return "The demand has been made. The Mastermind will have to answer it somehow.";
      },
    },
    holdTool(ME),
  ];
}

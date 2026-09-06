import type { Tool } from "@mozaik-ai/core";
import { resolveRuntime } from "../../runtime/runtime.js";
import { clamp } from "../../world/meters.js";
import { emitWorldEvent } from "../../world/events.js";
import { TUNING } from "../../world/tuning.js";
import type { RoleId } from "../../world/types.js";
import { idOf } from "../registry.js";
import { blockedByResolution, holdTool } from "./common.js";

const ME: RoleId = "detective";

export function detectiveTools(): Tool[] {
  return [
    {
      type: "function",
      name: "investigate",
      description: "Quietly build the case — surveillance, records, legwork. Not observable by the crew.",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", description: "What you're digging into." },
          reason: { type: "string" },
        },
        required: ["focus", "reason"],
        additionalProperties: false,
      },
      strict: true,
      invoke: async (args: { focus: string; reason: string }) => {
        const blocked = blockedByResolution();
        if (blocked) return blocked;
        const state = resolveRuntime().state;
        state.meters.evidence = clamp(state.meters.evidence + TUNING.detective.investigateEvidence);
        state.meters.chaos = clamp(state.meters.chaos + TUNING.detective.investigateChaos);
        emitWorldEvent(idOf(ME), {
          summary: `The Detective quietly investigates: ${args.focus}.`,
          detail: args.reason,
          relevantRoles: [], // covert — the crew has no way to observe this directly
          tags: ["tool:investigate"],
        });
        return `Your case strength (evidence) is now ${state.meters.evidence}/100. Still not enough for a raid.`;
      },
    },
    {
      type: "function",
      name: "request_backup",
      description: "Call in more patrol presence near the target. Effective but visibly raises heat and attention.",
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
        state.meters.heat = clamp(state.meters.heat + TUNING.detective.backupHeat);
        state.meters.publicAttention = clamp(state.meters.publicAttention + TUNING.detective.backupAttention);
        emitWorldEvent(idOf(ME), {
          summary: "The Detective requests backup — more patrols move into the area.",
          detail: args.reason,
          relevantRoles: ["mastermind", "driver"],
          tags: ["tool:request_backup"],
        });
        return `Heat is now ${state.meters.heat}. The crew will likely notice the extra patrols.`;
      },
    },
    {
      type: "function",
      name: "offer_deal",
      description: "Offer a crew member reduced consequences in exchange for information or cooperation.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["insider", "driver"] },
          reason: { type: "string" },
        },
        required: ["target", "reason"],
        additionalProperties: false,
      },
      strict: true,
      invoke: async (args: { target: "insider" | "driver"; reason: string }) => {
        const blocked = blockedByResolution();
        if (blocked) return blocked;
        const state = resolveRuntime().state;
        state.meters.chaos = clamp(state.meters.chaos + TUNING.detective.dealChaos);
        emitWorldEvent(idOf(ME), {
          summary: `The Detective quietly offers ${args.target} a deal.`,
          detail: args.reason,
          relevantRoles: [args.target],
          tags: ["tool:offer_deal"],
        });
        return `The offer has been made to ${args.target}. Whether they take it is out of your hands now.`;
      },
    },
    {
      type: "function",
      name: "raid",
      description: `Move in and arrest the crew. Requires strong evidence (>= ${TUNING.raid.evidenceThreshold}/100) or it fails and burns your shot.`,
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
        if (state.meters.evidence < TUNING.raid.evidenceThreshold) {
          state.meters.chaos = clamp(state.meters.chaos + 20);
          emitWorldEvent(idOf(ME), {
            summary: "The Detective moves in early — and comes up empty-handed.",
            detail: args.reason,
            relevantRoles: ["mastermind", "insider", "driver"],
            tags: ["tool:raid", "raid:failed"],
          });
          return `Evidence was only ${state.meters.evidence}/100 — the raid fails and tips the crew off. This cannot be undone.`;
        }
        state.phase = "arrested";
        state.outcome = "The Detective's raid lands. The crew is arrested before the vault opens.";
        emitWorldEvent(idOf(ME), {
          summary: "The Detective raids the crew — arrests made.",
          detail: args.reason,
          relevantRoles: ["mastermind", "insider", "driver"],
          tags: ["tool:raid", "resolution"],
        });
        return "The raid succeeds.";
      },
    },
    holdTool(ME),
  ];
}

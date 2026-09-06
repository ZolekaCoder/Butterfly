import type { Tool } from "@mozaik-ai/core";
import { resolveRuntime } from "../../runtime/runtime.js";
import { clamp, clampMoney } from "../../world/meters.js";
import { emitWorldEvent } from "../../world/events.js";
import { TUNING } from "../../world/tuning.js";
import type { RoleId } from "../../world/types.js";
import { idOf } from "../registry.js";
import { blockedByResolution, holdTool } from "./common.js";

const ME: RoleId = "mastermind";

export function mastermindTools(): Tool[] {
  return [
    {
      type: "function",
      name: "accelerate_heist",
      description:
        "Push the job forward. 'aggressive' moves faster but is louder and riskier; 'cautious' is slower but quieter.",
      parameters: {
        type: "object",
        properties: {
          approach: { type: "string", enum: ["cautious", "aggressive"] },
          reason: { type: "string", description: "One sentence, in character." },
        },
        required: ["approach", "reason"],
        additionalProperties: false,
      },
      strict: true,
      invoke: async (args: { approach: "cautious" | "aggressive"; reason: string }) => {
        const blocked = blockedByResolution();
        if (blocked) return blocked;
        const state = resolveRuntime().state;
        const t = TUNING.mastermind.accelerate;
        const aggressive = args.approach === "aggressive";
        state.meters.heistProgress = clamp(state.meters.heistProgress + (aggressive ? t.aggressiveProgress : t.safeProgress));
        state.meters.heat = clamp(state.meters.heat + (aggressive ? t.aggressiveHeat : t.safeHeat));
        state.meters.chaos = clamp(state.meters.chaos + t.chaos);
        emitWorldEvent(idOf(ME), {
          summary: aggressive
            ? "The Mastermind pushes the timetable up — moving fast and loud."
            : "The Mastermind advances the plan carefully, staying quiet.",
          detail: args.reason,
          relevantRoles: ["detective", "driver"],
          tags: ["tool:accelerate_heist", `approach:${args.approach}`],
        });
        return `Heist progress is now ${state.meters.heistProgress}, heat ${state.meters.heat}.`;
      },
    },
    {
      type: "function",
      name: "bribe",
      description: "Pay a crew member from the shared cash reserve to shore up their loyalty.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["insider", "driver"] },
          amount: { type: "number", description: "Thousands of dollars from the shared reserve." },
          reason: { type: "string" },
        },
        required: ["target", "amount", "reason"],
        additionalProperties: false,
      },
      strict: true,
      invoke: async (args: { target: "insider" | "driver"; amount: number; reason: string }) => {
        const blocked = blockedByResolution();
        if (blocked) return blocked;
        const state = resolveRuntime().state;
        const spend = Math.max(0, Math.min(args.amount, state.meters.money));
        if (spend <= 0) {
          return "The reserve is empty — there's nothing left to offer.";
        }
        state.meters.money = clampMoney(state.meters.money - spend);
        const trustGain = Math.round(Math.sqrt(spend) * (10 / TUNING.mastermind.bribeCostPerTrustPoint));
        state.adjustTrust(args.target, trustGain);
        emitWorldEvent(idOf(ME), {
          summary: `The Mastermind quietly pays ${args.target} $${spend}k to keep them close.`,
          detail: args.reason,
          relevantRoles: [args.target],
          tags: ["tool:bribe"],
        });
        return `Paid $${spend}k. ${args.target}'s trust in the crew is now ${state.trustOf(args.target)}.`;
      },
    },
    {
      type: "function",
      name: "threaten",
      description: "Lean on a crew member you suspect is wavering. Effective but corrosive to trust.",
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
        state.adjustTrust(args.target, -TUNING.mastermind.threatenTrustLoss);
        state.meters.chaos = clamp(state.meters.chaos + TUNING.mastermind.threatenChaos);
        emitWorldEvent(idOf(ME), {
          summary: `The Mastermind threatens ${args.target} to fall back in line.`,
          detail: args.reason,
          relevantRoles: [args.target],
          tags: ["tool:threaten"],
        });
        return `${args.target}'s trust in the crew drops to ${state.trustOf(args.target)}. This will be remembered.`;
      },
    },
    {
      type: "function",
      name: "hit_the_vault",
      description: `Go for it — commit to hitting the vault now. Requires heist progress >= ${TUNING.mastermind.heistProgressThreshold}/100 or it fails and the crew walks away with nothing this time.`,
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
        if (state.meters.heistProgress < TUNING.mastermind.heistProgressThreshold) {
          state.meters.chaos = clamp(state.meters.chaos + 15);
          emitWorldEvent(idOf(ME), {
            summary: "The Mastermind commits early — and the vault doesn't give.",
            detail: args.reason,
            relevantRoles: ["detective", "insider", "driver"],
            tags: ["tool:hit_the_vault", "attempt:failed"],
          });
          return `Heist progress was only ${state.meters.heistProgress}/100 — too soon. The attempt fails without resolving anything, and the crew is rattled.`;
        }
        state.phase = "success";
        state.outcome = "The Mastermind hits the vault. The crew gets out clean with the take.";
        emitWorldEvent(idOf(ME), {
          summary: "The Mastermind commits — the crew hits the vault and gets out.",
          detail: args.reason,
          relevantRoles: ["detective", "insider", "driver"],
          tags: ["tool:hit_the_vault", "resolution"],
        });
        return "It's done. Clean.";
      },
    },
    {
      type: "function",
      name: "abort_heist",
      description: "Call off the job entirely. Ends the scenario as a failure, but nobody gets arrested tonight.",
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
        state.phase = "failure";
        state.outcome = "The Mastermind called off the job. The crew scatters, empty-handed but free.";
        emitWorldEvent(idOf(ME), {
          summary: "The Mastermind aborts the heist.",
          detail: args.reason,
          relevantRoles: ["detective", "insider", "driver"],
          tags: ["tool:abort_heist", "resolution"],
        });
        return "The job is off.";
      },
    },
    holdTool(ME),
  ];
}

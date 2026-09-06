import { resolveRuntime } from "../runtime/runtime.js";
import { emitWorldEvent } from "./events.js";
import { clamp } from "./meters.js";
import { TUNING } from "./tuning.js";
import { playerParticipantId } from "../agents/registry.js";
import type { InterventionKind } from "./types.js";

export type InterventionDef = {
  kind: InterventionKind;
  label: string;
  description: string;
};

/**
 * The human's action space, mirroring the agents': a small, fixed set of
 * legal, deterministic moves rather than free text. This is what the brief
 * means by making the player "a real participant" without reopening the
 * door to an LLM (or a person) rewriting the world arbitrarily — an
 * intervention mutates state exactly like a tool call does, then broadcasts
 * a world event so whichever roles it concerns can each independently
 * decide how to react.
 */
export const INTERVENTIONS: InterventionDef[] = [
  {
    kind: "police_early",
    label: "Police arrive ten minutes early",
    description: "A patrol shows up near the vault well ahead of schedule.",
  },
  {
    kind: "leak_vault_code",
    label: "The vault code leaks",
    description: "Word gets out that the vault code is no longer a secret.",
  },
  {
    kind: "cut_power",
    label: "Cut the power to the block",
    description: "The street the vault sits on goes dark.",
  },
  {
    kind: "bribe_driver",
    label: "Offer the Driver money to betray the crew",
    description: "An anonymous offer reaches the getaway driver directly.",
  },
  {
    kind: "sow_distrust_insider",
    label: "Tell the crew the Insider can't be trusted",
    description: "An anonymous tip suggests someone on the inside is compromised.",
  },
];

export function applyIntervention(kind: InterventionKind): { summary: string } {
  const state = resolveRuntime().state;
  const player = playerParticipantId();

  switch (kind) {
    case "police_early": {
      state.meters.heat = clamp(state.meters.heat + 25);
      state.meters.chaos = clamp(state.meters.chaos + 15);
      state.meters.publicAttention = clamp(state.meters.publicAttention + 10);
      return summarize(
        emitWorldEvent(player, {
          summary: "A patrol car rolls up near the vault — ten minutes ahead of the window opening.",
          relevantRoles: ["mastermind", "detective", "insider", "driver"],
          tags: ["intervention:police_early"],
        }),
      );
    }
    case "leak_vault_code": {
      state.meters.chaos = clamp(state.meters.chaos + 20);
      state.meters.heistProgress = clamp(state.meters.heistProgress - 10);
      state.meters.evidence = clamp(state.meters.evidence + TUNING.interventions.leakEvidence);
      return summarize(
        emitWorldEvent(player, {
          summary: "Word gets out on the street: the vault code isn't a secret anymore.",
          relevantRoles: ["mastermind", "detective", "insider", "driver"],
          tags: ["intervention:leak_vault_code"],
        }),
      );
    }
    case "cut_power": {
      state.meters.chaos = clamp(state.meters.chaos + 18);
      state.meters.publicAttention = clamp(state.meters.publicAttention + 8);
      return summarize(
        emitWorldEvent(player, {
          summary: "The block goes dark — every streetlight and camera on the street just died.",
          relevantRoles: ["mastermind", "detective", "insider", "driver"],
          tags: ["intervention:cut_power"],
        }),
      );
    }
    case "bribe_driver": {
      return summarize(
        emitWorldEvent(player, {
          summary: "An anonymous offer reaches the Driver: walk away now, and it's worth their while.",
          relevantRoles: ["driver"],
          tags: ["intervention:bribe_driver"],
        }),
      );
    }
    case "sow_distrust_insider": {
      state.meters.chaos = clamp(state.meters.chaos + 8);
      return summarize(
        emitWorldEvent(player, {
          summary: "An anonymous tip reaches the crew: someone on the inside can't be trusted.",
          relevantRoles: ["mastermind", "insider", "driver"],
          tags: ["intervention:sow_distrust_insider"],
        }),
      );
    }
  }
}

function summarize(payload: { summary: string }): { summary: string } {
  return { summary: payload.summary };
}

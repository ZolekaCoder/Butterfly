import { RuntimeState } from "@mozaik-ai/core";
import type { LogEntry, Phase, RoleId, TurnRecord, WorldMeters } from "./types.js";
import { ROLE_IDS } from "./types.js";

const INITIAL_METERS: WorldMeters = {
  clockMinutes: -30, // T-30: thirty minutes before the vault window opens
  heat: 15,
  chaos: 20,
  publicAttention: 10,
  heistProgress: 25,
  evidence: 12,
  money: 40, // thousands, seed cash for bribes/logistics
  trust: {
    mastermind: 80,
    detective: 100, // detective's own resolve, not crew trust, kept for symmetry
    insider: 70,
    driver: 75,
  },
};

export class HeistState extends RuntimeState {
  phase: Phase = "briefing";
  meters: WorldMeters = structuredClone(INITIAL_METERS);
  turns: TurnRecord[] = [];
  log: LogEntry[] = [];
  outcome: string | null = null;
  startedAt: number = Date.now();

  reset(): void {
    this.phase = "briefing";
    this.meters = structuredClone(INITIAL_METERS);
    this.turns = [];
    this.log = [];
    this.outcome = null;
    this.startedAt = Date.now();
  }

  trustOf(role: RoleId): number {
    return this.meters.trust[role];
  }

  adjustTrust(role: RoleId, delta: number): void {
    this.meters.trust[role] = Math.max(0, Math.min(100, this.meters.trust[role] + delta));
  }

  averageCrewTrust(): number {
    const crew: RoleId[] = ["mastermind", "insider", "driver"];
    return Math.round(crew.reduce((sum, r) => sum + this.meters.trust[r], 0) / crew.length);
  }

  isResolved(): boolean {
    return this.phase === "success" || this.phase === "failure" || this.phase === "arrested";
  }
}

export function isRole(value: string): value is RoleId {
  return (ROLE_IDS as string[]).includes(value);
}

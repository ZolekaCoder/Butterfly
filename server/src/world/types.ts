/**
 * Domain types for the Butterfly heist scenario. This is the deterministic
 * half of the system: nothing here calls a model. LLMs only ever produce a
 * tool call; everything in this file is what application code does with it.
 */

export type RoleId = "mastermind" | "detective" | "insider" | "driver";

export const ROLE_IDS: RoleId[] = ["mastermind", "detective", "insider", "driver"];

export type WorldMeters = {
  clockMinutes: number;
  heat: number; // 0-100, police attention on the crew
  chaos: number; // 0-100, how volatile/unpredictable the situation is
  publicAttention: number; // 0-100, press/bystander awareness
  heistProgress: number; // 0-100, how close the job is to completion
  evidence: number; // 0-100, detective's case strength
  money: number; // crew's liquid cash on hand, in thousands
  trust: Record<RoleId, number>; // 0-100, how much the crew currently trusts this member
};

export type Phase = "briefing" | "active" | "success" | "failure" | "arrested";

export type TurnStatus = "thinking" | "done" | "error" | "timeout";

export type TurnRecord = {
  turnId: string;
  role: RoleId;
  startedAt: number; // epoch ms
  endedAt: number | null;
  status: TurnStatus;
  causeEventId: string | null;
  causeSummary: string | null;
  resultSummary: string | null;
};

export type LogKind = "world" | "turn" | "system";

export type LogEntry = {
  id: string;
  at: number; // epoch ms
  kind: LogKind;
  producer: RoleId | "player" | "world";
  headline: string;
  detail?: string;
  causeEventId?: string;
  tags?: string[];
};

export type WorldEventPayload = {
  id: string;
  summary: string;
  detail?: string;
  relevantRoles: RoleId[];
  causedByEventId?: string;
  tags?: string[];
};

export type InterventionKind =
  | "police_early"
  | "leak_vault_code"
  | "cut_power"
  | "bribe_driver"
  | "sow_distrust_insider";

export type StateSnapshot = {
  phase: Phase;
  meters: WorldMeters;
  turns: TurnRecord[];
  log: LogEntry[];
  outcome: string | null;
  startedAt: number;
};

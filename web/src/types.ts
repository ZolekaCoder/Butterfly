// Mirrors server/src/world/types.ts and agents/roles.ts. Kept as a plain
// duplicate rather than a shared package — the two processes are
// deliberately decoupled for a hackathon-scale repo.

export type RoleId = "mastermind" | "detective" | "insider" | "driver";
export const ROLE_IDS: RoleId[] = ["mastermind", "detective", "insider", "driver"];

export type Phase = "briefing" | "active" | "success" | "failure" | "arrested";
export type TurnStatus = "thinking" | "done" | "error" | "timeout";

export type WorldMeters = {
  clockMinutes: number;
  heat: number;
  chaos: number;
  publicAttention: number;
  heistProgress: number;
  evidence: number;
  money: number;
  trust: Record<RoleId, number>;
};

export type TurnRecord = {
  turnId: string;
  role: RoleId;
  startedAt: number;
  endedAt: number | null;
  status: TurnStatus;
  causeEventId: string | null;
  causeSummary: string | null;
  resultSummary: string | null;
};

export type LogKind = "world" | "turn" | "system";

export type LogEntry = {
  id: string;
  at: number;
  kind: LogKind;
  producer: RoleId | "player" | "world";
  headline: string;
  detail?: string;
  causeEventId?: string;
  tags?: string[];
};

export type RoleMeta = {
  id: RoleId;
  name: string;
  title: string;
  goal: string;
  color: string;
};

export type InterventionKind = "police_early" | "leak_vault_code" | "cut_power" | "bribe_driver" | "sow_distrust_insider";

export type InterventionDef = {
  kind: InterventionKind;
  label: string;
  description: string;
};

export type PendingInterception = {
  id: string;
  role: RoleId;
  toolName: string;
  args: Record<string, unknown>;
  startedAt: number;
};

export type Snapshot = {
  phase: Phase;
  meters: WorldMeters;
  turns: TurnRecord[];
  log: LogEntry[];
  outcome: string | null;
  startedAt: number;
  roles: Record<RoleId, RoleMeta>;
  model: string;
  pendingInterceptions: PendingInterception[];
};

import { useEffect, useState } from "react";
import type { ClientPendingInterception } from "../hooks/useSimulation";
import type { RoleId, RoleMeta, TurnRecord, WorldMeters } from "../types";
import { ROLE_IDS } from "../types";
import "./LiveMinds.css";

/** Mirrors server/src/runtime/interception.ts's INTERCEPTION_DECISION_MS. */
const INTERCEPTION_DECISION_MS = 10_000;

function latestTurn(turns: TurnRecord[], role: RoleId): TurnRecord | undefined {
  return turns.filter((t) => t.role === role).sort((a, b) => b.startedAt - a.startedAt)[0];
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function trustFor(role: RoleId, meters: WorldMeters): number | null {
  if (role === "detective") return null;
  return meters.trust[role];
}

function prettyTool(name: string): string {
  return name.replace(/_/g, " ");
}

export function LiveMinds({
  roles,
  turns,
  meters,
  pending,
  onResolve,
}: {
  roles: Record<RoleId, RoleMeta>;
  turns: TurnRecord[];
  meters: WorldMeters;
  pending: ClientPendingInterception[];
  onResolve: (id: string, approved: boolean) => void;
}) {
  return (
    <div className="live-minds">
      <div className="label" style={{ padding: "var(--space-3) var(--space-4) 0" }}>
        Live minds
      </div>
      <div className="live-minds-list scroll-thin">
        {ROLE_IDS.map((role) => (
          <MindCard
            key={role}
            role={role}
            meta={roles[role]}
            turn={latestTurn(turns, role)}
            trust={trustFor(role, meters)}
            pending={pending.find((p) => p.role === role)}
            onResolve={onResolve}
          />
        ))}
      </div>
    </div>
  );
}

function MindCard({
  role,
  meta,
  turn,
  trust,
  pending,
  onResolve,
}: {
  role: RoleId;
  meta: RoleMeta;
  turn: TurnRecord | undefined;
  trust: number | null;
  pending: ClientPendingInterception | undefined;
  onResolve: (id: string, approved: boolean) => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [pending]);

  const thinking = turn && turn.endedAt === null;
  const statusLabel = pending ? "Awaiting orders" : !turn ? "Observing" : thinking ? "Thinking…" : "Idle";
  const subtitle = thinking
    ? (turn?.causeSummary ?? "Reacting to the situation.")
    : turn?.resultSummary
      ? `"${truncate(turn.resultSummary, 100)}"`
      : "Waiting for the right opening.";

  if (pending) {
    const remainingMs = Math.max(0, pending.receivedAt + INTERCEPTION_DECISION_MS - now);
    const remainingS = Math.ceil(remainingMs / 1000);
    const reason = typeof pending.args?.reason === "string" ? pending.args.reason : null;

    return (
      <div className="mind-card mind-card--pending" style={{ borderLeftColor: meta?.color }}>
        <div className="mind-head">
          <span className="mind-name">{meta?.name ?? role}</span>
          <span className="mind-status mind-status--pending">Awaiting orders</span>
        </div>
        <div className="mind-title">wants to {prettyTool(pending.toolName)}</div>
        {reason && <div className="mind-quote">"{truncate(reason, 110)}"</div>}
        <div className="mind-countdown mono">auto-approves in {remainingS}s</div>
        <div className="mind-decision">
          <button className="decision-btn" onClick={() => onResolve(pending.id, true)}>
            Allow
          </button>
          <button className="decision-btn" onClick={() => onResolve(pending.id, false)}>
            Block
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mind-card${thinking ? " mind-card--thinking" : ""}`} style={{ borderLeftColor: meta?.color }}>
      <div className="mind-head">
        <span className="mind-name">{meta?.name ?? role}</span>
        <span className={`mind-status${thinking ? " mind-status--thinking" : ""}`}>
          {thinking && <span className="mind-dot" style={{ background: meta?.color }} />}
          {statusLabel}
        </span>
      </div>
      <div className="mind-title">{meta?.title}</div>
      <div className="mind-quote">{subtitle}</div>
      {trust !== null && (
        <div className="mind-trust">
          <span className="label">Trust</span>
          <span className="mono">{trust}</span>
        </div>
      )}
    </div>
  );
}

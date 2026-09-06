import { useEffect, useMemo, useState } from "react";
import type { LogEntry, RoleId, RoleMeta, TurnRecord } from "../types";
import "./CausalTimeline.css";

type RowKey = "world" | RoleId;

const ROWS: { key: RowKey; y: number; label: string }[] = [
  { key: "world", y: 22, label: "WORLD / PLAYER" },
  { key: "mastermind", y: 64, label: "MASTERMIND" },
  { key: "detective", y: 106, label: "DETECTIVE" },
  { key: "insider", y: 148, label: "INSIDER" },
  { key: "driver", y: 190, label: "DRIVER" },
];

const VIEW_W = 1000;
const VIEW_H = 214;
const MIN_WINDOW_MS = 45_000;

function rowYFor(producer: LogEntry["producer"]): number {
  const row = ROWS.find((r) => r.key === producer) ?? ROWS[0];
  return row.y;
}

/** Real sweep-line over start/end instants — the peak is a fact about the run, not a guess. */
function peakConcurrency(turns: TurnRecord[], now: number): number {
  const deltas: [number, number][] = [];
  for (const t of turns) {
    deltas.push([t.startedAt, 1]);
    deltas.push([t.endedAt ?? now, -1]);
  }
  deltas.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let current = 0;
  let peak = 0;
  for (const [, delta] of deltas) {
    current += delta;
    if (current > peak) peak = current;
  }
  return peak;
}

export function CausalTimeline({
  roles,
  turns,
  log,
  startedAt,
  pendingRoles,
}: {
  roles: Record<RoleId, RoleMeta>;
  turns: TurnRecord[];
  log: LogEntry[];
  startedAt: number;
  pendingRoles: Set<RoleId>;
}) {
  const [now, setNow] = useState(() => Date.now());
  const anyOpen = turns.some((t) => t.endedAt === null);

  useEffect(() => {
    if (!anyOpen) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [anyOpen]);

  const windowMs = Math.max(MIN_WINDOW_MS, now - startedAt + 3000);
  const pxPerMs = VIEW_W / windowMs;
  const x = (t: number) => Math.max(0, (t - startedAt) * pxPerMs);

  const worldEvents = useMemo(() => log.filter((e) => e.kind === "world"), [log]);
  const positionsById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const e of worldEvents) map.set(e.id, { x: x(e.at), y: rowYFor(e.producer) });
    return map;
  }, [worldEvents, startedAt, now]); // eslint-disable-line react-hooks/exhaustive-deps

  // A "fan-out" is one cause with 2+ simultaneous reactions — the exact moment concurrency
  // becomes visible. Rendered once as a burst at the origin, not looped.
  const fanoutOrigins = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of turns) {
      if (!t.causeEventId) continue;
      counts.set(t.causeEventId, (counts.get(t.causeEventId) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, n]) => n >= 2).map(([id]) => id);
  }, [turns]);

  const activeNow = turns.filter((t) => t.endedAt === null).length;
  const peak = useMemo(() => peakConcurrency(turns, now), [turns, now]);

  return (
    <div className="causal-timeline">
      <div className="causal-head">
        <span className="label">Causal system</span>
        <div className="causal-stats mono">
          {activeNow > 0 && <span className={activeNow >= 2 ? "stat stat--hot" : "stat"}>{activeNow} now</span>}
          {peak >= 2 && <span className="stat">peak {peak}</span>}
          <span className="causal-elapsed">+{Math.max(0, Math.round((now - startedAt) / 1000))}s</span>
        </div>
      </div>
      <div className="causal-body scroll-thin">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="causal-svg">
          {ROWS.map((row) => (
            <g key={row.key}>
              <line x1={0} y1={row.y} x2={VIEW_W} y2={row.y} stroke="var(--border)" strokeWidth={1} />
              <text x={4} y={row.y - 6} className="row-label">
                {row.label}
              </text>
            </g>
          ))}

          {anyOpen && <line x1={x(now)} y1={0} x2={x(now)} y2={VIEW_H} stroke="var(--accent)" strokeWidth={1} opacity={0.5} />}

          {worldEvents.map((e) => {
            if (!e.causeEventId) return null;
            const from = positionsById.get(e.causeEventId);
            const to = positionsById.get(e.id);
            if (!from || !to) return null;
            const midY = Math.min(from.y, to.y) - 22;
            const color = e.producer === "player" ? "var(--accent)" : (roles[e.producer as RoleId]?.color ?? "var(--fg-2)");
            return (
              <path
                key={`link-${e.id}`}
                d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${midY} ${to.x} ${to.y}`}
                fill="none"
                stroke={color}
                strokeWidth={1}
                opacity={0.6}
                className="causal-link"
              />
            );
          })}

          {fanoutOrigins.map((id) => {
            const p = positionsById.get(id);
            if (!p) return null;
            return <circle key={`burst-${id}`} cx={p.x} cy={p.y} r={4} fill="none" stroke="var(--accent)" strokeWidth={1.5} className="fanout-burst" />;
          })}

          {turns.map((t) => {
            const start = x(t.startedAt);
            const end = x(t.endedAt ?? now);
            const w = Math.max(3, end - start);
            const row = ROWS.find((r) => r.key === t.role)!;
            const color = roles[t.role]?.color ?? "var(--fg-1)";
            const thinking = t.endedAt === null;
            const held = pendingRoles.has(t.role) && thinking;
            return (
              <rect
                key={t.turnId}
                x={start}
                y={row.y - 8}
                width={w}
                height={16}
                rx={2}
                fill={color}
                stroke={held ? "var(--accent)" : "none"}
                strokeWidth={held ? 1.5 : 0}
                strokeDasharray={held ? "3 2" : undefined}
                opacity={thinking ? 0.5 : t.status === "done" ? 0.95 : 0.3}
                className={held ? "turn-bar turn-bar--held" : thinking ? "turn-bar turn-bar--thinking" : "turn-bar"}
              />
            );
          })}

          {worldEvents.map((e) => {
            const p = positionsById.get(e.id);
            if (!p) return null;
            const color = e.producer === "player" ? "var(--accent)" : (roles[e.producer as RoleId]?.color ?? "var(--fg-1)");
            return <circle key={e.id} cx={p.x} cy={p.y} r={4} fill={color} className="event-dot" />;
          })}
        </svg>
      </div>
    </div>
  );
}

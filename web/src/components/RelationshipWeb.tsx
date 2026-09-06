import type { LogEntry, RoleId, RoleMeta, WorldMeters } from "../types";
import "./RelationshipWeb.css";

const POS: Record<RoleId, { x: number; y: number }> = {
  mastermind: { x: 150, y: 58 },
  insider: { x: 72, y: 224 },
  driver: { x: 228, y: 224 },
  detective: { x: 254, y: 56 },
};

const CENTER = { x: 150, y: 168 };

/** Latest world-log entry id per role, used only as a React key to retrigger the pulse ring on new activity. */
function pulseKeys(log: LogEntry[]): Record<RoleId, string> {
  const keys = {} as Record<RoleId, string>;
  for (const entry of log) {
    if (entry.producer === "player" || entry.producer === "world") continue;
    keys[entry.producer] = entry.id;
  }
  return keys;
}

export function RelationshipWeb({ roles, meters, log }: { roles: Record<RoleId, RoleMeta>; meters: WorldMeters; log: LogEntry[] }) {
  const keys = pulseKeys(log);

  return (
    <div className="relationship-web">
      <div className="label" style={{ padding: "var(--space-3) var(--space-4) 0" }}>
        The crew
      </div>
      <svg viewBox="0 0 300 280" className="relationship-svg" role="img" aria-label="Relationships between the crew and the detective">
        <circle cx={CENTER.x} cy={CENTER.y} r={22} fill="var(--bg-2)" stroke="var(--border-strong)" strokeWidth={1} />
        <text x={CENTER.x} y={CENTER.y - 2} textAnchor="middle" className="node-label node-label--center">
          THE
        </text>
        <text x={CENTER.x} y={CENTER.y + 10} textAnchor="middle" className="node-label node-label--center">
          JOB
        </text>

        {(["mastermind", "insider", "driver"] as const).map((role) => {
          const trust = meters.trust[role];
          const p = POS[role];
          return (
            <line
              key={role}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={p.x}
              y2={p.y}
              stroke={roles[role]?.color}
              strokeWidth={1 + (trust / 100) * 4}
              opacity={0.35 + (trust / 100) * 0.5}
            />
          );
        })}

        <line
          x1={CENTER.x}
          y1={CENTER.y}
          x2={POS.detective.x}
          y2={POS.detective.y}
          stroke="var(--role-detective)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          opacity={0.3 + (meters.evidence / 100) * 0.6}
        />

        {(Object.keys(POS) as RoleId[]).map((role) => (
          <Node key={role} role={role} meta={roles[role]} pos={POS[role]} pulseKey={keys[role]} />
        ))}
      </svg>
      <div className="relationship-legend">
        <span>Line weight = trust</span>
        <span>Dashed = the case against the crew</span>
      </div>
    </div>
  );
}

function Node({ role, meta, pos, pulseKey }: { role: RoleId; meta: RoleMeta; pos: { x: number; y: number }; pulseKey?: string }) {
  return (
    <g>
      {pulseKey && <circle key={pulseKey} cx={pos.x} cy={pos.y} r={14} fill="none" stroke={meta?.color} strokeWidth={2} className="node-pulse" />}
      <circle cx={pos.x} cy={pos.y} r={14} fill="var(--bg-2)" stroke={meta?.color} strokeWidth={2} />
      <text x={pos.x} y={pos.y + 30} textAnchor="middle" className="node-label">
        {meta?.name ?? role}
      </text>
    </g>
  );
}

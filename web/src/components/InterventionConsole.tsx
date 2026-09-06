import type { InterventionDef, InterventionKind, LogEntry, Phase } from "../types";
import "./InterventionConsole.css";

function timeLabel(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour12: false, minute: "2-digit", second: "2-digit" });
}

export function InterventionConsole({
  interventions,
  phase,
  log,
  onIntervene,
  onReset,
}: {
  interventions: InterventionDef[];
  phase: Phase;
  log: LogEntry[];
  onIntervene: (kind: InterventionKind) => void;
  onReset: () => void;
}) {
  const resolved = phase === "success" || phase === "failure" || phase === "arrested";
  const recent = log.filter((e) => e.kind !== "turn").slice(-6).reverse();

  return (
    <div className="console">
      <div className="console-actions">
        <div className="label" style={{ marginBottom: 8 }}>
          Intervene
        </div>
        <div className="console-buttons">
          {interventions.map((i) => (
            <button key={i.kind} className="intervene-btn" disabled={resolved} title={i.description} onClick={() => onIntervene(i.kind)}>
              {i.label}
            </button>
          ))}
        </div>
        <button className="reset-btn" onClick={onReset}>
          Reset scenario
        </button>
      </div>
      <div className="console-log scroll-thin">
        <div className="label" style={{ marginBottom: 8 }}>
          Feed
        </div>
        {recent.map((e) => (
          <div key={e.id} className="log-row">
            <span className="mono log-time">{timeLabel(e.at)}</span>
            <span className="log-headline">{e.headline}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { WorldMeters } from "../types";
import "./TopMeters.css";

type MeterDef = {
  key: string;
  label: string;
  value: number;
  tone: "neutral" | "danger-high" | "positive-high";
};

function crewTrust(m: WorldMeters): number {
  return Math.round((m.trust.mastermind + m.trust.insider + m.trust.driver) / 3);
}

export function TopMeters({ meters }: { meters: WorldMeters }) {
  const defs: MeterDef[] = [
    { key: "heat", label: "Heat", value: meters.heat, tone: "danger-high" },
    { key: "chaos", label: "Chaos", value: meters.chaos, tone: "danger-high" },
    { key: "attention", label: "Public attention", value: meters.publicAttention, tone: "danger-high" },
    { key: "trust", label: "Crew trust", value: crewTrust(meters), tone: "positive-high" },
    { key: "progress", label: "Heist progress", value: meters.heistProgress, tone: "positive-high" },
  ];

  return (
    <div className="top-meters">
      {defs.map((d) => (
        <Meter key={d.key} def={d} />
      ))}
    </div>
  );
}

function Meter({ def }: { def: MeterDef }) {
  const hot = def.tone === "danger-high" && def.value >= 60;
  const good = def.tone === "positive-high" && def.value >= 60;
  const barClass = hot ? "meter-bar--danger" : good ? "meter-bar--positive" : "";

  return (
    <div className="meter">
      <div className="meter-head">
        <span className="label">{def.label}</span>
        <span className="mono meter-value">{def.value}</span>
      </div>
      <div className="meter-track">
        <div className={`meter-bar ${barClass}`} style={{ width: `${Math.max(0, Math.min(100, def.value))}%` }} />
      </div>
    </div>
  );
}

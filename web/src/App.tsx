import { useEffect, useState } from "react";
import { useSimulation } from "./hooks/useSimulation";
import { fetchInterventions } from "./lib/api";
import { TopMeters } from "./components/TopMeters";
import { RelationshipWeb } from "./components/RelationshipWeb";
import { CausalTimeline } from "./components/CausalTimeline";
import { LiveMinds } from "./components/LiveMinds";
import { InterventionConsole } from "./components/InterventionConsole";
import type { InterventionDef, RoleId } from "./types";
import "./App.css";

const OUTCOME_LABEL: Record<string, string> = {
  success: "Heist succeeded",
  failure: "Job fell apart",
  arrested: "Crew arrested",
};

export default function App() {
  const { state, intervene, reset, resolveInterception } = useSimulation();
  const [interventions, setInterventions] = useState<InterventionDef[]>([]);

  useEffect(() => {
    fetchInterventions().then(setInterventions).catch(() => setInterventions([]));
  }, []);

  const resolved = state.phase === "success" || state.phase === "failure" || state.phase === "arrested";
  const pendingRoles = new Set<RoleId>(state.pendingInterceptions.map((p) => p.role));

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-name">BUTTERFLY</span>
          <span className="app-tagline">One decision. A world of agents. Watch the consequences unfold.</span>
        </div>
        <div className="app-status">
          {resolved && <span className="outcome-chip">{OUTCOME_LABEL[state.phase] ?? state.phase}</span>}
          <span className="mono model-name">{state.model || "…"}</span>
          <span className={`conn-dot${state.connected ? " conn-dot--live" : ""}`} />
          <span className="label">{state.connected ? "live" : "reconnecting"}</span>
        </div>
      </header>

      <TopMeters meters={state.meters} />

      <main className="app-grid">
        <section className="panel zone-left">
          <RelationshipWeb roles={state.roles} meters={state.meters} log={state.log} />
        </section>
        <section className="panel zone-center">
          <CausalTimeline roles={state.roles} turns={state.turns} log={state.log} startedAt={state.startedAt} pendingRoles={pendingRoles} />
        </section>
        <section className="panel zone-right">
          <LiveMinds
            roles={state.roles}
            turns={state.turns}
            meters={state.meters}
            pending={state.pendingInterceptions}
            onResolve={resolveInterception}
          />
        </section>
      </main>

      <InterventionConsole interventions={interventions} phase={state.phase} log={state.log} onIntervene={intervene} onReset={reset} />
    </div>
  );
}

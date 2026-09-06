import type { InterventionDef, InterventionKind, LogEntry, PendingInterception, Phase, Snapshot, TurnRecord, WorldMeters } from "../types";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";

export async function fetchState(): Promise<Snapshot> {
  const res = await fetch(`${API_URL}/api/state`);
  if (!res.ok) throw new Error(`GET /api/state failed: ${res.status}`);
  return res.json();
}

export async function fetchInterventions(): Promise<InterventionDef[]> {
  const res = await fetch(`${API_URL}/api/interventions`);
  if (!res.ok) throw new Error(`GET /api/interventions failed: ${res.status}`);
  return res.json();
}

export async function postIntervene(kind: InterventionKind): Promise<{ summary: string }> {
  const res = await fetch(`${API_URL}/api/intervene`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  if (!res.ok) throw new Error(`POST /api/intervene failed: ${res.status}`);
  return res.json();
}

export async function postReset(): Promise<Snapshot> {
  const res = await fetch(`${API_URL}/api/reset`, { method: "POST" });
  if (!res.ok) throw new Error(`POST /api/reset failed: ${res.status}`);
  return res.json();
}

export async function postResolveInterception(id: string, approved: boolean): Promise<void> {
  const res = await fetch(`${API_URL}/api/interception/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved }),
  });
  // 409 means it already auto-resolved or was handled elsewhere — not worth surfacing as an error.
  if (!res.ok && res.status !== 409) throw new Error(`POST /api/interception/${id}/resolve failed: ${res.status}`);
}

export type WorldUpdate = { phase: Phase; meters: WorldMeters; outcome: string | null };
export type InterceptionResolved = { id: string; approved: boolean; auto: boolean };

export type StreamHandlers = {
  onSnapshot: (s: Snapshot) => void;
  onTurn: (t: TurnRecord) => void;
  onLogEntry: (e: LogEntry) => void;
  onWorldUpdate: (u: WorldUpdate) => void;
  onInterceptionPending: (p: PendingInterception) => void;
  onInterceptionResolved: (r: InterceptionResolved) => void;
  onConnectionChange: (connected: boolean) => void;
};

/** Opens the live SSE feed. Returns a cleanup function. Reconnects on drop via EventSource's own retry. */
export function connectStream(handlers: StreamHandlers): () => void {
  const source = new EventSource(`${API_URL}/api/stream`);

  source.addEventListener("snapshot", (e) => handlers.onSnapshot(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("turn.started", (e) => handlers.onTurn(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("turn.ended", (e) => handlers.onTurn(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("log.entry", (e) => handlers.onLogEntry(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("world.update", (e) => handlers.onWorldUpdate(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("interception.pending", (e) => handlers.onInterceptionPending(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("interception.resolved", (e) => handlers.onInterceptionResolved(JSON.parse((e as MessageEvent).data)));

  source.onopen = () => handlers.onConnectionChange(true);
  source.onerror = () => handlers.onConnectionChange(false);

  return () => source.close();
}

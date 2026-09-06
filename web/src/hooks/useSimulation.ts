import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  connectStream,
  postIntervene,
  postReset,
  postResolveInterception,
  type InterceptionResolved,
  type WorldUpdate,
} from "../lib/api";
import type { InterventionKind, LogEntry, PendingInterception, Snapshot, TurnRecord } from "../types";

/**
 * `startedAt` is a server epoch timestamp; comparing it against the client's
 * own `Date.now()` for a countdown is fragile the moment the two clocks
 * aren't perfectly in sync (seen in testing: a sandboxed browser process
 * with a few seconds of drift from the server process). `receivedAt` is
 * stamped once, client-side, the moment this record first arrives, so the
 * countdown only ever compares the client's clock against itself.
 */
export type ClientPendingInterception = PendingInterception & { receivedAt: number };

type SimState = Omit<Snapshot, "pendingInterceptions"> & {
  pendingInterceptions: ClientPendingInterception[];
  connected: boolean;
  loaded: boolean;
};

type Action =
  | { type: "snapshot"; data: Snapshot }
  | { type: "turn"; data: TurnRecord }
  | { type: "log"; data: LogEntry }
  | { type: "worldUpdate"; data: WorldUpdate }
  | { type: "interceptionPending"; data: PendingInterception }
  | { type: "interceptionResolved"; data: InterceptionResolved }
  | { type: "connection"; connected: boolean };

const MAX_LOG = 300;

function reducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case "snapshot": {
      const now = Date.now();
      const pendingInterceptions = action.data.pendingInterceptions.map((p) => ({ ...p, receivedAt: now }));
      return { ...state, ...action.data, pendingInterceptions, connected: true, loaded: true };
    }
    case "turn": {
      const idx = state.turns.findIndex((t) => t.turnId === action.data.turnId);
      const turns = idx === -1 ? [...state.turns, action.data] : state.turns.map((t, i) => (i === idx ? action.data : t));
      return { ...state, turns };
    }
    case "log": {
      const log = [...state.log, action.data].slice(-MAX_LOG);
      return { ...state, log };
    }
    case "worldUpdate":
      return { ...state, phase: action.data.phase, meters: action.data.meters, outcome: action.data.outcome };
    case "interceptionPending": {
      const exists = state.pendingInterceptions.some((p) => p.id === action.data.id);
      const pendingInterceptions = exists
        ? state.pendingInterceptions
        : [...state.pendingInterceptions, { ...action.data, receivedAt: Date.now() }];
      return { ...state, pendingInterceptions };
    }
    case "interceptionResolved":
      return { ...state, pendingInterceptions: state.pendingInterceptions.filter((p) => p.id !== action.data.id) };
    case "connection":
      return { ...state, connected: action.connected };
    default:
      return state;
  }
}

const EMPTY: SimState = {
  phase: "briefing",
  meters: {
    clockMinutes: 0,
    heat: 0,
    chaos: 0,
    publicAttention: 0,
    heistProgress: 0,
    evidence: 0,
    money: 0,
    trust: { mastermind: 0, detective: 0, insider: 0, driver: 0 },
  },
  turns: [],
  log: [],
  outcome: null,
  startedAt: Date.now(),
  roles: {} as Snapshot["roles"],
  model: "",
  pendingInterceptions: [],
  connected: false,
  loaded: false,
};

export function useSimulation() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const busyRef = useRef(false);

  useEffect(() => {
    const cleanup = connectStream({
      onSnapshot: (data) => dispatch({ type: "snapshot", data }),
      onTurn: (data) => dispatch({ type: "turn", data }),
      onLogEntry: (data) => dispatch({ type: "log", data }),
      onWorldUpdate: (data) => dispatch({ type: "worldUpdate", data }),
      onInterceptionPending: (data) => dispatch({ type: "interceptionPending", data }),
      onInterceptionResolved: (data) => dispatch({ type: "interceptionResolved", data }),
      onConnectionChange: (connected) => dispatch({ type: "connection", connected }),
    });
    return cleanup;
  }, []);

  const intervene = useCallback(async (kind: InterventionKind) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await postIntervene(kind);
    } finally {
      busyRef.current = false;
    }
  }, []);

  const reset = useCallback(async () => {
    const data = await postReset();
    dispatch({ type: "snapshot", data });
  }, []);

  const resolveInterception = useCallback(async (id: string, approved: boolean) => {
    // Optimistic: remove locally right away so the UI feels instant; the SSE
    // "resolved" broadcast that follows is then a harmless no-op filter.
    dispatch({ type: "interceptionResolved", data: { id, approved, auto: false } });
    await postResolveInterception(id, approved).catch(() => {
      // Already resolved (e.g. the 10s window lapsed a moment earlier) — nothing to recover.
    });
  }, []);

  return { state, intervene, reset, resolveInterception };
}

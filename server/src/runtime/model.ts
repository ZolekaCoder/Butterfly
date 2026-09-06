/**
 * Single knob for which model every agent thinks with. Swap via the
 * MOZAIK_MODEL env var — no code changes needed. Defaults to a fast, cheap
 * model deliberately: five concurrent expensive-model calls per human
 * decision would make the live demo slow and costly for no real gain in
 * this scenario's reasoning depth.
 */
export const MODEL = process.env.MOZAIK_MODEL?.trim() || "claude-haiku-4-5";

export const MAX_OUTPUT_TOKENS = 500;

/**
 * How long we wait for an agent's turn to resolve before we treat it as
 * failed. `runLoop` returns void, not a promise, so a provider error can
 * only be *detected* here, not caught at the call site — keep this short
 * enough that a real failure doesn't stall the demo, long enough to survive
 * a normal multi-step tool-call round trip on a fast model.
 */
export const TURN_WATCHDOG_MS = 15_000;

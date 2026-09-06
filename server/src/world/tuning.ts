/**
 * Every number an agent's tool call can move the world by lives here. This
 * is the "physics" layer the brief asks for: the model only ever picks a
 * tool and writes a one-line `reason` — it never sets a meter directly.
 * Centralizing the deltas also makes the simulation's rules auditable at a
 * glance instead of scattered across five tool files.
 */
export const TUNING = {
  raid: {
    evidenceThreshold: 55,
  },
  interventions: {
    // A leaked vault code is also a lead: it's the one player-facing action
    // that meaningfully feeds the Detective's case, so evidence can
    // realistically approach the raid threshold within a normal-length take
    // (seeing the actual human-in-the-loop Interception moment shouldn't
    // depend on luck alone — see agents/interception.ts).
    leakEvidence: 20,
  },
  mastermind: {
    accelerate: { safeProgress: 10, safeHeat: 4, aggressiveProgress: 20, aggressiveHeat: 14, chaos: 4 },
    bribeCostPerTrustPoint: 3, // $3k buys ~1 trust point, diminishing via sqrt below
    threatenTrustLoss: 22,
    threatenChaos: 10,
    heistProgressThreshold: 80, // minimum heistProgress to call hit_the_vault
  },
  detective: {
    investigateEvidence: 9,
    investigateChaos: 2,
    backupHeat: 16,
    backupAttention: 11,
    dealChaos: 4,
  },
  insider: {
    tipEvidence: 13,
    tipSelfTrustCost: 7,
    warnProgress: 6,
    warnTrustGain: 5,
    flipTrustLoss: 35,
    flipEvidence: 16,
  },
  driver: {
    fleeProgressLoss: 22,
    fleeChaos: 16,
    fleeTrustLoss: 30,
    flipEvidence: 18,
    flipTrustLoss: 26,
    demandChaos: 5,
  },
} as const;

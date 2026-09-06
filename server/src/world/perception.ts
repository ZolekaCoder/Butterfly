import type { HeistState } from "./state.js";
import type { RoleId } from "./types.js";

/**
 * What each role is told about the world is deliberately partial — this is
 * the "incomplete information" the brief asks for. The detective never sees
 * heist progress, money, or crew trust (that's crew-internal); the insider
 * and driver only ever see their *own* standing with the crew, never each
 * other's. Only the mastermind, as the one running the crew, sees the full
 * picture. None of this is enforced by Mozaik — it's just what we choose to
 * put in the message we hand to `runLoop`.
 */
export function visibleSituation(role: RoleId, state: HeistState): string {
  const m = state.meters;
  const clock =
    m.clockMinutes < 0 ? `T-minus ${Math.abs(m.clockMinutes)} min to the vault window` : `T+${m.clockMinutes} min into the window`;

  const lines = [`Clock: ${clock}`, `Phase: ${state.phase}`, `Heat: ${m.heat}/100`, `Chaos: ${m.chaos}/100`, `Public attention: ${m.publicAttention}/100`];

  if (role === "detective") {
    lines.push(`Your case strength (evidence): ${m.evidence}/100 (a raid needs roughly 55+)`);
    return lines.join("\n");
  }

  lines.push(`Heist progress: ${m.heistProgress}/100`, `Shared cash reserve: $${m.money}k`);

  if (role === "mastermind") {
    lines.push(
      `Insider's trust in the crew: ${state.trustOf("insider")}/100`,
      `Driver's trust in the crew: ${state.trustOf("driver")}/100`,
    );
    return lines.join("\n");
  }

  lines.push(`Your own standing with the crew: ${state.trustOf(role)}/100`);
  return lines.join("\n");
}

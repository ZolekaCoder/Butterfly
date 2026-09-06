import { createAgent, createHuman, type Agent, type Human } from "@mozaik-ai/core";
import { ROLE_IDS } from "../world/types.js";
import type { RoleId } from "../world/types.js";
import { ROLE_META } from "./roles.js";
import { personaFor } from "./personas.js";
import { reactionHandler } from "./handlers.js";
import { registerRole, resetRegistry, setPlayerId } from "./registry.js";
import { mastermindTools } from "./tools/mastermind.js";
import { detectiveTools } from "./tools/detective.js";
import { insiderTools } from "./tools/insider.js";
import { driverTools } from "./tools/driver.js";
import { createObserver } from "../observer.js";

const TOOL_BUILDERS: Record<RoleId, () => ReturnType<typeof mastermindTools>> = {
  mastermind: mastermindTools,
  detective: detectiveTools,
  insider: insiderTools,
  driver: driverTools,
};

export type Cast = {
  agents: Record<RoleId, Agent>;
  player: Human;
  observer: Human;
};

/** Builds one fresh set of agents + player + observer. Called once at boot and again on every reset. */
export function buildCast(): Cast {
  resetRegistry();
  const agents = {} as Record<RoleId, Agent>;

  for (const role of ROLE_IDS) {
    const agent = createAgent({
      name: ROLE_META[role].name,
      capabilities: ["inference"],
      instruction: personaFor(role),
      tools: TOOL_BUILDERS[role](),
      handlers: [reactionHandler(role)],
    });
    registerRole(role, agent);
    agents[role] = agent;
  }

  const player = createHuman({ name: "Player", capabilities: [], handlers: [] });
  setPlayerId(player.getId());

  const observer = createObserver();

  return { agents, player, observer };
}

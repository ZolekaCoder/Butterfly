import type { Agent } from "@mozaik-ai/core";
import type { RoleId } from "../world/types.js";

/**
 * Mozaik assigns participant ids as random UUIDs (there's no way to request
 * one), so anything that needs to go from "the driver" to a concrete
 * participant id — or back — goes through this small registry, populated
 * once at startup right after the four agents are created.
 */

const idByRole = new Map<RoleId, string>();
const roleById = new Map<string, RoleId>();
const agentByRole = new Map<RoleId, Agent>();

/** Wipes every mapping. Call before rebuilding the cast on a scenario reset. */
export function resetRegistry(): void {
  idByRole.clear();
  roleById.clear();
  agentByRole.clear();
  playerId = undefined;
}

export function registerRole(role: RoleId, agent: Agent): void {
  idByRole.set(role, agent.getId());
  roleById.set(agent.getId(), role);
  agentByRole.set(role, agent);
}

export function idOf(role: RoleId): string {
  const id = idByRole.get(role);
  if (!id) throw new Error(`Role "${role}" has not been registered yet`);
  return id;
}

export function agentOf(role: RoleId): Agent {
  const agent = agentByRole.get(role);
  if (!agent) throw new Error(`Role "${role}" has not been registered yet`);
  return agent;
}

export function roleOf(participantId: string): RoleId | undefined {
  return roleById.get(participantId);
}

let playerId: string | undefined;

export function setPlayerId(id: string): void {
  playerId = id;
}

export function isPlayer(participantId: string): boolean {
  return participantId === playerId;
}

export function playerParticipantId(): string {
  if (!playerId) throw new Error("Player has not been registered yet");
  return playerId;
}

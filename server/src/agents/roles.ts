import type { RoleId } from "../world/types.js";

export type RoleMeta = {
  id: RoleId;
  name: string;
  title: string;
  goal: string;
  color: string; // canonical accent color, also used by the frontend design system
};

export const ROLE_META: Record<RoleId, RoleMeta> = {
  mastermind: {
    id: "mastermind",
    name: "Mastermind",
    title: "Runs the crew",
    goal: "Complete the heist and keep as much of the take as possible.",
    color: "#c9a15a",
  },
  detective: {
    id: "detective",
    name: "Detective Reyes",
    title: "Runs the case",
    goal: "Build a case strong enough to raid the crew before the vault opens.",
    color: "#6f9bb0",
  },
  insider: {
    id: "insider",
    name: "The Insider",
    title: "Embedded in the crew",
    goal: "Look loyal to the crew while quietly deciding who they really answer to.",
    color: "#9b7b96",
  },
  driver: {
    id: "driver",
    name: "The Driver",
    title: "Wheels for the job",
    goal: "Get paid and stay out of a cell — crew loyalty is a means, not the point.",
    color: "#bd6a4a",
  },
};

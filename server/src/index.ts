import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Resolve the repo-root .env regardless of the process's cwd (npm
// workspaces run this script with cwd = server/, but there's one shared
// .env at the repo root). `override: true` is required: dotenv otherwise
// leaves an already-set process.env var alone, so a stale/unrelated
// ANTHROPIC_API_KEY inherited from the parent shell would silently win over
// the one in .env — exactly the failure mode this project hit in testing.
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), override: true });

const { initializeRuntime, installCrashGuard } = await import("./runtime/runtime.js");
const { HeistState } = await import("./world/state.js");
const { startScenario } = await import("./runtime/scenario.js");
const { createServer } = await import("./http/server.js");

installCrashGuard();
initializeRuntime({ state: new HeistState() });
startScenario();

const app = createServer();
const port = Number(process.env.PORT) || 8787;

app.listen(port, () => {
  console.log(`[butterfly] server listening on http://localhost:${port}`);
  console.log(`[butterfly] model: ${process.env.MOZAIK_MODEL?.trim() || "claude-haiku-4-5"}`);
});

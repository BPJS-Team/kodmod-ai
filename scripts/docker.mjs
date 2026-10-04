import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const action = process.argv[2] ?? "up";
const commands = {
  up: ["up", "-d", "--build", "--wait"],
  build: ["build", "ai-engine", "web"],
  down: ["down"],
  status: ["ps", "--all"],
  logs: ["logs", "--tail", "100", "--follow"],
  migrate: ["run", "--rm", "--build", "migrate"],
  admin: ["exec", "ai-engine", "python", "-m", "scripts.create_admin", "--username", "admin"],
};
if (!Object.hasOwn(commands, action)) throw new Error("Unknown Docker action");
const windows = process.platform === "win32";
const result = spawnSync(
  windows ? "pwsh" : "docker",
  windows
    ? ["-NoProfile", "-File", fileURLToPath(new URL("./docker.ps1", import.meta.url)), action]
    : ["compose", ...commands[action]],
  { stdio: "inherit", cwd: fileURLToPath(new URL("../", import.meta.url)) },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);

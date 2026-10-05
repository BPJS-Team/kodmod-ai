import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const action = process.argv[2] ?? "up";
const monitoringProfiles = ["--profile", "monitoring"];
if (process.platform === "linux") monitoringProfiles.push("--profile", "monitoring-linux");
const commands = {
  up: [...monitoringProfiles, "up", "-d", "--build", "--wait"],
  build: ["build", "ai-engine", "web"],
  down: [...monitoringProfiles, "down"],
  status: [...monitoringProfiles, "ps", "--all"],
  logs: [...monitoringProfiles, "logs", "--tail", "100", "--follow"],
  migrate: ["run", "--rm", "--build", "migrate"],
  admin: ["exec", "ai-engine", "python", "-m", "scripts.create_admin", "--username", "admin"],
  "monitoring-up": [...monitoringProfiles, "up", "-d", "--wait", "prometheus", "grafana", "cadvisor", ...(process.platform === "linux" ? ["node-exporter"] : [])],
  "monitoring-down": [...monitoringProfiles, "stop", "prometheus", "grafana", "cadvisor", ...(process.platform === "linux" ? ["node-exporter"] : [])],
  "monitoring-status": [...monitoringProfiles, "ps", "--all", "prometheus", "grafana", "cadvisor", ...(process.platform === "linux" ? ["node-exporter"] : [])],
  "monitoring-logs": [...monitoringProfiles, "logs", "--tail", "100", "--follow", "prometheus", "grafana", "cadvisor", ...(process.platform === "linux" ? ["node-exporter"] : [])],
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

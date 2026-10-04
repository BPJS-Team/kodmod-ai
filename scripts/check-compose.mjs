// Validate resolved Compose without printing environment values or credentials.
import { readFileSync } from "node:fs";
const config = JSON.parse(readFileSync(0, "utf8"));
const mode = process.argv[2] || "local";
const services = config.services;
function requireThat(value, message) { if (!value) throw new Error(message); }
for (const name of ["postgres", "redis", "migrate", "ai-engine", "worker", "web"]) requireThat(services[name], `Missing ${name} service`);
const sources = service => new Map(service.volumes?.map(volume => [volume.target, `${volume.type}:${volume.source.replaceAll("\\", "/")}`]));
const api = sources(services["ai-engine"]);
for (const name of ["migrate", "worker"]) {
  const mounts = sources(services[name]);
  for (const target of ["/var/lib/kodmod/audio", "/var/lib/kodmod/uploads"]) requireThat(api.has(target) && mounts.get(target) === api.get(target), `${name} must share ${target} with API`);
}
for (const name of ["ai-engine", "worker"]) requireThat(services[name].depends_on?.migrate?.condition === "service_completed_successfully", `${name} must wait for migrations`);
requireThat(services.worker.healthcheck?.test?.some(part => part.includes("kodmod-worker-heartbeat")), "Worker must have a heartbeat healthcheck");
if (mode === "prod") {
  requireThat(services.caddy, "Missing HTTPS ingress");
  for (const [name, service] of Object.entries(services)) for (const port of service.ports || []) requireThat(name === "caddy" && ["80", "443"].includes(String(port.published)), "Only Caddy may expose production ports");
  requireThat(services.web.environment?.SESSION_COOKIE_SECURE === "true", "HTTPS session cookie must be secure");
} else {
  for (const service of Object.values(services)) for (const port of service.ports || []) requireThat(port.host_ip === "127.0.0.1", "Local ports must bind to loopback");
}
console.log(`PASS ${mode} Compose topology, migrations, worker and shared storage`);

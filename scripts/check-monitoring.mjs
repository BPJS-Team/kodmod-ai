// Read-only checks against the running stack, including real dashboard queries.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const bundledDocker = join(process.env.LOCALAPPDATA || "", "Programs", "DockerDesktop", "resources", "bin", "docker.exe");
const docker = process.platform === "win32" && existsSync(bundledDocker) ? bundledDocker : "docker";
const project = process.env.KODMOD_COMPOSE_PROJECT || (process.platform === "win32" ? "kodmod-centre" : "kodmod");
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
};
const run = args => {
  try {
    return execFileSync(docker, args, { encoding: "utf8", timeout: 25000, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error(`Docker check failed (${args[0]}); inspect the service logs.`);
  }
};
const find = name => run(["ps", "--filter", `label=com.docker.compose.project=${project}`, "--filter", `label=com.docker.compose.service=${name}`, "--format", "{{.ID}}"]);
const api = find("ai-engine");
const grafana = find("grafana");
const prometheus = find("prometheus");
if (!api || !grafana || !prometheus) throw new Error(`Start API, Grafana and Prometheus for project ${project}.`);

for (const name of ["web", "ai-engine", "worker", "postgres", "redis", "grafana", "prometheus", "cadvisor"]) {
  const id = find(name);
  if (!id) { check(`${name} container`, false, "missing"); continue; }
  const state = JSON.parse(run(["inspect", "--format", "{{json .State}}", id]));
  check(`${name} container`, state.Running && (!state.Health || state.Health.Status === "healthy"), state.Health?.Status || state.Status);
}

const dashboard = JSON.parse(readFileSync(new URL("../infra/docker/grafana/dashboards/kodmod-docker-overview.json", import.meta.url), "utf8"));
const panelQueries = dashboard.panels.flatMap(panel => (panel.targets || []).filter(target => target.expr).map(target => ({ title: panel.title, expression: target.expr })));
const probe = `
import json, urllib.parse, urllib.request
base = 'http://prometheus:9090'
def get(path):
    with urllib.request.urlopen(base + path, timeout=12) as response:
        return json.load(response)
with urllib.request.urlopen(base + '/-/ready', timeout=12) as response:
    ready = response.status == 200
targets = get('/api/v1/targets')['data']['activeTargets']
rules = get('/api/v1/rules')['data']['groups']
queries = []
for panel in ${JSON.stringify(panelQueries)}:
    response = get('/api/v1/query?' + urllib.parse.urlencode({'query': panel['expression']}))
    queries.append({'title': panel['title'], 'expression': panel['expression'], 'status': response['status'], 'series': len(response.get('data', {}).get('result', []))})
print(json.dumps({'ready': ready, 'targets': [{'job': t['labels'].get('job'), 'health': t['health']} for t in targets], 'rules': [{'name': r['name'], 'health': r['health']} for group in rules for r in group['rules']], 'queries': queries}))
`;
const telemetry = JSON.parse(run(["exec", api, "python", "-c", probe]));
check("Prometheus readiness", telemetry.ready);
check("Prometheus target inventory", ["prometheus", "cadvisor", "kodmod-api"].every(job => telemetry.targets.some(target => target.job === job)));
for (const target of telemetry.targets) check(`scrape ${target.job}`, target.health === "up", target.health);
check("alert rules loaded and evaluated", telemetry.rules.length >= 5 && telemetry.rules.every(rule => rule.health === "ok"), `${telemetry.rules.length} rules`);
const linuxHost = telemetry.targets.some(target => target.job === "node-exporter");
for (const panel of telemetry.queries) {
  const hostOnly = /\bnode_/.test(panel.expression);
  if (hostOnly && !linuxHost && process.platform === "win32") {
    console.log(`SKIP ${panel.title}: Linux host exporter is enabled on the VPS.`);
  } else {
    check(`dashboard ${panel.title}`, panel.status === "success" && panel.series > 0, `${panel.series} series`);
  }
}

// Credentials remain in process memory and are never printed or sent to a file.
const username = run(["exec", grafana, "printenv", "GF_SECURITY_ADMIN_USER"]);
const password = run(["exec", grafana, "printenv", "GF_SECURITY_ADMIN_PASSWORD"]);
const grafanaPorts = JSON.parse(run(["inspect", "--format", "{{json .NetworkSettings.Ports}}", grafana]));
const published = grafanaPorts["3000/tcp"]?.[0];
if (!published) throw new Error("Grafana must have a local published port for this host check.");
const grafanaOrigin = process.env.GRAFANA_BASE_URL || `http://127.0.0.1:${published.HostPort}`;
const getGrafana = async path => {
  const response = await fetch(grafanaOrigin + path, {
    headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Grafana ${path} returned HTTP ${response.status}.`);
  return response.json();
};
const health = await getGrafana("/api/health");
check("Grafana database", health.database === "ok");
const datasource = await getGrafana("/api/datasources/uid/prometheus");
check("provisioned Prometheus datasource", datasource.type === "prometheus" && datasource.url === "http://prometheus:9090" && datasource.isDefault);
const datasourceHealth = await getGrafana("/api/datasources/uid/prometheus/health");
check("Grafana to Prometheus connection", datasourceHealth.status === "OK", datasourceHealth.message);
const saved = await getGrafana(`/api/dashboards/uid/${dashboard.uid}`);
check("provisioned KODMOD dashboard", saved.meta?.provisioned && saved.dashboard?.panels?.length === dashboard.panels.length, `${dashboard.panels.length} panels`);

if (checks.some(item => !item.ok)) process.exitCode = 1;
console.log(`${checks.filter(item => item.ok).length}/${checks.length} monitoring checks passed.`);

import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

const boundary = { role: "teacher", calls: [], refreshes: [] };
globalThis.kodmodConceptBoundary = boundary;
const stubs = new Map([
  ["next/cache", "export const revalidatePath = (...args) => globalThis.kodmodConceptBoundary.refreshes.push(args);"],
  ["@/lib/session", `export async function requireSession(role) { if (role !== globalThis.kodmodConceptBoundary.role) throw new Error("Role denied"); return { token: "fixture-teacher" }; }`],
  ["@/lib/server-api", `export class BackendError extends Error {};
    export async function backend(path, token, options) { const b = globalThis.kodmodConceptBoundary; b.calls.push({ path, token, options }); if (b.error) throw new BackendError(b.error); return {}; }`],
]);
const hooks = registerHooks({
  resolve(specifier, context, next) {
    return stubs.has(specifier) ? { shortCircuit: true, url: "data:text/javascript," + encodeURIComponent(stubs.get(specifier)) } : next(specifier, context);
  },
  load(url, context, next) {
    return url.endsWith(".ts") ? { shortCircuit: true, format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText } : next(url, context);
  },
});
const actions = await import("../src/app/concept-actions.ts");
hooks.deregister();
const room = "10000000-0000-4000-8000-000000000001", material = "20000000-0000-4000-8000-000000000001";
const concept = "30000000-0000-4000-8000-000000000001";
const form = entries => { const data = new FormData(); for (const [key, value] of entries) data.append(key, value); return data; };
const selection = () => form([["content_version", "2"], ["mapping_version", "1"], ["concept_ids", concept], ["primary_concept_id", concept], ["approved_by", "forged"]]);

test("review passes exact versions and authenticated identity without browser ownership", async () => {
  const result = await actions.approveMaterialConcepts(room, material, {}, selection());
  assert.ok(result.success);
  const call = boundary.calls.at(-1);
  assert.equal(call.path, `/classes/${room}/materials/${material}/concepts`);
  assert.equal(call.token, "fixture-teacher");
  assert.deepEqual(JSON.parse(call.options.body), { expected_content_version: 2, expected_mapping_version: 1, concept_ids: [concept], primary_concept_id: concept });
});

test("invalid versions, duplicate concepts and unselected primary are rejected before writes", async () => {
  const start = boundary.calls.length;
  for (const change of [d => d.set("content_version", "0"), d => d.set("mapping_version", "NaN"), d => d.append("concept_ids", concept), d => d.set("primary_concept_id", material)]) {
    const data = selection(); change(data);
    assert.ok((await actions.approveMaterialConcepts(room, material, {}, data)).error);
  }
  assert.equal(boundary.calls.length, start);
});

test("students cannot invoke teacher actions and stale review failures are surfaced", async () => {
  boundary.role = "student";
  await assert.rejects(actions.approveMaterialConcepts(room, material, {}, selection()), /Role denied/);
  boundary.role = "teacher";
  boundary.error = "Materi sudah berubah. Muat ulang.";
  assert.match((await actions.approveMaterialConcepts(room, material, {}, selection())).error, /sudah berubah/);
  boundary.error = null;
});

test("concept creation includes its canonical subject and does not approve a material", async () => {
  const result = await actions.createCurriculumConcept(room, {}, form([["name", "Pecahan"], ["slug", "pecahan"]]));
  assert.ok(result.success);
  const call = boundary.calls.at(-1);
  assert.equal(JSON.parse(call.options.body).subject_id, room);
  assert.equal(call.path, `/subjects/${room}/concepts`);
});

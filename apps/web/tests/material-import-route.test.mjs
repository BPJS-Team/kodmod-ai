import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
const boundary = { current: null, calls: [] };
globalThis.kodmodMaterialBoundary = boundary;
const stubs = new Map([
  ["server-only", "export {};"],
  ["next/server", `export class NextResponse extends Response { static json(value, init) { return new NextResponse(JSON.stringify(value), { ...init, headers: { "Content-Type": "application/json" } }); } }`],
  ["@/lib/session", "export const session = async () => globalThis.kodmodMaterialBoundary.current;"],
]);
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (stubs.has(specifier)) return { shortCircuit: true, url: "data:text/javascript," + encodeURIComponent(stubs.get(specifier)) };
    if (specifier.startsWith("@/")) return { shortCircuit: true, url: new URL("../src/" + specifier.slice(2) + (/\.(ts|mjs)$/.test(specifier) ? "" : ".ts"), import.meta.url).href };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts")) return { shortCircuit: true, format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});
const { POST } = await import("../src/app/api/classes/[classId]/materials/import/route.ts");
hooks.deregister();
const params = { params: Promise.resolve({ classId: "10000000-0000-4000-8000-000000000001" }) };
function request(first, last) {
  const body = new FormData();
  body.set("file", new File(["fixture-only-pdf-bytes"], "buku.pdf", { type: "application/pdf" }));
  if (first !== undefined) body.set("first_page", first);
  if (last !== undefined) body.set("last_page", last);
  body.set("published", "true"); body.set("teacher_id", "someone-else");
  return new Request("http://localhost:3100/api/classes/test/materials/import", { method: "POST", body });
}

test("material import authenticates before parsing files", async () => {
  boundary.current = null;
  let parsed = false;
  const response = await POST({ formData() { parsed = true; throw new Error("must not parse"); } }, params);
  assert.equal(response.status, 401); assert.equal(parsed, false);
  boundary.current = { token: "test-token", user: { role: "student" } };
  assert.equal((await POST(request("12", "23"), params)).status, 403);
});

test("proxy forwards only teacher document and selected page boundaries", async () => {
  boundary.current = { token: "test-token", user: { role: "teacher" } };
  globalThis.fetch = async (url, options) => {
    boundary.calls.push([url, options]);
    return Response.json({ content: "Reviewed page", preview_type: "material" });
  };
  const response = await POST(request("12", "23"), params);
  assert.equal(response.status, 200);
  const payload = boundary.calls.at(-1)[1].body;
  assert.equal(payload.get("first_page"), "12"); assert.equal(payload.get("last_page"), "23");
  assert.equal(payload.get("file").name, "buku.pdf");
  assert.equal(payload.has("published"), false); assert.equal(payload.has("teacher_id"), false);
});

test("invalid ranges are rejected before any upstream import", async () => {
  boundary.calls = [];
  for (const [first, last] of [["12", undefined], ["23", "12"], ["1", "151"], ["501", "502"]])
    assert.equal((await POST(request(first, last), params)).status, 400);
  assert.equal(boundary.calls.length, 0);
});

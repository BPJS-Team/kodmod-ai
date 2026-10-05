import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const boundary = { user: null, patches: [], cookies: [] };
globalThis.kodmodLanguageBoundary = boundary;
const stubs = new Map([
  ['server-only', 'export {};'],
  ['next/server', `export class NextResponse extends Response {
    constructor(body, init) { super(body, init); this.cookies = { set(...args) { globalThis.kodmodLanguageBoundary.cookies.push(args); } }; }
    static json(value, init) { return new NextResponse(JSON.stringify(value), { ...init, headers: { 'Content-Type': 'application/json' } }); }
  }`],
  ['@/lib/session', `export async function session() { return globalThis.kodmodLanguageBoundary.user; }`],
  ['@/lib/server-api', `export class BackendError extends Error {}
    export async function backend(...args) { globalThis.kodmodLanguageBoundary.patches.push(args); return {}; }`],
]);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (stubs.has(specifier)) return { url: 'data:text/javascript,' + encodeURIComponent(stubs.get(specifier)), shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL('../src/' + specifier.slice(2) + (/\.(mjs|ts)$/.test(specifier) ? '' : '.ts'), import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { POST } = await import('../src/app/api/preferences/language/route.ts');
hooks.deregister();
function request(origin = 'http://localhost:3100', language = 'en', protocol = 'http') {
  return new Request('http://0.0.0.0:3000/api/preferences/language', { method: 'POST', headers: { Host: 'localhost:3100', Origin: origin, 'X-Forwarded-Proto': protocol, 'Content-Type': 'application/json' }, body: JSON.stringify({ language }) });
}
test('language saves through the public Docker Host even when Next uses an internal request URL', async () => {
  boundary.user = null; boundary.cookies = [];
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal(boundary.cookies[0][0], 'kodmod_language');
  assert.equal(boundary.cookies[0][1], 'en');
});
test('language rejects foreign Origin, mismatched protocol and opaque Origin', async () => {
  for (const origin of ['http://outside.example', 'https://localhost:3100', 'null']) assert.equal((await POST(request(origin))).status, 403);
});
test('unsupported language is rejected before persistence', async () => {
  boundary.patches = [];
  assert.equal((await POST(request('http://localhost:3100', 'fr'))).status, 400);
  assert.equal(boundary.patches.length, 0);
});
test('signed-in language persists to the same account and cookie', async () => {
  boundary.user = { token: 'fixture-language-token', user: { id: 'student-1' } }; boundary.patches = [];
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal(boundary.patches[0][0], '/auth/me');
  assert.equal(boundary.patches[0][1], 'fixture-language-token');
  assert.deepEqual(JSON.parse(boundary.patches[0][2].body), { preferred_language: 'en' });
});

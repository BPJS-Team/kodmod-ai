import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const boundary = { open: true, callbacks: new Set(), calls: [] };
globalThis.kodmodDialogBoundary = boundary;
globalThis.document = { documentElement: { lang: 'en' }, querySelector: () => boundary.open ? {} : null, body: {} };
globalThis.window = { matchMedia: () => ({ matches: true }) };
globalThis.MutationObserver = class {
  constructor(callback) { this.callback = callback; }
  observe() { boundary.callbacks.add(this.callback); }
  disconnect() { boundary.callbacks.delete(this.callback); }
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'sweetalert2') return { url: 'data:text/javascript,' + encodeURIComponent(`export default { isVisible: () => false, mixin: () => ({ fire: async (options) => { globalThis.kodmodDialogBoundary.calls.push(options); return { isConfirmed: true }; } }) };`), shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL('../src/' + specifier.slice(2), import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { notifyResult, confirmAction } = await import('../src/lib/dialogs.ts');
hooks.deregister();
test('pending action feedback waits for native voice settings to close', async () => {
  boundary.open = true; boundary.calls = [];
  const notification = notifyResult('Akun berhasil dibuat. Selamat memulai perjalanan bersama KODMOD.');
  await Promise.resolve();
  assert.equal(boundary.calls.length, 0, 'Swal must never open behind a native modal');
  boundary.open = false;
  for (const callback of boundary.callbacks) callback();
  await notification;
  assert.equal(boundary.calls.length, 1);
  assert.equal(boundary.calls[0].titleText, 'Done');
  assert.equal(boundary.callbacks.size, 0);
});
test('a confirmation also waits until the native dialog releases the top layer', async () => {
  boundary.open = true; boundary.calls = [];
  const confirmation = confirmAction({ title: 'Keluar dari akun?', text: 'Anda dapat masuk kembali kapan saja.' });
  await Promise.resolve();
  assert.equal(boundary.calls.length, 0);
  boundary.open = false;
  for (const callback of boundary.callbacks) callback();
  assert.equal(await confirmation, true);
});

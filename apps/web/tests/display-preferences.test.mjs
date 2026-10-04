import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VOICE_SETTINGS, parseVoiceSettings, parseDisplaySettings, writeVoiceSettings, DISPLAY_COOKIE } from "../src/lib/speech-preferences.mjs";

test("legacy low vision settings migrate to a bounded font scale without disabling instruction audio", () => {
  const previous = parseVoiceSettings(JSON.stringify({ engine: "app", menuEnabled: false, lowVision: true }));
  assert.equal(previous.fontScale, "large");
  assert.equal(previous.tutorEnabled, true);
  assert.equal(previous.menuEnabled, false);
  for (const value of [null, "tampered", { fontScale: "9000%", highContrast: "yes" }])
    assert.deepEqual(parseDisplaySettings(value), { fontScale: "default", lowVision: false, highContrast: false, spacious: false, reducedMotion: false });
});

test("all display preferences persist independently of menu and Tutor switches", t => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const previousDocument = globalThis.document, previousLocation = globalThis.location;
  let stored = "";
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { setItem: (_, value) => { stored = value; } } });
  globalThis.document = { cookie: "" }; globalThis.location = { protocol: "https:" };
  t.after(() => { if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor); else delete globalThis.localStorage; if (previousDocument) globalThis.document = previousDocument; else delete globalThis.document; if (previousLocation) globalThis.location = previousLocation; else delete globalThis.location; });
  assert.equal(writeVoiceSettings({ ...DEFAULT_VOICE_SETTINGS, fontScale: "extra-large", highContrast: true, spacious: true, reducedMotion: true, menuEnabled: false }), true);
  const result = parseVoiceSettings(stored);
  assert.equal(result.tutorEnabled, true); assert.equal(result.menuEnabled, false);
  assert.equal(result.fontScale, "extra-large"); assert.equal(result.highContrast, true);
  const cookie = globalThis.document.cookie;
  assert.ok(cookie.startsWith(`${DISPLAY_COOKIE}=`)); assert.match(cookie, /SameSite=Lax; Secure/);
  assert.ok(!cookie.includes("engine") && !cookie.includes("token"), "Display cookie must not carry account or voice identity");
});

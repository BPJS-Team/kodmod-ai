import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReadingPreferences } from "../src/lib/reading-preferences.ts";

test("missing or malformed preferences use readable defaults", () => {
  for (const input of [
    undefined,
    "",
    "{",
    "null",
    "[]",
    '{"size":"999","contrast":"yes"}',
  ]) {
    assert.deepEqual(parseReadingPreferences(input), {
      size: "20",
      contrast: false,
      spacing: "1.95",
    });
  }
});
test("valid settings round trip and unsupported values cannot enter styles", () => {
  const settings = { size: "28", contrast: true, spacing: "2.3" };
  assert.deepEqual(parseReadingPreferences(JSON.stringify(settings)), settings);
  assert.deepEqual(
    parseReadingPreferences(
      '{"size":"calc(1px)","contrast":true,"spacing":"url(x)"}',
    ),
    { size: "20", contrast: true, spacing: "1.95" },
  );
});

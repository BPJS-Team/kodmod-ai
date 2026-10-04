import assert from "node:assert/strict";
import test from "node:test";
import { createSpeechCoordinator } from "../src/lib/speech-output.mjs";

function setup(loadAudio) {
  const played = [], stopped = [];
  const coordinator = createSpeechCoordinator({ loadAudio, makeAudio: (blob) => ({
    play: async () => played.push(blob), pause() {}, resume() {},
    stop: () => stopped.push(blob), dispose() {},
  }), speakDevice: () => { throw new Error("Unavailable"); } });
  return { coordinator, played, stopped };
}

test("stop rejects playback that arrives after an outstanding request", async () => {
  let resolve;
  const { coordinator, played } = setup(() => new Promise(r => { resolve = r; }));
  const request = coordinator.play({ owner: "a", text: "First", engine: "app", language: "id" });
  coordinator.stop();
  resolve("first");
  await request;
  assert.deepEqual(played, []);
  assert.equal(coordinator.getState().status, "idle");
});

test("new output interrupts previous output and old owners cannot stop new output", async () => {
  const { coordinator, played, stopped } = setup(async request => request.text);
  await coordinator.play({ owner: "a", text: "First", engine: "app", language: "id" });
  await coordinator.play({ owner: "b", text: "Second", engine: "app", language: "en" });
  coordinator.stop("a");
  assert.deepEqual(played, ["First", "Second"]);
  assert.deepEqual(stopped, ["First"]);
  assert.equal(coordinator.getState().owner, "b");
});

test("autoplay rejection settles in a state with replay available", async () => {
  const coordinator = createSpeechCoordinator({ loadAudio: async () => "audio", makeAudio: () => ({
    play: async () => { throw Object.assign(new Error("blocked"), { name: "NotAllowedError" }); },
    stop() {}, dispose() {}, pause() {}, resume() {},
  }), speakDevice() { throw new Error("Unavailable"); } });
  await coordinator.play({ owner: "tutor", text: "Answer", language: "id", engine: "app" });
  assert.equal(coordinator.getState().status, "blocked");
});

test("audio that finishes before its start promise resolves remains finished", async () => {
  const coordinator = createSpeechCoordinator({ loadAudio: async () => "audio", makeAudio: (_blob, ended) => ({
    play: async () => ended(), stop() {}, dispose() {}, pause() {}, resume() {},
  }), speakDevice() { throw new Error("Unavailable"); } });
  await coordinator.play({ owner: "guide", text: "Short guide", language: "id", engine: "app" });
  assert.equal(coordinator.getState().status, "idle");
});

test("an output error after playback starts releases the audio and offers text", async () => {
  let fail, stopped = false;
  const coordinator = createSpeechCoordinator({ loadAudio: async () => "audio", makeAudio: (_blob, _ended, failed) => {
    fail = failed;
    return { play: async () => {}, stop() { stopped = true; }, dispose() {}, pause() {}, resume() {} };
  }, speakDevice() { throw new Error("Unavailable"); } });
  await coordinator.play({ owner: "tutor", text: "Answer", language: "en", engine: "app" });
  fail(new Error("Audio device disconnected"));
  assert.equal(coordinator.getState().status, "error");
  assert.equal(stopped, true);
  assert.match(coordinator.getState().message, /teks/);
});

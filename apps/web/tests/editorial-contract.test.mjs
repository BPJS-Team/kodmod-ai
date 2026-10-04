import assert from "node:assert/strict";
import test from "node:test";
import {
  editorialRoute,
  assignmentAvailability,
  finalIntent,
  sameEditorialOrigin,
  isAssignmentReceipt,
} from "../src/lib/editorial-contract.mjs";

const id = "4e0b9d45-ecf5-4d89-96f0-1b1a3de4a091";

test("review routes admit staff while assignment results remain teacher-only", () => {
  assert.deepEqual(
    editorialRoute("POST", ["teacher", "quizzes", id, "approve"]).roles,
    ["teacher", "admin"],
  );
  assert.deepEqual(
    editorialRoute("GET", ["teacher", "assignments", id, "results"]).roles,
    ["teacher"],
  );
  assert.deepEqual(
    editorialRoute("PUT", ["student", "assignments", id, "answers", id]).roles,
    ["student"],
  );
});

test("proxy rejects unknown methods, malformed IDs and traversal", () => {
  for (const [method, path] of [
    ["DELETE", ["teacher", "quizzes", id]],
    ["GET", ["..", "auth", "me"]],
    ["GET", ["teacher", "quizzes", "bad/id"]],
    ["POST", ["student", "assignments", id, "result"]],
  ]) {
    assert.equal(editorialRoute(method, path), null);
  }
});

test("AI question proposals require the teacher role and remain a separate action", () => {
  assert.deepEqual(editorialRoute("POST", ["teacher", "quizzes", "propose"]).roles, ["teacher"]);
  assert.equal(editorialRoute("GET", ["teacher", "quizzes", "propose"]), null);
});

test("final retry freezes both key and expected revision", () => {
  const first = finalIntent(null, 4, "key-1");
  assert.deepEqual(first, { key: "key-1", expected_revision: 4 });
  assert.equal(finalIntent(first, 7, "key-2"), first);
});

test("a final receipt must match the attempt before the retry intent is cleared", () => {
  const receipt = {
    attempt_id: id,
    assignment_id: id,
    score: 100,
    correct_count: 1,
    total_questions: 1,
    submitted_at: "2026-10-04T12:00:00Z",
    feedback_released: true,
    review: [
      {
        question_id: id,
        prompt: "Berapa dua ditambah dua?",
        options: [
          { id: "a", label: "Empat" },
          { id: "b", label: "Lima" },
        ],
        option_id: "a",
        correct_option_id: "a",
        is_correct: true,
        explanation: "Dua ditambah dua adalah empat.",
      },
    ],
  };
  assert.equal(isAssignmentReceipt(receipt, id, id), true);
  assert.equal(
    isAssignmentReceipt(
      { ...receipt, feedback_released: false, review: [] },
      id,
      id,
    ),
    true,
  );
  for (const invalid of [
    null,
    { ok: true },
    { ...receipt, attempt_id: "a-different-attempt" },
    { ...receipt, score: 101 },
    { ...receipt, correct_count: 2 },
    { ...receipt, submitted_at: "invalid" },
    { ...receipt, review: [{}] },
    { ...receipt, feedback_released: false },
  ]) {
    assert.equal(isAssignmentReceipt(invalid, id, id), false);
  }
});

test("origin checks use the public Host while standalone request URLs may use an internal host", () => {
  assert.equal(
    sameEditorialOrigin("http://127.0.0.1:3118", "127.0.0.1:3118", "http:"),
    true,
  );
  assert.equal(
    sameEditorialOrigin(
      "https://learn.example.com",
      "learn.example.com",
      "https:",
    ),
    true,
  );
  assert.equal(
    sameEditorialOrigin(
      "https://outside.example",
      "learn.example.com",
      "https:",
    ),
    false,
  );
  assert.equal(
    sameEditorialOrigin(
      "http://learn.example.com",
      "learn.example.com",
      "https:",
    ),
    false,
  );
  assert.equal(
    sameEditorialOrigin("null", "learn.example.com", "https:"),
    false,
  );
});

test("assignment availability preserves completed results and scheduled barriers", () => {
  const base = {
    is_closed: false,
    opens_at: null,
    due_at: null,
    attempt_state: null,
  };
  const now = Date.parse("2026-10-04T12:00:00Z");
  assert.equal(assignmentAvailability(base, now), "open");
  assert.equal(
    assignmentAvailability({ ...base, opens_at: "2026-10-05T00:00:00Z" }, now),
    "scheduled",
  );
  assert.equal(
    assignmentAvailability({ ...base, due_at: "2026-10-03T00:00:00Z" }, now),
    "expired",
  );
  assert.equal(
    assignmentAvailability({ ...base, is_closed: true }, now),
    "closed",
  );
  assert.equal(
    assignmentAvailability(
      { ...base, is_closed: true, attempt_state: "submitted" },
      now,
    ),
    "submitted",
  );
});

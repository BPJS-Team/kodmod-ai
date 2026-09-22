import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearningFixture } from "./learning-fixture.mjs";

test("student analytics returns progress and spoken summary only to students", () => {
  const fixture = createLearningFixture();
  const student = { id: "test-student", role: "student" };
  const request = (path, user = student) => {
    let response;
    assert.equal(
      fixture(
        { method: "GET" },
        new URL(path, "http://fixture"),
        {},
        user,
        (status, data) => {
          response = { status, data };
        },
      ),
      true,
    );
    return response;
  };

  const progress = request("/analytics/me?window=week");
  assert.equal(progress.status, 200);
  assert.equal(progress.data.window, "week");
  assert.equal(progress.data.student_id, student.id);
  assert.ok(Array.isArray(progress.data.weak_concepts));
  assert.ok(Array.isArray(progress.data.active_recommendations));

  const spoken = request("/analytics/me/spoken?window=month");
  assert.equal(spoken.status, 200);
  assert.equal(spoken.data.summary.window, "month");
  assert.match(spoken.data.spoken, /progress/i);

  assert.equal(request("/analytics/me", { id: "test-teacher", role: "teacher" }).status, 403);
});

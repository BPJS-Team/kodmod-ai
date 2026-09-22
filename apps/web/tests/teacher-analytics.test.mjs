import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearningFixture } from "./learning-fixture.mjs";

test("teacher analytics exposes cohort, student detail, and transcript views", () => {
  const fixture = createLearningFixture();
  const teacher = { id: "test-teacher", role: "teacher" };
  const request = (path, method = "GET", body = {}, user = teacher) => {
    let response;
    assert.equal(
      fixture(
        { method },
        new URL(path, "http://fixture"),
        body,
        user,
        (status, data) => {
          response = { status, data };
        },
      ),
      true,
    );
    return response;
  };

  const cohort = request("/teacher/students?window=week");
  assert.equal(cohort.status, 200);
  assert.equal(cohort.data.n_students, 2);
  assert.equal(cohort.data.students.length, 2);

  const detail = request("/teacher/students/student-1?window=month");
  assert.equal(detail.status, 200);
  assert.equal(detail.data.account.id, "student-1");
  assert.equal(detail.data.analytics.window, "month");
  assert.match(detail.data.teacher_summary, /perlu perhatian/i);

  const sessions = request("/teacher/students/student-1/sessions");
  assert.equal(sessions.status, 200);
  assert.ok(sessions.data.length);
  const transcript = request(`/teacher/sessions/${sessions.data[0].id}`);
  assert.equal(transcript.status, 200);
  assert.equal(transcript.data.turns.length, 2);

  assert.equal(request("/teacher/students?window=week", "GET", {}, { id: "student-1", role: "student" }).status, 403);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearningFixture } from "./learning-fixture.mjs";

test("student demo supports library, reader, bookmark and completion reset", () => {
  const fixture = createLearningFixture();
  const student = { id: "test-student", role: "student" };
  function request(path, method = "GET", body = {}, user = student) {
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
  }
  const library = request("/classes/student/materials");
  assert.equal(library.data.length, 3);
  const material = library.data[0];
  const path = `/classes/${material.class_id}/materials/${material.id}`;
  assert.ok(request(path).data.content.includes("Pecahan"));
  assert.equal(
    request(path + "/progress", "PATCH", { completed: true, bookmarked: true })
      .data.completed,
    true,
  );
  assert.equal(
    request(path + "/progress", "PATCH", { completed: false }).data.bookmarked,
    true,
  );
  assert.equal(
    request(path + "/progress", "PATCH", { completed: false }).data
      .completed_at,
    null,
  );
  assert.equal(
    request(path + "/progress", "PATCH", { student_id: "other" }).status,
    422,
  );
  assert.equal(
    request(path, "GET", {}, { id: "outsider", role: "student" }).status,
    404,
  );
  assert.deepEqual(
    request(
      "/classes/student/materials",
      "GET",
      {},
      { id: "outsider", role: "student" },
    ).data,
    [],
  );
  assert.equal(
    request(
      path + "/progress",
      "PATCH",
      { completed: true },
      { id: "test-teacher", role: "teacher" },
    ).status,
    403,
  );
  assert.equal(
    request(
      "/classes/10000000-0000-4000-8000-000000000002/materials/" + material.id,
    ).status,
    404,
  );
});

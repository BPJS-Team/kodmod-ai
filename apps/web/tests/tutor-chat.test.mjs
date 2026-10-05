import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearningFixture } from "./learning-fixture.mjs";

test("student tutor chat keeps a session history and can remove it", () => {
  const fixture = createLearningFixture();
  const student = { id: "test-student", role: "student" };
  const request = (path, method = "GET", body = {}, user = student) => {
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

  assert.deepEqual(request("/chat/sessions").data, []);
  const sent = request("/chat/message", "POST", {
    text: "Tolong jelaskan pecahan dengan contoh sederhana.",
  });
  assert.equal(sent.status, 200);
  assert.match(sent.data.text, /pecahan/i);
  assert.ok(sent.data.session_id);

  const sessions = request("/chat/sessions");
  assert.equal(sessions.data.length, 1);
  assert.equal(sessions.data[0].id, sent.data.session_id);

  const detail = request(`/chat/sessions/${sent.data.session_id}`);
  assert.equal(detail.data.turns.length, 2);
  assert.equal(detail.data.turns[0].role, "student");
  assert.equal(detail.data.turns[1].role, "tutor");
  assert.equal(detail.data.ended_at, null);

  assert.equal(request(`/chat/sessions/${sent.data.session_id}/end`, "POST").status, 204);
  assert.equal(request(`/chat/sessions/${sent.data.session_id}/end`, "POST").status, 404);
  assert.ok(request(`/chat/sessions/${sent.data.session_id}`).data.ended_at);

  assert.equal(
    request("/chat/sessions", "GET", {}, { id: "test-teacher", role: "teacher" }).status,
    403,
  );
  assert.equal(request(`/chat/sessions/${sent.data.session_id}`, "DELETE").status, 204);
  assert.deepEqual(request("/chat/sessions").data, []);
});

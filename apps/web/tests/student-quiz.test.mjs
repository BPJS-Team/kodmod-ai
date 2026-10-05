import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearningFixture } from "./learning-fixture.mjs";

test("student quiz starts with a question and returns feedback for answers", () => {
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

  const started = request("/quiz/start", "POST", { n_questions: 2, difficulty: "easy" });
  assert.equal(started.status, 200);
  assert.equal(started.data.total_questions, 2);
  assert.ok(started.data.first_question.question_id);

  const answer = request("/quiz/submit", "POST", {
    quiz_session_id: started.data.quiz_session_id,
    question_id: started.data.first_question.question_id,
    submission_id: "50000000-0000-4000-8000-000000000001",
    student_answer: "A",
  });
  assert.equal(answer.status, 200);
  assert.equal(typeof answer.data.score, "number");
  assert.equal(answer.data.is_correct, true);
  assert.ok(answer.data.next_question);

  assert.equal(
    request(
      "/quiz/start",
      "POST",
      { n_questions: 1 },
      { id: "test-teacher", role: "teacher" },
    ).status,
    403,
  );
});

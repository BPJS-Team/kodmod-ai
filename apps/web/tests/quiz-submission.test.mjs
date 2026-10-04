import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseQuizSubmission,
  createQuizSubmissionId,
  prepareQuizSubmission,
  quizProgress,
  QuizSubmissionError,
  readQuizSubmissionResponse,
  submissionFailureAction,
} from "../src/lib/quiz-submission.mjs";

const sessionId = "40000000-0000-4000-8000-000000000001";
const submissionId = "50000000-0000-4000-8000-000000000001";
const input = {
  quiz_session_id: sessionId,
  question_id: "60000000-0000-4000-8000-000000000001",
  student_answer: "  A  ",
  response_latency_ms: 1200,
};
const question = {
  question_id: "60000000-0000-4000-8000-000000000001",
  order_index: 0,
  question: "Apa itu satu per empat?",
  question_type: "mcq",
  options: ["Satu bagian", "Dua bagian"],
  difficulty: "easy",
};
const result = {
  score: 0,
  is_correct: false,
  feedback: "Coba sekali lagi.",
  next_question: question,
  quiz_complete: false,
  final_summary: null,
  cumulative_score: 0,
};

test("a UUID can be generated on a local device browser without randomUUID", () => {
  assert.equal(createQuizSubmissionId({ getRandomValues: (bytes) => bytes.fill(0) }), "00000000-0000-4000-8000-000000000000");
  assert.equal(createQuizSubmissionId({ randomUUID: () => submissionId }), submissionId);
});

test("submission boundary preserves a UUID and trims the answer without forwarding actor fields", () => {
  assert.deepEqual(parseQuizSubmission({ ...input, submission_id: submissionId, student_id: "another-student" }), {
    submission_id: submissionId,
    quiz_session_id: sessionId,
    question_id: "60000000-0000-4000-8000-000000000001",
    student_answer: "A",
    response_latency_ms: 1200,
  });
});

test("submission boundary rejects missing IDs, empty answers, and invalid latency", () => {
  for (const patch of [
    { submission_id: undefined },
    { submission_id: "not-a-uuid" },
    { quiz_session_id: "not-a-uuid" },
    { question_id: "not-a-uuid" },
    { student_answer: " " },
    { student_answer: "a".repeat(4001) },
    { response_latency_ms: -1 },
    { response_latency_ms: 1.5 },
    { response_latency_ms: 3600001 },
  ]) {
    assert.throws(() => parseQuizSubmission({ ...input, submission_id: submissionId, ...patch }));
  }
  assert.equal(parseQuizSubmission({ ...input, submission_id: submissionId, response_latency_ms: 3600000 }).response_latency_ms, 3600000);
});

test("retry after an ambiguous failure reuses the exact frozen ID, answer, and original latency", () => {
  const pending = prepareQuizSubmission(null, input, () => submissionId);
  const retried = prepareQuizSubmission(pending, { ...input, response_latency_ms: 9000 }, () => "unused-id");
  assert.strictEqual(retried, pending);
  assert.equal(retried.submission_id, submissionId);
  assert.equal(retried.response_latency_ms, 1200);
  assert.equal(retried.student_answer, "A");
  assert.equal(Object.isFrozen(retried), true);
});

test("a pending submission cannot reuse its ID for a changed answer or question", () => {
  const pending = prepareQuizSubmission(null, input, () => submissionId);
  assert.throws(() => prepareQuizSubmission(pending, { ...input, student_answer: "B" }));
  assert.throws(() => prepareQuizSubmission(pending, { ...input, question_id: "question-two" }));
  assert.throws(() => prepareQuizSubmission(pending, { ...input, quiz_session_id: "40000000-0000-4000-8000-000000000002" }));
});

test("an intentional remediation try receives a new ID once the prior result is accepted", () => {
  const first = prepareQuizSubmission(null, input, () => submissionId);
  const second = prepareQuizSubmission(null, { ...input, student_answer: "B" }, () => "50000000-0000-4000-8000-000000000002");
  assert.notEqual(first.submission_id, second.submission_id);
  assert.equal(second.student_answer, "B");
});

test("remediation keeps the same displayed question number and advancement uses the server order", () => {
  assert.deepEqual(quizProgress(question, 3), { questionNumber: 1, answeredQuestions: 0 });
  assert.deepEqual(quizProgress({ ...question, order_index: 0 }, 3), { questionNumber: 1, answeredQuestions: 0 });
  assert.deepEqual(quizProgress({ ...question, order_index: 1 }, 3), { questionNumber: 2, answeredQuestions: 1 });
  assert.deepEqual(quizProgress({ ...question, order_index: 2 }, 3, true), { questionNumber: 3, answeredQuestions: 3 });
});

test("known unaccepted validation allows editing while conflicts require a new session", () => {
  assert.equal(submissionFailureAction(new QuizSubmissionError("Invalid", 422)), "edit");
  assert.equal(submissionFailureAction(new QuizSubmissionError("Stale", 409)), "restart");
  assert.equal(submissionFailureAction(new QuizSubmissionError("Missing", 404)), "restart");
  assert.equal(submissionFailureAction(new QuizSubmissionError("Unavailable", 503)), "retry");
  assert.equal(submissionFailureAction(new TypeError("Network failed")), "retry");
});

test("malformed successful responses stay ambiguous instead of accepting an unknown result", async () => {
  const good = await readQuizSubmissionResponse(Response.json(result));
  assert.deepEqual(good, result);
  for (const body of [{}, { ...result, next_question: { ...question, order_index: -1 } }]) {
    await assert.rejects(readQuizSubmissionResponse(Response.json(body)), (error) => submissionFailureAction(error) === "retry");
  }
  await assert.rejects(readQuizSubmissionResponse(new Response("not-json", { status: 200 })), (error) => submissionFailureAction(error) === "retry");
  await assert.rejects(readQuizSubmissionResponse(Response.json({ message: "Periksa jawaban." }, { status: 422 })), (error) => error.message === "Periksa jawaban." && submissionFailureAction(error) === "edit");
});

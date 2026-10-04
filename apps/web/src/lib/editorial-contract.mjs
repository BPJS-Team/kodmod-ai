const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const teacher = ["teacher"],
  staff = ["teacher", "admin"],
  student = ["student"];

export function editorialRoute(method, parts) {
  const path = "/" + parts.join("/");
  const route = (roles) => ({ path, roles });
  if (
    parts.length === 1 &&
    ["quiz-reviews", "quiz-reviewers"].includes(parts[0]) &&
    method === "GET"
  )
    return route(staff);
  if (parts.length === 1 && parts[0] === "subjects" && method === "GET")
    return route(staff);
  if (parts.length === 1 && parts[0] === "subjects" && method === "POST")
    return route(teacher);
  if (parts[0] === "teacher" && parts[1] === "quizzes") {
    if (parts.length === 2 && ["GET", "POST"].includes(method))
      return route(teacher);
    if (!uuid.test(parts[2] || "")) return null;
    if (parts.length === 3 && method === "GET") return route(staff);
    if (parts.length === 3 && method === "PATCH") return route(teacher);
    if (parts.length === 4 && method === "POST") {
      if (["reviewer", "approve", "reject"].includes(parts[3]))
        return route(staff);
      if (["submit-review", "publish", "assignments"].includes(parts[3]))
        return route(teacher);
    }
  }
  if (
    parts[0] === "teacher" &&
    parts[1] === "assignments" &&
    uuid.test(parts[2] || "") &&
    parts.length === 4
  ) {
    if (parts[3] === "results" && method === "GET") return route(teacher);
    if (parts[3] === "close" && method === "POST") return route(teacher);
  }
  if (parts[0] === "student" && parts[1] === "assignments") {
    if (parts.length === 2 && method === "GET") return route(student);
    if (!uuid.test(parts[2] || "")) return null;
    if (parts.length === 3 && method === "GET") return route(student);
    if (
      parts.length === 4 &&
      ((["attempt", "result"].includes(parts[3]) && method === "GET") ||
        (["start", "submit"].includes(parts[3]) && method === "POST"))
    )
      return route(student);
    if (
      parts.length === 5 &&
      parts[3] === "answers" &&
      uuid.test(parts[4]) &&
      method === "PUT"
    )
      return route(student);
  }
  return null;
}

export function finalIntent(existing, revision, key) {
  return existing ?? { key, expected_revision: revision };
}

export function isAssignmentReceipt(value, attemptId, assignmentId) {
  if (!value || typeof value !== "object") return false;
  const validOption = (option) =>
    option && typeof option.id === "string" && typeof option.label === "string";
  const validReview = (review) =>
    review &&
    uuid.test(review.question_id || "") &&
    typeof review.prompt === "string" &&
    Array.isArray(review.options) &&
    review.options.length >= 2 &&
    review.options.every(validOption) &&
    review.options.some((option) => option.id === review.option_id) &&
    review.options.some((option) => option.id === review.correct_option_id) &&
    typeof review.is_correct === "boolean" &&
    typeof review.explanation === "string";
  return (
    value.attempt_id === attemptId &&
    value.assignment_id === assignmentId &&
    Number.isFinite(value.score) &&
    value.score >= 0 &&
    value.score <= 100 &&
    Number.isSafeInteger(value.total_questions) &&
    value.total_questions >= 1 &&
    Number.isSafeInteger(value.correct_count) &&
    value.correct_count >= 0 &&
    value.correct_count <= value.total_questions &&
    typeof value.submitted_at === "string" &&
    Number.isFinite(Date.parse(value.submitted_at)) &&
    typeof value.feedback_released === "boolean" &&
    Array.isArray(value.review) &&
    (value.feedback_released
      ? value.review.length === value.total_questions &&
        value.review.every(validReview)
      : value.review.length === 0)
  );
}

export function sameEditorialOrigin(origin, host, protocol) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host === host &&
      parsed.protocol === protocol
    );
  } catch {
    return false;
  }
}

export function assignmentAvailability(assignment, at = Date.now()) {
  if (assignment.attempt_state === "submitted") return "submitted";
  if (assignment.is_closed) return "closed";
  if (assignment.opens_at && Date.parse(assignment.opens_at) > at)
    return "scheduled";
  if (assignment.due_at && Date.parse(assignment.due_at) <= at)
    return "expired";
  return "open";
}

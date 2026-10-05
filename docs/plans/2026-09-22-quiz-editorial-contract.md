# KODMOD Editorial Quiz Contract

Status: **design boundary only**. This document defines the contract needed
before teacher-published quizzes are implemented. It does not add tables or
UI to the adaptive quiz flow.

## Why the current quiz runtime is not an assignment

`QuizSession` and `QuizQuestion` are runtime records created when a student
starts `/quiz/start`. Questions are generated from the learning graph, owned
by that student session, and immediately consumed by `/quiz/submit`. A teacher
cannot review, version, publish, assign, or re-open that content. Reusing those
rows for editorial content would mix authoring state with learner attempts and
make analytics, permissions, and retries ambiguous.

## Proposed ownership model

### `quiz_drafts`

| Field | Rule |
| --- | --- |
| `id` | UUID primary key |
| `owner_id` | Teacher who owns the draft; foreign key to `users` |
| `subject_id` | Subject/curriculum scope |
| `title` | Human-readable title, required |
| `description` | Optional teacher instructions |
| `status` | `draft`, `in_review`, `approved`, `archived` |
| `version` | Monotonic integer, starts at 1 |
| `created_at`, `updated_at` | UTC timestamps |

### `quiz_draft_versions`

Each saved revision is immutable after review begins. It stores a snapshot of
the ordered question definitions, rubric metadata, accessibility narration,
and the author who created the revision. A version has `draft_id`, `version`,
`status` (`draft`, `submitted`, `approved`, `rejected`, `published`), and an
optional reviewer plus review note.

### `quiz_draft_questions`

Questions belong to one version and keep a stable `order_index`. Required
fields are `question_type`, `prompt`, `options`, `correct_answer`,
`explanation`, `concept_id`, and `difficulty`. The API must validate that the
answer is present and that MCQ options are non-empty before submission.

### `quiz_assignments`

An assignment connects one published version to a classroom or an explicit
student roster. It owns `assigned_by`, `class_id` or `student_id`, a status
(`scheduled`, `open`, `closed`, `archived`), optional `opens_at`/`due_at`, and
the published version id. Published versions are immutable; editing creates a
new version and never changes an existing learner attempt.

## State transitions

```text
draft -> in_review -> approved -> published -> archived
                   \-> rejected -> draft
```

- Only the owner can edit a `draft`.
- A reviewer or admin can approve or reject `in_review`.
- Only an approved version can be published or assigned.
- An assignment can move `scheduled -> open -> closed`; closing it does not
  delete attempts.
- Deleting a draft is soft deletion (`archived`) once it has an attempt or an
  audit event.

## API surface to add with the migration

- `POST /teacher/quizzes` and `GET /teacher/quizzes`
- `GET/PATCH /teacher/quizzes/{id}`
- `POST /teacher/quizzes/{id}/submit-review`
- `POST /teacher/quizzes/{id}/approve`, `/reject`, `/publish`
- `POST /teacher/quizzes/{id}/assignments`
- `GET /student/assignments` and `POST /student/assignments/{id}/start`
- `POST /student/assignments/{id}/submit`

All routes must derive the actor from the bearer session. A student must never
be able to select another student's assignment id, and a teacher can only
modify drafts they own or are explicitly reviewing.

## Migration and test gates

Before UI work begins:

1. Add an Alembic revision for all four tables, foreign keys, status checks,
   indexes on owner/class/student/status, and a uniqueness constraint on
   `(draft_id, version)`.
2. Add downgrade coverage and run `alembic upgrade head` against a clean test
   database. The current repository does not yet contain a usable migration
   chain for these editorial tables.
3. Add API tests for role ownership, every state transition, immutable
   published versions, assignment scoping, due dates, and duplicate submits.
4. Add contract tests proving adaptive `/quiz/start` remains independent from
   editorial drafts and that analytics can distinguish an assignment attempt
   from an adaptive session.
5. Add accessibility checks for spoken question text, keyboard review, and
   screen-reader labels before exposing the authoring UI.

Until these gates pass, the existing adaptive quiz remains the only supported
student quiz experience and must not be presented as teacher-published work.

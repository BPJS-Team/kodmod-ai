# KODMOD Technical Priorities Implementation Plan

> **For future implementation:** Execute milestones in dependency order in this workspace, use tests that reproduce the intended behavior, and commit each working milestone without trailers. The current turn is technical mapping. Unchecked items below are planned work, not shipped features.

**Goal:** Complete teacher assignments and trustworthy concept progress, add reviewed OCR imports, then apply the accessible shadcn UI to verified learning flows.

**Architecture:** Keep Next.js as the authenticated browser boundary and FastAPI as the authoritative data and assessment boundary. Separate editorial quiz versions and assignment attempts from adaptive LangGraph sessions. Keep classroom retrieval private; add reviewed concept and document provenance to that boundary rather than copying private chunks into the global curriculum.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, FastAPI, SQLAlchemy, Alembic, PostgreSQL/pgvector, Redis, LangChain, LangGraph, OpenAI, and ElevenLabs. shadcn and OCR dependencies are proposed additions, not installed in this milestone.

**Spec:** [Editorial quiz contract](../../plans/2026-09-22-quiz-editorial-contract.md), [completed material/Tutor milestone](../../plans/2026-10-04-learning-flow-milestone.md), and the user's 4 October request to map technical priorities before UI/UX. This document refines the older design contract; it does not claim that its proposed APIs exist.

## Status and evidence

Audit date: 4 October 2026. CodeGraph source exploration, two independent read-only audits, existing milestone reports, and a direct Docker service check were used. No application code, database schema, dependencies, or providers were changed during this mapping.

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| Teacher materials | PDF with native text, DOCX, TXT/Markdown preview; teacher edits and publishes; versioned classroom index and retry | Original-file lineage for classroom imports, scan OCR, page citations, durable jobs, concept mapping |
| Classroom Tutor | Student membership/publication/version checks; selected class/material; response and history sources | Correct concept attribution, richer provenance, streaming/cancel, real-provider evaluation |
| Adaptive learning | Student quiz runtime, feedback, mini-quiz, mastery cursor | Session/question preflight, replay/concurrency handling, reliable persistence and question numbering |
| Teacher quiz | Design contract only | Drafts, review, immutable publication, assignment, attempt, grading, and results |
| Concepts | Subject/Concept catalog exists; questions can carry Concept UUIDs | Classroom Subject relation; reviewed material-to-Concept mapping; attribution restricted to approved concepts |
| Voice | ElevenLabs TTS/STT, app/device TTS choice, browser audio cache and manual controls | Independent menu narration and Tutor autoplay, coordinated output, stale-request cancellation, mobile/AT tests |
| UI accessibility | Skip link, semantic navigation, keyboard baseline, reading preferences | Global low-vision preferences, first-run setup, optional guided navigation, shadcn primitives, contrast/focus corrections |
| Infrastructure | Docker Engine reachable; `kodmod-postgres` and `kodmod-redis` healthy under `kodmod-centre` | Isolated PostgreSQL migration/integration tests, application startup and provider/device smoke tests |

The prior material milestone reports 254 backend tests and 33 frontend tests plus lint/typecheck/build. Those are earlier isolated results, not tests rerun by this audit and not proof of live-provider or phone behavior.

## Global constraints

- Keep Next.js, LangChain and LangGraph. Planner Agent remains deferred.
- Keep provider credentials backend-only and preserve the ElevenLabs Bian / Multilingual v2 preset.
- Derive actor and role from the authenticated session; enforce object ownership and active classroom membership on the server.
- Published quiz content and historical attempts must not change when a teacher edits a newer revision.
- Never turn an AI suggestion into published questions or approved concept mapping without human review.
- Keep a usable text/keyboard path, manual audio stop/replay, and transcript review before sending microphone input.
- UI/menu narration OFF must not switch off instructional Tutor audio. They are separate preferences sharing one output coordinator.
- Preserve the blue/navy brand and themed confirmations; avoid competing dialogs or simultaneous narrators.
- Verify against isolated databases and clearly distinguish fixtures, real PostgreSQL, real providers, and real assistive devices.

## Review focus

1. Another student's session or another teacher's assignment must be rejected before graph invocation, scoring, or disclosure.
2. Duplicate/concurrent submissions and network retries must produce one persisted result and one mastery effect.
3. Revisions changed while review/indexing/OCR is running must not publish or replace a newer version.
4. Material with no approved Concept must never borrow an unrelated global Concept or alter its mastery.
5. Browser/AT audio conflicts, denied autoplay, microphone stop, and stale TTS responses must leave a usable text and control path.

## 0. Repair existing assessment prerequisites

**Files:** `apps/ai-engine/api/routes/quiz.py`, `models/quiz.py`, `agents/problem_generator.py`, `agents/scoring_agent.py`, `analytics/student_model.py`, `tests/api/test_quiz.py`, `tests/unit/test_classroom_rag_context.py`; `apps/web/src/components/student-quiz.tsx` and focused frontend tests. All backend paths in this section are under `apps/ai-engine`.

**Consumes:** Existing `/quiz/start`, `/quiz/submit`, persistent QuizSession/QuizQuestion/QuizAttempt, and checkpoint state.

**Produces:** The same adaptive learning experience with validated ownership/current question and trustworthy persisted answers. Assignment grading remains a separate domain.

**Additional files/data:** Add `api/assessment_service.py` and a migration planned as `database/migrations/versions/0005_assessment_submissions.py` after rechecking head. A durable `assessment_submissions` record owns the actor/session/question/intentional-try ID, idempotency key, state and stored result. Unique `mastery_events` identify the accepted submission and Concept. PostgreSQL is the canonical accepted result; checkpoint/Redis state is a resumable projection.

Source findings, not yet fixed or reproduced as live exploits:

- `quiz.py:127-149` invokes the graph using the supplied session ID before checking session ownership. `question_id` is not checked against the active question.
- The submit path lacks an explicit idempotency/concurrency boundary and finished-session guard. Persistence errors are logged while success can still be returned.
- `quiz.py:174-200` writes the current request answer for every unwritten historical attempt; recovery after a failed write can corrupt answer provenance.
- `problem_generator.py:88-91,172-184` can choose a global or weakest mastered Concept and attach it to classroom questions. Classroom retrieval can return the correct private text without validating that Concept attribution.
- Adaptive cumulative scoring averages tries. This is a practice metric, not the final score policy for a teacher assignment.
- Student question numbering must follow returned `order_index`, including remediation that repeats the current question.

- [ ] Add HTTP/graph reproductions for unknown/foreign sessions, mismatched/stale questions, finished-session replay, failed persistence and concurrent submits.
- [ ] Check ownership and current question before graph execution. Select a retry/idempotency contract compatible with intentional remediation, so a duplicate request is distinguishable from a new try on the same question.
- [ ] Persist each checkpoint attempt's own answer and identifier. Commit accepted answer/result plus its mastery effect/event through one authoritative database transaction. Refactor graph-side assessment persistence so it does not independently apply the same mastery update. Successful responses must match durable results; recovery must not rescore an already accepted submission.
- [ ] Repair a missing/stale checkpoint from the accepted PostgreSQL result. A failed checkpoint write or lost HTTP response must not cause another accepted submission or mastery effect. Scope the event key to an intentional try, so a new remedial answer is still permitted.
- [ ] For classroom questions without approved mapping, keep Concept attribution empty and skip Concept mastery. Preserve standalone adaptive fallback only where its catalog scope is valid.
- [ ] Add tests for correct classroom text with an unrelated weak Concept in the student's existing mastery, as well as repeated-question numbering.

**Gate:** No unowned or stale submission reaches scoring; retry has no second effect; saved answers match their original turn; unmapped classroom practice changes no unrelated Concept.

## 1. Teacher quiz: complete manual assignment flow

**Delivery boundary:** Manual multiple-choice authoring on one owned classroom, reviewed publication, one resumable attempt per student, deterministic final grading, and scoped results. AI generation and essay grading follow this working flow.

**Files to add:** `apps/ai-engine/api/routes/editorial_quizzes.py`, `api/editorial_quiz_service.py`, `models/editorial_quiz.py`, `database/migrations/versions/0006_editorial_quizzes.py`, and `tests/contract/test_editorial_quiz_schemas.py` / `tests/api/test_editorial_quizzes.py`. Paths after the first entry are relative to `apps/ai-engine`.

**Files to modify:** `apps/ai-engine/database/models.py` and `api/main.py`. Revision name/number must be rechecked against Alembic head before creation. The current chain is `0001` through `0004_class_material_rag`.

### Data ownership

| Proposed table | Responsibility and invariants |
| --- | --- |
| `quiz_drafts` | Teacher owner, Subject, title/description, current revision, archive state |
| `quiz_draft_versions` | `(draft_id, version)` unique; status, reviewer, source revision and scoring/release policy snapshot |
| `quiz_draft_questions` | Version, unique order, prompt/narration, stable option IDs, answer key, explanation, Concept and difficulty |
| `quiz_review_events` | Append-only submit/approve/reject/publish events with actor, version and time |
| `quiz_assignments` | Published version, owned class, assigning teacher, UTC availability/due date and closure policy |
| `assignment_attempts` | Assignment, authenticated student, attempt number, state and final score; one attempt for initial delivery |
| `assignment_answers` | Unique attempt/question; submitted option, persisted score and feedback |

`PublishedQuiz` is an immutable published version, not a copy of an adaptive QuizSession. The four tables in the older contract need attempt/result and review-event storage as well.

Use one version state machine: `draft -> in_review -> approved -> published`, with `in_review -> rejected`. The rejected snapshot and note remain immutable; edits create a new `draft` revision. Editing any submitted/approved/published content creates a new revision and requires new review. Keep archive state separate from historical version status.

Keep the existing contract's reviewer/admin boundary: the owner edits and submits; an admin or explicitly assigned teacher reviewer approves/rejects; the owner publishes and assigns to their own active class. Self-approval is forbidden. The owner may nominate an active teacher reviewer while the version is a draft; otherwise it enters the admin queue. After submission, only an admin can reassign an active reviewer, recording an event and incrementing the review revision. Each decision checks the current active reviewer/capability, version, review revision and state under a lock. Do not create a new global role or grant reviewers access to learner data. A new staff router must perform object checks; adding review endpoints to the existing teacher-only router would reject admin review.

### Proposed API contract

All routes below are planned. Next.js exposes corresponding same-origin proxies using the HttpOnly session, rather than browser bearer tokens.

| Method/path | Contract |
| --- | --- |
| `GET/POST /teacher/quizzes` | Bounded owner list / create a manual draft, HTTP 201 |
| `GET /quiz-reviews` | Admin submitted-version queue or active teacher's explicitly assigned reviews only |
| `GET/PATCH /teacher/quizzes/{id}` | Authorized draft/version view / save with `expected_version`; stale writes 409 |
| `POST /teacher/quizzes/{id}/reviewer` | Owner nominates while draft; admin may reassign during review with expected review revision |
| `POST /teacher/quizzes/{id}/submit-review` | Exact `version_id` and expected revision; validate all content before freezing |
| `POST /teacher/quizzes/{id}/approve` or `/reject` | Admin/assigned reviewer only; exact submitted version; decision recorded atomically |
| `POST /teacher/quizzes/{id}/publish` | Owner only, current approved version only; published snapshot remains unchanged |
| `POST /teacher/quizzes/{id}/assignments` | Exact published version and owned class; schedule validated, HTTP 201 |
| `GET /student/assignments` | Only currently accessible assignments for the authenticated student |
| `POST /student/assignments/{id}/start` | Check membership/status/time; create attempt once (201) or resume it (200) |
| `GET /student/assignments/{id}/attempt` | Resume saved progress and allowed question content |
| `PUT /student/assignments/{id}/answers/{question_id}` | Open attempt and matching question; expected attempt revision; save increments that revision |
| `POST /student/assignments/{id}/submit` | Idempotency key and expected attempt revision; transaction freezes answers and persists deterministic grade |
| `GET /student/assignments/{id}/result` | Own persisted score; explanations only when release policy permits |
| `GET /teacher/assignments/{id}/results` | Assignment/class owner only; distinct assignment analytics |

Question DTO example before release: `{id, order_index, prompt, narration, options: [{id, label}], concept_id}`. It must exclude `correct_answer`, explanations and internal rubric from student responses and HTML. Concept may be null until approved mapping exists; that question earns assignment score without Concept mastery.

Final submission accepts an `Idempotency-Key`. After authentication/object access checks, look up the committed result before testing closed/due state for a new submission. A repeated key with identical payload returns the stored result; changed payload for the same key is a conflict. Enforce a unique initial attempt per `(assignment_id, student_id)`. Autosave and final submit share the attempt lock and expected revision; a late PUT cannot overwrite a newer answer or frozen grade. Reject stale revisions with 409 so the client reloads rather than silently replacing data. Closing an assignment prevents new starts and submissions; retries for an already committed result remain retrievable under the student's result-access policy. No forced per-question timer in the initial delivery.

Milestone 1 produces assignment scores without Concept mastery effects. Milestone 2 connects approved question mappings to the canonical event writer introduced in milestone 0. Do not invoke the adaptive graph's standalone mastery persistence to grade an assignment.

- [ ] Validate 1–20 questions, unique order/option IDs, 2–6 non-empty MCQ options, exactly one correct option present, title at most 200 characters, description at most 2,000, prompt at most 4,000, narration at most 6,000, explanation at most 4,000, valid difficulty, Subject/Concept consistency, and UTC schedule (`opens_at < due_at` when both exist).
- [ ] Implement the versioned draft/review/publish lifecycle and test its permissions/conflicts before exposing authoring UI.
- [ ] Implement assignment, resumable autosave, final submit and results against a separate test database.
- [ ] Test persistence failure, duplicate/concurrent final submit, lost response after commit, autosave/final-submit races, new versions after publication, foreign classes/students, removed enrollment, archived class, early/late access and answer-key disclosure.
- [ ] Test self-review rejection, reviewer inactivity/reassignment/revocation, stale approval/rejection/publish decisions and queue disclosure outside review capability.
- [ ] Test upgrade/downgrade on an isolated PostgreSQL database and verify that adaptive `/quiz/*` remains independent.

**Gate:** A teacher authors a quiz, its reviewer approves the exact version, the teacher publishes/assigns it, an enrolled student resumes and submits once, and the teacher sees the persisted result. Old assignments retain their original content and policy.

## 2. Reviewed concept mapping and mastery integration

**Files:** `database/models.py`, a new revision after the current head, `api/routes/classrooms.py` including its existing inline schemas, `api/material_service.py`, `rag/ingestion.py`, `rag/stores/pgvector_store.py`, `api/chat_service.py`, `graphs/state.py`, `agents/problem_generator.py`, `analytics/student_model.py`; matching contract/graph/PostgreSQL tests. Paths are relative to `apps/ai-engine`.

**Data:** Add nullable `Classroom.subject_id` while preserving its display label. Add reviewed `material_concepts` associations with Concept FK, material content revision, mapping revision, primary flag, approving teacher and timestamp. Multiple concepts may belong to a material; exactly one primary Concept is optional, not a substitute for question-specific attribution. Add material `mapping_version` and `indexed_mapping_version`; readiness requires both content and mapping revisions to match the index generation.

**Proposed APIs:** `GET/PUT /classes/{class_id}/materials/{material_id}/concepts` for the owner; PUT supplies `expected_content_version`, `expected_mapping_version` and approved Concept IDs. An optional AI suggestion endpoint produces unapproved candidates only. Existing Subject/Concept catalog APIs remain the catalog boundary.

- [ ] Do not auto-merge old Subject labels by string similarity; present candidates for explicit selection.
- [ ] Require canonical Subject selection before approving a mapping and reject Concept from another Subject. Only mappings for the current reviewed material version are eligible for new questions. Subject changes invalidate dependent mappings; referenced Concept retirement preserves historical attempts/mastery rather than using a destructive cascade.
- [ ] Restrict generator selection to approved material concepts; validate emitted per-question IDs against that set. Do not tag every question with the same weak global Concept.
- [ ] Carry approved mapping/version into chunk and question metadata. A mapping-only change invalidates readiness and triggers a new generation even when content is unchanged. Recheck indexing output and retrieval eligibility against both material and mapping revisions.
- [ ] Snapshot Concept attribution for attempts. Mapping edits affect new work, not old results; do not retroactively rewrite historical mastery.
- [ ] Extend milestone 0's durable mastery writer to assignments with a unique accepted attempt/question/Concept event, applying the event plus score update transactionally. A LangGraph checkpoint cursor alone cannot guarantee exactly-once updates across database/checkpoint failures.
- [ ] Preserve private class/enrollment/publication/version checks. A public Concept association must never make classroom chunks globally searchable.

**Gate:** A class material can be mapped to approved concepts, generated questions use those concepts correctly, and one accepted answer updates the intended Concept once. No mapping means no Concept mastery attribution.

## 3. AI-assisted quiz drafts

**Files to add:** `apps/ai-engine/api/editorial_generation.py`, editorial generation schema/tests; extend the editorial router/service. Reuse the OpenAI client factory and LangChain structured output. LangGraph continues orchestrating student tutoring; an editorial generation call must not start a student session or update student mastery.

**Proposed contract:** `POST /teacher/quizzes/{id}/generate` accepts expected draft version, allowed material revisions, approved Concept IDs, question count/difficulty and language. Initial synchronous delivery returns 200 `{generation_id, version_id, questions, source_revisions}` after validating and saving a new draft revision. Keep the operation within the existing proxy timeout using an explicit provider timeout; return a safe failure without replacing the draft when that budget is exceeded. It never approves, publishes, or assigns questions.

- [ ] Check owner and source scope before fetching content or calling the provider.
- [ ] Validate structured output using the same manual question schema; reject fabricated Concept/source IDs and missing answer keys.
- [ ] Preserve the previous draft on timeout/provider/validation failure; a late generation result cannot overwrite a newer teacher edit.
- [ ] Record generation provenance and source revisions. Teacher edits and normal review remain mandatory.
- [ ] Evaluate with representative Indonesian materials; report invalid-answer, ambiguous-option and ungrounded-question cases separately from schema-test success.

**Gate:** AI content is editable draft input to the exact lifecycle already tested for manual questions. Add short-answer/essay rubric review and human correction only after a separate grading/release policy is defined.

## 4. OCR and trustworthy document sources

**Current boundary:** Classroom import uses native text extraction and returns a preview without retaining the original file. The separate global curriculum upload retains a file. Both PDF paths lack OCR. Preserve the distinction between extracted preview, reviewed material and indexed published content.

**Proposed addition:** A bounded OCR adapter and durable worker backed by Redis, with job metadata/ownership in PostgreSQL. Pilot OCRmyPDF/Tesseract (`ind+eng`) in a container first; keep native PDF text extraction as the first choice. Install language data in the worker image explicitly and pin the evaluated dependency/image versions.

**Files:** Extend `api/material_imports.py`, add `api/material_import_jobs.py`, `rag/document_extraction.py`, `workers/material_imports.py`, job/page schemas and migration, and a worker service in the Docker configuration. Extend store -> RAGTool -> graph -> chat source DTO -> frontend source type to propagate provenance.

**Proposed APIs:** `POST /classes/{class_id}/material-imports` returns 202 `{id, status}`; owner-scoped GET returns job status and preview when available; explicit retry is bounded. Keep the existing synchronous native-text preview endpoint compatible while migrating the frontend. Job states: `queued`, `processing`, `review_ready`, `failed`, `cancelled`, separate from material RAG states.

- [ ] Preserve the current 25 MB upload, 150 PDF page and 100,000 reviewed-text character limits; add worker time/memory/page-raster limits and bounded retry.
- [ ] Native text first; run OCR only for appropriate image pages, including mixed PDFs. Keep original file hash and extracted page text/method/language/warnings.
- [ ] Persist/recover job state across worker restart and ignore duplicate or stale revision results. Add an immutable source-document/revision identity linking import job, reviewed material content version and chunk generation; filename or hash alone does not represent this lineage. Keep owner/class authorization for job output and protected original-file access.
- [ ] Retain editable per-page provenance through teacher review. Whole-document free editing invalidates old page claims unless their correspondence is revalidated; never invent page numbers.
- [ ] Propagate source revision, page ranges, chunk IDs and safe excerpts through retrieval and chat history. Current source deduplication by file/material must not discard distinct page references. Store citation snapshots in history because reindex deletes previous chunk rows; historical citations must not silently point to new content.
- [ ] Keep OCR results in preview until reviewed. Define retention and cleanup for abandoned uploads; log safe errors without document bodies or internal paths.
- [ ] Pilot on native, scanned, mixed, rotated and multicolumn Indonesian PDFs. Evaluate tables, fractions and formula ordering separately; OCR text is not a description of a diagram.

**Gate:** A scan produces a resumable reviewed import with accurate page lineage; its published text can ground Tutor with authentic source references. Diagram descriptions, complex tables and mathematical narration remain separate reviewed capabilities.

Primary references: [pypdf extraction/OCR limits](https://pypdf.readthedocs.io/en/stable/user/extract-text.html), [OCRmyPDF language packs](https://ocrmypdf.readthedocs.io/en/latest/languages.html), [Tesseract Indonesian language data](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html), [OCRmyPDF Docker](https://ocrmypdf.readthedocs.io/en/latest/docker.html). The OCR engine recommendation is a pilot choice, not a verified project integration.

## 5. Accessible UI/UX after the technical contracts

Preserve this requirement even while visual migration is deferred:

| Setting | Scope | Initial behavior |
| --- | --- | --- |
| Menu/UI narrator | Navigation labels and control status | Optional, independent on/off |
| Tutor instructional voice | Newly received learning turns | Enabled by default after the learner starts/unlocks audio |
| TTS engine | Application ElevenLabs or browser/device speech | Application preset initially; device speech is not TalkBack/NVDA |
| Guided navigation | Optional previous/next/activate gestures and buttons | Opt-in; ordinary semantic navigation remains available |
| Display | Text scale, contrast, spacing, motion | Global preferences with user control; do not restrict them to the article |

**Files:** `voice-preferences-provider.tsx`, `voice-controls.tsx`, `speech-preferences.mjs`, `student-tutor.tsx`, `student-reader.tsx`, root layout/styles and new shadcn primitives under `apps/web/src/components/ui/`. Add a preference schema and shared audio coordinator before wiring menu narration.

- [ ] Broaden the existing first-run engine modal into independent display, menu narration, guided navigation and Tutor audio settings. Provide keyboard/AT-readable defaults and a skip path without requiring audio or gestures; keep settings reachable afterward. Migrate the old app/device choice and scope new preferences explicitly to the current account/device, including anonymous setup.
- [ ] One audio coordinator prioritizes Tutor over menu narration, pauses output for recording, and cancels stale output on navigation/context changes.
- [ ] Trigger Tutor autoplay by a new turn ID, not by loading the latest text from history. Handle denied autoplay with an accessible enable/listen control; keep pause, stop and replay.
- [ ] Resolve duplicate speech between live announcements and Tutor audio without removing the navigable transcript.
- [ ] Fix the microphone button disabled during recording, stale TTS completion, Tutor textarea focus and low-contrast supporting text before device acceptance.
- [ ] Adopt shadcn via shared blue/navy tokens and common form/dialog controls. Preserve existing action/validation contracts and coordinate any migration of themed SweetAlert2 confirmations.
- [ ] Guided gestures must have visible button and keyboard alternatives, preserve scroll/pinch zoom/form editing, and not claim to replace native screen-reader gestures. Do not auto-detect AT or ask learners to disable their screen reader; offer an explicit compatible narration mode.

Primary references: [shadcn component customization](https://ui.shadcn.com/docs), [W3C gesture alternatives](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html), [browser autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

## 6. Real integration and device acceptance

Testing is a gate within every milestone, not work postponed until all UI is finished. Use a disposable PostgreSQL database for migration and concurrency tests; do not seed/reset the application's data to make tests pass.

| Environment | Required journeys and evidence |
| --- | --- |
| Real PostgreSQL + Redis, provider stubs | Upgrade/downgrade; owner/roster checks; pgvector retrieval; duplicate submits; restart/retry; saved histories/results |
| Backend with real OpenAI/ElevenLabs | Grounded Indonesian responses/questions; Bian TTS; reviewed Scribe transcript; controlled failure and audio cache reuse |
| Windows + NVDA, Chrome/Firefox | Login, onboarding, class/material/Tutor/assignment, form errors, dialogs, headings, focus and spoken status |
| Android + TalkBack, Chrome | Swipe using AT; guided mode with AT disabled/enabled; mic permission/start/stop; double speech, route transitions and cache |
| iPhone + VoiceOver, Safari | Equivalent essential journeys, autoplay fallback, recording format and gestures |
| Low-vision use | Text zoom 200%, reflow at 320 CSS px / 400% zoom, contrast, visible focus, spacing and reduced motion |

Test audio modes explicitly: (1) menu OFF + Tutor ON; (2) menu ON + Tutor ON without overlap; (3) native AT active without forced duplicate narration; (4) app TTS fails with device/manual/text fallback. A desktop browser emulator does not count as a real phone or AT test. Record device/OS/browser/AT versions and the actual outcome; obtain target-user feedback for gesture usability.

## Docker handoff checked

The chat **Setup Docker di F:\Docker_Centre** completed its setup. A direct check during this audit confirmed Engine `29.8.1`, healthy `kodmod-postgres` on host port `5433`, and healthy `kodmod-redis` on `6379`. The external Docker project is `F:\Docker_Centre\kodmod`, Compose project `kodmod-centre`, reading this checkout's active source.

The Docker chat reports that the fresh application schema has not been migrated. This audit did not independently query that schema, apply migrations, start the API, or call providers. Service health is evidence of running infrastructure, not completion of API/database integration.

Use the external project's `README.md` and `docker.ps1` for its startup/migrate/API commands. Avoid starting another root Compose project against the same ports. New sessions may be needed for the updated user PATH.

## Delivery order and current boundary

1. Existing adaptive assessment safety and class Concept attribution guard.
2. Manual teacher quiz through review, publication, assignment and persisted results.
3. Reviewed Concept mapping and durable mastery attribution; then AI-assisted drafts.
4. OCR pilot, durable imports and page provenance.
5. Accessible shadcn UI, independent narration/Tutor audio and guided-navigation setup.
6. Continue real-device checks throughout; require the full device matrix before pilot release.

This turn completes technical mapping and preserves the UI requirements. It does not mark any checkbox implemented. Product implementation can resume from milestone 0; UI migration follows the technical flow as requested.

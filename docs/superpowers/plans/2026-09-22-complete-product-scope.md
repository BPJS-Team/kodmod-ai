# KODMOD Remaining Product Scope Implementation Plan

> **For agentic workers:** Execute the tasks inline in this workspace with test-first validation and a commit after each working milestone.

**Goal:** Close the remaining usable learning and operations flows around the existing Next.js frontend, FastAPI contracts, and ElevenLabs voice foundation without claiming live-provider readiness before deployment secrets and infrastructure are available.

**Architecture:** Keep Next.js App Router as the authenticated browser boundary. New browser mutations use small `/api/*` proxy routes that read the HttpOnly session cookie and forward a bearer token server-side. Reuse existing FastAPI analytics, teacher, chat, quiz, classroom, and voice contracts first; add backend contracts only where the existing database models already support the data. Keep editorial quiz publishing separate from adaptive student quiz sessions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, FastAPI, SQLAlchemy async sessions, LangGraph, SweetAlert2, ElevenLabs HTTP adapter, Node test fixtures, pytest.

**Spec:** `docs/plans/2026-09-16-scope-map.md`, `docs/plans/2026-09-22-elevenlabs-integration.md`

## Global Constraints

- Keep API keys backend-only; the browser may call only same-origin Next.js proxies.
- Use the existing `requireSession` role gate and never trust a role or student ID from the browser body.
- Destructive browser actions use the existing themed `confirmAction` helper.
- Add a failing test before each new behavior and run lint, typecheck, build, and focused fixture/backend tests before committing.
- Commit messages use lowercase Conventional Commits with no trailers or co-author metadata.
- Do not use prototype/fixture results as proof of live FastAPI, OpenAI, database, or ElevenLabs production readiness.

---

### Task 1: Student session controls and streaming fallback

**Files:**
- Modify: `apps/web/src/components/student-tutor.tsx`
- Modify: `apps/web/src/app/api/chat/sessions/[sessionId]/end/route.ts`
- Modify: `apps/web/tests/tutor-chat.test.mjs`
- Modify: `apps/web/tests/learning-fixture.mjs`

**Interfaces:**
- Consumes: `/api/chat/message`, `/api/chat/sessions/{id}`, `/api/chat/sessions/{id}/end`, and the existing `/ws/chat` frame contract.
- Produces: a visible “Akhiri sesi” action, an ended-session state, and a REST-first fallback when a WebSocket cannot connect.

- [ ] Write a fixture test that marks a session ended and rejects a second end as not found.
- [ ] Run `node --test apps/web/tests/tutor-chat.test.mjs` and observe the missing endpoint behavior.
- [ ] Add ended state to the fixture and client; keep REST submit as the safe fallback.
- [ ] Add a themed confirmation before ending a session and disable new turns after it ends.
- [ ] Run focused tests, lint, typecheck, and build.
- [ ] Commit `feat: add student session controls`.

### Task 2: Student progress and analytics workspace

**Files:**
- Create: `apps/web/src/lib/analytics-types.ts`
- Create: `apps/web/src/lib/analytics-proxy.ts`
- Create: `apps/web/src/app/api/analytics/me/route.ts`
- Create: `apps/web/src/app/api/analytics/me/spoken/route.ts`
- Create: `apps/web/src/app/siswa/progres/page.tsx`
- Create: `apps/web/src/components/student-analytics.tsx`
- Modify: `apps/web/src/components/learning-nav.tsx`
- Modify: `apps/web/src/styles/learning.css`
- Test: `apps/web/tests/student-analytics.test.mjs`

**Interfaces:**
- Consumes: `GET /analytics/me`, `GET /analytics/me/spoken`, and `POST /api/voice/tts` through `VoiceControls`.
- Produces: a student-owned mastery, quiz, engagement, misconception, recommendation, and spoken-summary view with selectable windows.

- [ ] Write fixture tests for `week`, `month`, and `all` analytics responses and role rejection.
- [ ] Run the focused test and confirm the fixture has no analytics contract.
- [ ] Add proxy routes that enforce `student` session ownership and safe upstream errors.
- [ ] Build accessible cards, progress bars, weak/strong concept lists, recommendations, and a manual “Dengarkan ringkasan” control.
- [ ] Run focused tests, lint, typecheck, build, and a fixture smoke request for `/siswa/progres`.
- [ ] Commit `feat: add student analytics workspace`.

### Task 3: Teacher cohort and student detail workspace

**Files:**
- Create: `apps/web/src/lib/teacher-types.ts`
- Create: `apps/web/src/lib/teacher-proxy.ts`
- Create: `apps/web/src/app/api/teacher/students/route.ts`
- Create: `apps/web/src/app/api/teacher/students/[studentId]/route.ts`
- Create: `apps/web/src/app/api/teacher/students/[studentId]/sessions/route.ts`
- Create: `apps/web/src/app/api/teacher/sessions/[sessionId]/route.ts`
- Create: `apps/web/src/app/guru/analitik/page.tsx`
- Create: `apps/web/src/app/guru/siswa/[studentId]/page.tsx`
- Create: `apps/web/src/components/teacher-analytics.tsx`
- Modify: `apps/web/src/components/learning-nav.tsx`
- Modify: `apps/web/src/styles/learning.css`
- Test: `apps/web/tests/teacher-analytics.test.mjs`

**Interfaces:**
- Consumes: existing teacher roster, student detail, session list, and transcript endpoints.
- Produces: teacher-only cohort summaries, alerts, student drill-down, and transcript access with role-safe navigation.

- [ ] Write fixture tests proving a teacher can read cohort data while a student receives 403.
- [ ] Add server-side proxies and typed response models.
- [ ] Build a table alternative for every visual metric, filters for window, and links from roster rows to student detail.
- [ ] Add transcript disclosure with no token or credential fields.
- [ ] Run focused tests, lint, typecheck, build, and browser fixture smoke coverage.
- [ ] Commit `feat: add teacher analytics workspace`.

### Task 4: Admin operational analytics and activity feed

**Files:**
- Create: `apps/ai-engine/api/routes/admin_insights.py`
- Modify: `apps/ai-engine/api/main.py`
- Create: `apps/ai-engine/tests/api/test_admin_insights.py`
- Create: `apps/web/src/lib/admin-insights-types.ts`
- Create: `apps/web/src/lib/admin-insights-proxy.ts`
- Create: `apps/web/src/app/api/admin/insights/route.ts`
- Create: `apps/web/src/app/api/admin/activity/route.ts`
- Create: `apps/web/src/app/admin/analytics/page.tsx`
- Create: `apps/web/src/components/admin-insights.tsx`
- Modify: `apps/web/src/components/admin-nav.tsx`
- Modify: `apps/web/src/styles/admin.css`
- Modify: `apps/web/tests/api-fixture.mjs`
- Test: `apps/web/tests/admin-insights.test.mjs`

**Interfaces:**
- Consumes: `User`, `InvitationCode`, `Classroom`, `LearningSession`, `QuizSession`, `ClassActivity`, and the configured ElevenLabs settings.
- Produces: admin-only counts, recent activity, provider configuration status without exposing secrets, pagination, and empty/error states.

- [ ] Write API tests for admin-only access, bounded limits, and the boolean provider-configured field.
- [ ] Add read-only FastAPI queries and structured activity rows; never return access tokens or provider keys.
- [ ] Add same-origin proxies and a dashboard with cards, accessible tables, and filters.
- [ ] Extend fixture tests for admin success and teacher/student rejection.
- [ ] Run pytest focused API tests, frontend tests, lint, typecheck, build, and fixture smoke coverage.
- [ ] Commit `feat: add admin operational insights`.

### Task 5: Editorial quiz readiness boundary

**Files:**
- Inspect: `apps/ai-engine/database/models.py`, `apps/ai-engine/database/schema.sql`, `apps/ai-engine/tests/contract/test_schemas.py`
- Create: `docs/plans/2026-09-22-quiz-editorial-contract.md`

**Interfaces:**
- Consumes: existing `QuizSession`, `QuizQuestion`, and adaptive `/quiz/*` runtime contracts.
- Produces: an explicit contract for drafts, review, versions, publication, assignments, and migration requirements before adding UI.

- [ ] Document why adaptive quiz sessions cannot serve as teacher-published assignments.
- [ ] Define draft/question/version/assignment ownership and status transitions.
- [ ] Define the migration and API test gates required before UI implementation.
- [ ] Commit `docs: define editorial quiz contract`.

### Task 6: ElevenLabs operational readiness

**Files:**
- Modify: `docs/plans/2026-09-22-elevenlabs-integration.md`
- Modify: `apps/ai-engine/tests/static/test_voice_wiring.py`
- Modify: `apps/web/src/components/voice-controls.tsx`

**Interfaces:**
- Consumes: existing backend-only ElevenLabs TTS/STT adapters and authenticated voice proxies.
- Produces: explicit startup/configuration diagnostics, retry-safe UI errors, and a release checklist for real-account/device testing.

- [ ] Add tests for missing key/voice configuration and safe error responses.
- [ ] Ensure voice controls preserve the text path when provider calls fail.
- [ ] Document real-account smoke requests, rate limits, retention, and cost telemetry without storing secrets.
- [ ] Run focused provider tests, lint/typecheck/build, and keep live calls pending until a deployment key is supplied.
- [ ] Commit `docs: document elevenlabs release readiness`.

## Completion Gate

The product scope is ready for staging review when Tasks 1–4 pass their focused tests and browser smoke checks, Task 5 has an approved data contract, and Task 6 has a real-account test report. Until then, report each completed milestone separately and keep the remaining gaps visible in `docs/plans/2026-09-16-scope-map.md`.

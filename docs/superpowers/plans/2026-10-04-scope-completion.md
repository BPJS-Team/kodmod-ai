# KODMOD Scope Completion Implementation Plan

> Execute inline, one milestone at a time, with a progress commit after its focused checks. The user approved the reviewed scope and asked for full testing after implementation. Do not repeat design approval gates for that approved scope.

**Goal:** Complete the remaining code and local runtime scope while preserving the guided Tutor, independent assessments and teacher assignments.

**Architecture:** Next.js remains the authenticated browser boundary. FastAPI and PostgreSQL own reviewed material versions, concept attribution, durable jobs, learning and assessment state. LangGraph teaches or assesses from the authorized source. Provider credentials remain server-only.

**Tech Stack:** Next.js, customized shadcn/Radix, FastAPI, SQLAlchemy/Alembic, PostgreSQL/pgvector, Redis, LangChain/LangGraph, OpenAI and ElevenLabs Bian v2. OCR runs on the server; no Planner Agent.

**Spec:** [Reviewed scope](../../review-and-scope-2026-10-04.md), [technical priorities](2026-10-04-technical-priorities.md), [guided learning contract](../../plans/2026-10-04-guided-learning-contract.md), and the user's instruction to continue sequentially before full testing.

## Global constraints

- Preserve the user's PDF folder and existing database records. Back up before local schema upgrades. Test changes on the isolated PostgreSQL service, not shared application data.
- Keep three quiz lifecycles separate. SQL state and idempotent receipts survive reload, network retries and service restarts.
- A question may update global Concept mastery only with reviewed, versioned attribution. Editing a mapping does not rewrite historical evidence.
- All new mutations enforce role and object ownership. A Concept association never makes private classroom sources public.
- UI/menu narration and instructional audio are independent. Both share the output coordinator, cancel stale audio and provide text/keyboard controls.
- Keep the blue/navy theme, concise ID/EN product copy and themed confirmations. Human device and visual tests remain with the user.
- Commit lowercase `feat: ...` messages without trailers. Do not push until the integrated result is reviewed.

## Sequential milestones and completion gates

| # | Milestone | Deliverable / gate | State |
| --- | --- | --- | --- |
| 1 | Update local Docker | Verified backup; Linux web/API build; additive 0007–0008 migration; healthy services; latest OpenAPI routes | Complete |
| 2 | Reviewed concepts and mastery | Subject selection; versioned material mappings; question-specific allowed attribution; exactly-once mastery evidence for adaptive and formal quizzes | Complete |
| 3 | Reviewed OCR and durable imports | Original files and page provenance; scan/native preview; teacher review; database-backed leased/retry jobs that survive restarts | Complete (code) |
| 4 | Guided Tutor and accessible UI consistency | Guided learning is the student entry; shadcn forms/tables/dialog/menu; global low-vision preferences; complete keyboard profile menu and ID/EN copy | Complete (code) |
| 5 | Provider telemetry | Persist real token/latency/status metadata without prompt/text/secrets; admin aggregation; explicitly configured price estimates | In progress |
| 6 | Operations and release preparation | Updated Compose worker/runtime; backup/restore rehearsal on isolated DB; deployment/smoke tooling and VPS acceptance instructions | Pending |
| 7 | Full code/API acceptance | Combined backend/frontend/PostgreSQL/build checks; real configured-provider checks; integration and restart/recovery validation | Pending |

VPS host/domain and real assistive-device acceptance are external release gates. Preparation is implementable here; actual VPS/device proof must be reported separately.

## Review focus

1. Concurrent subject/material/mapping changes must not publish stale chunks or attribute a question to a different reviewed revision.
2. Unmapped or cross-subject concepts must not alter mastery. Duplicate answers/submit/restart must yield one durable evidence row.
3. OCR/index workers losing a lease or dying after provider work must safely retry; original/page references must remain private and bounded.
4. Keyboard, reduced motion, high contrast and enlarged text must work across shells; app narration must not interrupt instructional speech.
5. Provider errors must preserve canonical learning/quiz state and produce redacted telemetry; missing prices are unknown, not zero cost.

## Execution ledger

- Baseline: `9e760bb`, clean checkout. Docker project `kodmod-centre`, persistent files under `F:/Docker_Centre/kodmod`, source stays in this checkout.
- Milestone 1 preflight: running DB at `0006_editorial_quizzes`; users=4, class_materials=0, learning_sessions=1. Verified custom-format PostgreSQL backup with 236 archive entries before updating. No fixture users were inserted into the main database.
- Ruling: run focused checks per milestone, then the full suite after all code milestones, as requested. Real phone/assistive technology checks remain user-owned.
- Milestone 1 verified: images built on Linux; backed up again immediately before startup; main database migrated to `0008_audit_events`; Compose reports web/API/Postgres/Redis healthy. All five required learning, quiz recovery, teacher proposal, admin material and AI usage routes are present in the running OpenAPI; homepage responds 200. Newer concept code is intentionally applied after its focused checks.
- Milestone 2: subject selection and teacher review UI; additive `0009_material_concepts`; frozen initial Concept schema for correct fresh migrations; historical material mappings; question-specific generation/proposal attribution; formal and adaptive exactly-once mastery receipts. Focused gate: 65 backend/PostgreSQL checks and 9 Node boundary/material tests passed; web typecheck/lint and targeted Ruff passed. Concept migration is verified on disposable PostgreSQL, awaiting final runtime rebuild with subsequent milestones.
- Milestone 3: private originals and SHA256; reviewed page extraction/OCR provenance; persisted/resumable import previews and page-range reuse; teacher/admin source download; transactional queue for material and legacy document indexing; separate Compose worker with lease fencing, heartbeat and bounded retry; recovery migration `0010`. Focused checks: 54 pipeline/learning/queue HTTP checks, 19 parser/renderer/queue checks, 4 PostgreSQL claim/idempotency checks, 4 migration/lock checks and 9 Node proxy/material checks passed. Typecheck/lint passed. Actual PDF rendering is exercised; OCR subprocess is isolated in focused tests. Linux OCR build and real Tesseract acceptance remain in the final runtime/testing gate.
- Milestone 4: shared themed inputs, textareas, native selects, tables and native modal; Radix profile menu with keyboard/focus and confirmed logout; bounded display preferences (125/150% text, contrast, spacing, motion) persisted separately from menu/Tutor speech; expanded ID/EN interface copy and OCR review notices. Focused checks: 23 Node tests passed, including DOM keyboard/Escape/cancel-focus and cross-page translation coverage. Typecheck/lint passed. CSS/real phone and assistive-device acceptance remain human-owned.

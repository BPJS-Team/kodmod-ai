# Reviewed material concepts

The classroom's optional `subject_id` selects the canonical curriculum. A display subject alone is sufficient for learning, but does not attribute global Concept mastery.

## Teacher workflow

1. Select or create a subject on the class or material page.
2. Import/write and review material text, then save it.
3. Select the concepts actually covered and optionally choose the primary concept.
4. Approve that exact content and mapping revision. Published content is reindexed for the new revision.

`GET /classes/{class_id}/materials/{material_id}/concepts` returns the current mapping. `PUT` accepts `expected_content_version`, `expected_mapping_version`, unique `concept_ids` (maximum 30), and an optional selected `primary_concept_id`. Only the owning teacher may approve. A stale revision returns 409; cross-subject, missing or retired concepts return 422. An empty set explicitly removes current attribution.

Changing content invalidates its current mapping; changing the class subject advances the mapping revision and requires another review. Historical approvals remain stored. Private chunks and tutoring sources require both current content and mapping index versions. Mapping never grants access to another classroom.

## Question and mastery semantics

- The generator receives only the approved concepts for the material. Each question can reference one allowed concept or remain unattributed. A forged model concept is rejected; an unmapped material remains usable without changing global mastery.
- Teacher AI proposals retain this question-specific concept and still require human review/publication before assignment.
- Adaptive assessments save their attribution snapshot with the question. A later mapping change cannot rewrite that evidence. Idempotent submissions produce one mastery event.
- Formal assignments use the immutable, human-reviewed question version. Submission updates mastery and stores one `assignment_mastery_events` row per answer/concept in the same SQL transaction. A failed commit leaves neither a submitted result nor partial mastery. Repeated submission cannot apply the update twice.
- Retiring a concept hides it from new catalog selection while preserving existing reviewed question snapshots and historical mastery.

Tutor mini quizzes remain separate from independent assessments and formal assignments. No planner or automatic material publication was introduced.

## Focused verification

Real PostgreSQL tests use the isolated service on port 5434 with disposable databases/schemas. They exercise fresh installation, legacy upgrade, downgrade/re-upgrade and concurrent subject/mapping reviews. HTTP fixtures cover ownership, stale content, cross-subject concepts, forged AI attribution, old index failures, and exactly-once mastery/rollback. Node boundary tests cover authenticated teacher actions, version forwarding and invalid input. Integrated full testing follows the remaining milestones.

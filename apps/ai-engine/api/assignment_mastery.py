"""Formal quiz evidence inside the grading transaction, never a separate write."""

from sqlalchemy import select

from api.assessment_service import load_model
from database.models import AssignmentMasteryEvent, MasteryScore, QuizDraftVersion, User


async def apply_assignment_mastery(session, assignment, attempt, questions, answers):
    mapped = [question for question in questions if question.concept_id]
    if not mapped:
        return
    # Same learner lock as adaptive assessments, including different sessions.
    await session.scalar(select(User.id).where(User.id == attempt.student_id).with_for_update())
    model, rows = await load_model(session, attempt.student_id)
    version = await session.get(QuizDraftVersion, assignment.version_id)
    for question in mapped:
        answer = answers[question.id]
        existing = await session.scalar(
            select(AssignmentMasteryEvent.id).where(
                AssignmentMasteryEvent.answer_id == answer.id,
                AssignmentMasteryEvent.concept_id == question.concept_id,
            )
        )
        if existing:
            continue
        key = str(question.concept_id)
        before = model._scores.get(key, 0.5)
        score = float(bool(answer.is_correct))
        model.update(key, score, 1.0)
        row = rows.get(key)
        if row is None:
            row = MasteryScore(student_id=attempt.student_id, concept_id=question.concept_id)
            rows[key] = row
            session.add(row)
        row.mastery, row.confidence, row.n_attempts = (
            model._scores[key],
            model._confidence[key],
            model._attempts[key],
        )
        row.last_seen = model._last_practiced[key]
        session.add(
            AssignmentMasteryEvent(
                answer_id=answer.id,
                student_id=attempt.student_id,
                concept_id=question.concept_id,
                score=score,
                mastery_before=before,
                mastery_after=row.mastery,
                source_snapshot={
                    "assignment_id": str(assignment.id),
                    "version_id": str(assignment.version_id),
                    "question_id": str(question.id),
                    "subject_id": str(version.subject_id),
                    "reviewed_version": version.version,
                },
            )
        )
    await session.flush()

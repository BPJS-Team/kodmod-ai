"""Assignment grades must reach student and teacher progress without counting drafts."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from analytics import aggregator
from api.dependencies import db_session as api_db_session
from api.main import app
from database import models as db

pytestmark = [pytest.mark.integration, pytest.mark.db, pytest.mark.asyncio(loop_scope="session")]


@pytest.fixture
async def analytics_env(db_session, user_factory, monkeypatch):  # type: ignore[no-untyped-def]
    student, student_token = await user_factory("student", preferred_language="en")
    teacher, teacher_token = await user_factory("teacher", preferred_language="en")
    outsider, _ = await user_factory("student")
    subject = db.Subject(name=f"analytics-{uuid.uuid4().hex}")
    db_session.add(subject)
    await db_session.flush()
    classroom = db.Classroom(teacher_id=teacher.id, name="Analytics class", subject=subject.name)
    draft = db.QuizDraft(teacher_id=teacher.id, subject_id=subject.id, title="Formal quiz")
    concept = db.Concept(subject_id=subject.id, name="Fractions", slug=uuid.uuid4().hex)
    db_session.add_all([classroom, draft, concept])
    await db_session.flush()
    version = db.QuizDraftVersion(
        draft_id=draft.id, version=1, subject_id=subject.id, title=draft.title, state="published"
    )
    db_session.add_all([version, db.Enrollment(class_id=classroom.id, student_id=student.id)])
    await db_session.flush()
    factory = async_sessionmaker(
        db_session.bind, expire_on_commit=False, join_transaction_mode="create_savepoint"
    )
    monkeypatch.setattr(aggregator, "async_session", factory)

    async def add_assignment(*, correct=1, total=1, days=0, owner=None, pending=False):
        assignment = db.QuizAssignment(
            version_id=version.id, class_id=classroom.id, teacher_id=teacher.id
        )
        db_session.add(assignment)
        await db_session.flush()
        attempt = db.AssignmentAttempt(
            assignment_id=assignment.id,
            student_id=owner or student.id,
            state="in_progress" if pending else "submitted",
            # Starting earlier must not exclude a freshly submitted grade.
            started_at=datetime.now(UTC) - timedelta(days=60),
            submitted_at=None if pending else datetime.now(UTC) - timedelta(days=days),
            total_questions=total,
            correct_count=None if pending else correct,
            score=None if pending else correct / total * 100,
        )
        db_session.add(attempt)
        await db_session.flush()
        return attempt

    async def transaction():
        async with factory() as session:
            yield session

    previous = app.dependency_overrides.copy()
    app.dependency_overrides[api_db_session] = transaction
    try:
        yield student, teacher, outsider, concept, add_assignment, student_token, teacher_token
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


async def test_formal_grade_reaches_student_and_scoped_teacher_cohort(analytics_env):
    student, teacher, _, _, add, *_ = analytics_env
    await add()
    summary = await aggregator.StudentAggregator().summarise(
        student_id=student.id, window="all", include_recommendations=False
    )
    assert summary["quiz_accuracy"] == 1
    assert summary["avg_quiz_score"] == 1
    assert summary["n_quiz_attempts"] == 1
    assert summary["n_assignment_submissions"] == 1
    assert summary["n_assignment_answers"] == 1
    cohort = await aggregator.CohortAggregator().summarise(teacher_id=teacher.id, window="all")
    assert cohort["avg_quiz_accuracy"] == 1
    assert cohort["students"][0]["quiz_accuracy"] == 1


async def test_accuracy_weights_answers_instead_of_averaging_quiz_percentages(
    analytics_env, db_session
):
    student, _, _, concept, add, *_ = analytics_env
    await add(correct=1, total=5)
    quiz = db.QuizSession(student_id=student.id, concept_id=concept.id, total_questions=3)
    db_session.add(quiz)
    await db_session.flush()
    for order in range(3):
        question = db.QuizQuestion(
            quiz_session_id=quiz.id,
            concept_id=concept.id,
            order_index=order,
            question="One half plus one half?",
            question_type="mcq",
            correct_answer="1",
        )
        db_session.add(question)
        await db_session.flush()
        db_session.add(
            db.QuizAttempt(
                quiz_session_id=quiz.id,
                quiz_question_id=question.id,
                student_answer="1" if order < 2 else "2",
                score=1 if order < 2 else 0,
                is_correct=order < 2,
            )
        )
    await db_session.flush()
    summary = await aggregator.StudentAggregator().summarise(
        student_id=student.id, window="all", include_recommendations=False
    )
    assert summary["n_quiz_attempts"] == 8
    assert summary["quiz_accuracy"] == pytest.approx(3 / 8)
    assert summary["avg_quiz_score"] == pytest.approx(3 / 8)
    assert summary["n_practice_answers"] == 3


async def test_submission_time_drafts_and_student_scope_are_respected(analytics_env):
    student, _, outsider, _, add, *_ = analytics_env
    await add(correct=0, total=2)
    await add(correct=3, total=3, days=40)
    await add(total=4, pending=True)
    await add(correct=5, total=5, owner=outsider.id)
    week = await aggregator.StudentAggregator().summarise(
        student_id=student.id, window="week", include_recommendations=False
    )
    all_time = await aggregator.StudentAggregator().summarise(
        student_id=student.id, window="all", include_recommendations=False
    )
    assert week["n_quiz_attempts"] == 2
    assert week["quiz_accuracy"] == 0
    assert all_time["n_quiz_attempts"] == 5
    assert all_time["quiz_accuracy"] == pytest.approx(0.6)


async def test_authenticated_progress_uses_english_profile_without_learning_session(analytics_env):
    _, _, _, _, add, student_token, teacher_token = analytics_env
    await add()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://analytics.test"
    ) as client:
        student = await client.get(
            "/analytics/me/spoken?window=all",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert student.status_code == 200, student.text
        assert student.json()["summary"]["quiz_accuracy"] == 1
        assert "100 percent" in student.json()["spoken"]
        assert "Minggu ini" not in student.json()["spoken"]
        alerts = await client.get(
            "/analytics/cohort/alerts", headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert alerts.status_code == 200, alerts.text
        assert alerts.json()["alerts"][0]["title"] == "Low engagement"

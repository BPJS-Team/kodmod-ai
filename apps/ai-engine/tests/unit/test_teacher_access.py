"""Teacher roster and transcript access follow active classroom membership."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.dependencies import current_user, db_session
from api.routes import analytics, teacher
from database.models import (
    Base,
    ClassMaterial,
    Classroom,
    Enrollment,
    InteractionLog,
    LearningSession,
    Subject,
    User,
)

pytestmark = pytest.mark.unit


@pytest_asyncio.fixture
async def teacher_workspace():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.execute(text("PRAGMA foreign_keys=ON"))
        await connection.run_sync(
            lambda sync: Base.metadata.create_all(
                sync,
                tables=[
                    model.__table__
                    for model in (
                        User,
                        Subject,
                        Classroom,
                        ClassMaterial,
                        Enrollment,
                        LearningSession,
                        InteractionLog,
                    )
                ],
            )
        )
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    people = {
        name: User(
            id=uuid.uuid4(),
            username=name,
            full_name=name,
            role="teacher" if name.startswith("teacher") else "student",
            is_active=True,
            password_hash="unused",
        )
        for name in ("teacher_one", "teacher_two", "student", "outsider")
    }
    classes = [
        Classroom(id=uuid.uuid4(), teacher_id=people[name].id, name=name, subject="Matematika")
        for name in ("teacher_one", "teacher_two")
    ]
    async with sessions() as session:
        session.add_all(people.values())
        await session.flush()
        session.add_all(classes)
        await session.flush()
        session.add_all(
            [
                Enrollment(class_id=classes[0].id, student_id=people["student"].id),
                Enrollment(class_id=classes[1].id, student_id=people["outsider"].id),
            ]
        )
        private = LearningSession(
            id=uuid.uuid4(), student_id=people["outsider"].id, title="Rahasia guru kedua"
        )
        session.add(private)
        await session.flush()
        session.add(InteractionLog(session_id=private.id, role="student", text="Isi privat"))
        await session.commit()

    actor = {"user": people["teacher_one"]}

    async def authenticated_actor():
        return actor["user"]

    async def isolated_database():
        async with sessions() as session:
            yield session

    async def fake_summary(*, student_id, window="week", **_):
        return {
            "student_id": str(student_id),
            "student_name": "Siswa",
            "window": window,
            "overall_mastery": 0.5,
            "quiz_accuracy": 0.5,
            "engagement_index": 0.5,
            "n_sessions": 1,
            "weak_concepts": [],
            "open_misconceptions": [],
        }

    app = FastAPI()
    app.include_router(teacher.router, prefix="/teacher")
    app.include_router(analytics.router, prefix="/analytics")
    app.dependency_overrides[current_user] = authenticated_actor
    app.dependency_overrides[db_session] = isolated_database
    try:
        with (
            patch("analytics.aggregator.async_session", sessions),
            patch("analytics.aggregator.StudentAggregator.summarise", side_effect=fake_summary),
        ):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                yield client, sessions, people, classes, private, actor
    finally:
        await engine.dispose()


async def test_teacher_cannot_read_unrelated_student_or_transcript(teacher_workspace):
    client, _, people, _, private, _ = teacher_workspace
    outsider = people["outsider"].id
    for path in (
        f"/teacher/students/{outsider}",
        f"/teacher/students/{outsider}/sessions",
        f"/teacher/sessions/{private.id}",
        f"/analytics/student/{outsider}",
    ):
        response = await client.get(path)
        assert response.status_code == 404, (path, response.text)


async def test_teacher_cohorts_only_include_their_active_class_students(teacher_workspace):
    client, sessions, people, classes, _, _ = teacher_workspace
    for path in ("/teacher/students", "/analytics/cohort", "/analytics/cohort/alerts"):
        response = await client.get(path)
        assert response.status_code == 200, response.text
        payload = response.json()
        rollup = payload.get("summary", payload)
        assert [row["student_id"] for row in rollup["students"]] == [str(people["student"].id)]

    async with sessions() as session:
        room = await session.get(Classroom, classes[0].id)
        room.is_archived = True
        await session.commit()
    response = await client.get("/teacher/students")
    assert response.json()["n_students"] == 0
    assert response.json()["avg_mastery"] == 0


async def test_removed_membership_revokes_teacher_detail_access(teacher_workspace):
    client, sessions, people, classes, _, _ = teacher_workspace
    student_id = people["student"].id
    assert (await client.get(f"/teacher/students/{student_id}")).status_code == 200
    async with sessions() as session:
        await session.execute(
            delete(Enrollment).where(
                Enrollment.class_id == classes[0].id, Enrollment.student_id == student_id
            )
        )
        await session.commit()
    assert (await client.get(f"/teacher/students/{student_id}")).status_code == 404


async def test_teacher_summary_is_displayable_text(teacher_workspace):
    client, _, people, _, _, _ = teacher_workspace
    response = await client.get(f"/teacher/students/{people['student'].id}")
    assert response.status_code == 200
    assert isinstance(response.json()["teacher_summary"], str)
    assert response.json()["teacher_summary"]


async def test_other_class_transcript_is_private_even_for_a_shared_student(teacher_workspace):
    client, sessions, people, classes, _, _ = teacher_workspace
    async with sessions() as session:
        session.add(Enrollment(class_id=classes[1].id, student_id=people["student"].id))
        other_class_session = LearningSession(
            id=uuid.uuid4(),
            student_id=people["student"].id,
            class_id=classes[1].id,
            title="Materi privat kelas lain",
        )
        session.add(other_class_session)
        await session.commit()
    response = await client.get(f"/teacher/students/{people['student'].id}/sessions")
    assert response.status_code == 200
    assert response.json() == []
    response = await client.get(f"/teacher/sessions/{other_class_session.id}")
    assert response.status_code == 404

"""Formal reviewed question attribution and transactional mastery receipts."""

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select

from api import editorial_quiz_service as service
from database import models as db
from tests import editorial_test
from tests.editorial_test import editorial_http as editorial_http


@pytest.mark.parametrize("fail_once", [False, True])
async def test_reviewed_formal_question_updates_mastery_once_and_rolls_back_on_failure(editorial_http, monkeypatch, fail_once):
    client, factory, actors, subject, _, headers = editorial_http
    async with factory.kw["bind"].begin() as connection:
        await connection.run_sync(lambda c: db.Base.metadata.create_all(c, tables=[
            db.MasteryScore.__table__, db.AssignmentMasteryEvent.__table__,
        ]))
    async with factory() as session:
        concept = db.Concept(subject_id=subject.id, name="Pecahan", slug="formal-pecahan")
        session.add(concept)
        await session.commit()
    questions = editorial_test.draft_body(subject)["questions"]
    questions[0]["concept_id"] = str(concept.id)
    draft, assignment = await editorial_test.assigned(editorial_http, questions=questions)
    # A newer draft and concept retirement must not rewrite the reviewed version.
    async with factory() as session:
        row = await session.get(db.Concept, concept.id)
        row.is_active = False
        await session.commit()
    attempt = await editorial_test.answered(editorial_http, assignment)
    path = f"/student/assignments/{assignment['id']}/submit"
    request_headers = headers("student") | {"Idempotency-Key": str(uuid.uuid4())}
    body = {"expected_revision": attempt["revision"]}
    original = service.commit
    if fail_once:
        async def fail_commit(session):
            await session.rollback()
            raise HTTPException(503, "Test write failure")
        monkeypatch.setattr(service, "commit", fail_commit)
        assert (await client.post(path, json=body, headers=request_headers)).status_code == 503
        async with factory() as session:
            assert await session.scalar(select(func.count()).select_from(db.MasteryScore)) == 0
            assert await session.scalar(select(func.count()).select_from(db.AssignmentMasteryEvent)) == 0
        monkeypatch.setattr(service, "commit", original)
    first = await client.post(path, json=body, headers=request_headers)
    replay = await client.post(path, json=body, headers=request_headers)
    assert first.status_code == replay.status_code == 200
    assert first.json() == replay.json()
    async with factory() as session:
        score = await session.scalar(select(db.MasteryScore).where(db.MasteryScore.student_id == actors["student"].id))
        assert score is not None and score.concept_id == concept.id
        assert score.n_attempts == 1
        evidence = list(await session.scalars(select(db.AssignmentMasteryEvent)))
        assert len(evidence) == 1 and evidence[0].score == 1
        assert evidence[0].source_snapshot["version_id"] == draft["version"]["id"]

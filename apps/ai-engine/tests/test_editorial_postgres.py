"""Real row-lock overlap in disposable schemas of the dedicated test DB."""

import asyncio
import uuid

import pytest
from sqlalchemy import select

from api import editorial_quiz_service as service
from database import models as db
from tests.editorial_test import action, answered, assigned, create, transition
from tests.editorial_test import editorial_http as editorial_http

pytestmark = [pytest.mark.asyncio, pytest.mark.db]


async def overlap(monkeypatch, first, second):
    held, release = asyncio.Event(), asyncio.Event()
    original = service.commit
    calls = 0

    async def delayed(session):
        nonlocal calls
        calls += 1
        if calls == 1:
            held.set()
            await asyncio.wait_for(release.wait(), 10)
        await original(session)

    monkeypatch.setattr(service, "commit", delayed)
    task1 = asyncio.create_task(first())
    await asyncio.wait_for(held.wait(), 10)
    task2 = asyncio.create_task(second())
    await asyncio.sleep(0.12)
    assert not task2.done(), "Second writer must wait on the held PostgreSQL row lock"
    release.set()
    return await asyncio.gather(task1, task2)


async def test_concurrent_start_creates_one_attempt(editorial_http, monkeypatch):
    env = editorial_http
    client, factory, _, _, _, headers = env
    _, assignment = await assigned(env)

    async def start():
        return await client.post(
            f"/student/assignments/{assignment['id']}/start", headers=headers("student")
        )

    one, two = await overlap(monkeypatch, start, start)
    assert sorted([one.status_code, two.status_code]) == [200, 201]
    assert one.json()["id"] == two.json()["id"]
    async with factory() as session:
        assert len((await session.scalars(select(db.AssignmentAttempt))).all()) == 1


async def test_concurrent_final_retry_has_one_frozen_grade(editorial_http, monkeypatch):
    env = editorial_http
    client, factory, _, _, _, headers = env
    _, assignment = await assigned(env)
    await answered(env, assignment)
    auth = headers("student") | {"Idempotency-Key": str(uuid.uuid4())}

    async def final():
        return await client.post(
            f"/student/assignments/{assignment['id']}/submit",
            json={"expected_revision": 1},
            headers=auth,
        )

    one, two = await overlap(monkeypatch, final, final)
    assert one.status_code == two.status_code == 200
    assert one.json() == two.json()
    async with factory() as session:
        attempt = await session.scalar(select(db.AssignmentAttempt))
        assert attempt.revision == 2 and attempt.score == 100 and attempt.receipt == one.json()


@pytest.mark.parametrize("save_first", [False, True])
async def test_autosave_and_final_share_lock_and_revision(editorial_http, monkeypatch, save_first):
    env = editorial_http
    client, factory, _, _, _, headers = env
    _, assignment = await assigned(env)
    attempt = await answered(env, assignment)
    base = f"/student/assignments/{assignment['id']}"

    async def final():
        return await client.post(
            base + "/submit",
            json={"expected_revision": 1},
            headers=headers("student") | {"Idempotency-Key": str(uuid.uuid4())},
        )

    async def save():
        return await client.put(
            base + f"/answers/{attempt['questions'][0]['id']}",
            json={"expected_revision": 1, "option_id": "b"},
            headers=headers("student"),
        )

    one, two = await overlap(
        monkeypatch, save if save_first else final, final if save_first else save
    )
    assert one.status_code == 200 and two.status_code == 409
    async with factory() as session:
        row = await session.scalar(select(db.AssignmentAttempt))
        answer = await session.scalar(select(db.AssignmentAnswer))
        assert row.revision == 2
        assert answer.option_id == ("b" if save_first else "a")
        assert row.state == ("in_progress" if save_first else "submitted")


async def test_concurrent_reassignment_revokes_stale_approval(editorial_http, monkeypatch):
    env = editorial_http
    client, _, actors, _, _, headers = env
    draft = await transition(
        env, await create(env), "reviewer", reviewer_id=str(actors["reviewer"].id)
    )
    draft = await transition(env, draft, "submit-review")
    base = f"/teacher/quizzes/{draft['id']}"

    async def reassign():
        return await client.post(
            base + "/reviewer",
            json=action(draft) | {"reviewer_id": str(actors["other"].id)},
            headers=headers("admin"),
        )

    async def approve():
        return await client.post(base + "/approve", json=action(draft), headers=headers("reviewer"))

    one, two = await overlap(monkeypatch, reassign, approve)
    assert one.status_code == 200 and two.status_code == 404

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


@pytest.mark.parametrize("revocation", ["inactive", "demoted"])
async def test_revocation_committed_while_approval_waits_on_draft_lock(
    editorial_http, monkeypatch, revocation
):
    env = editorial_http
    client, factory, actors, _, _, headers = env
    draft = await transition(
        env, await create(env), "reviewer", reviewer_id=str(actors["reviewer"].id)
    )
    draft = await transition(env, draft, "submit-review")
    entering_lock = asyncio.Event()
    original = service.draft_for

    async def tracked(*args, **kwargs):
        entering_lock.set()  # Dependency authentication completed.
        return await original(*args, **kwargs)

    monkeypatch.setattr(service, "draft_for", tracked)
    async with factory() as blocker:
        await blocker.scalar(
            select(db.QuizDraft)
            .where(db.QuizDraft.id == uuid.UUID(draft["id"]))
            .with_for_update()
        )
        approval = asyncio.create_task(
            client.post(
                f"/teacher/quizzes/{draft['id']}/approve",
                json=action(draft),
                headers=headers("reviewer"),
            )
        )
        await asyncio.wait_for(entering_lock.wait(), 10)
        async with factory() as admin:
            reviewer = await admin.get(db.User, actors["reviewer"].id)
            if revocation == "inactive":
                reviewer.is_active = False
            else:
                reviewer.role = "student"
            await admin.commit()
        assert not approval.done(), "Approval must still be waiting on the held draft row"
        await blocker.commit()
    response = await asyncio.wait_for(approval, 10)
    assert response.status_code == 403, response.text
    async with factory() as session:
        version = await session.get(db.QuizDraftVersion, uuid.UUID(draft["version"]["id"]))
        assert version.state == "in_review"


async def test_approval_holds_staff_capability_until_commit(editorial_http, monkeypatch):
    env = editorial_http
    client, factory, actors, _, _, headers = env
    draft = await transition(
        env, await create(env), "reviewer", reviewer_id=str(actors["reviewer"].id)
    )
    draft = await transition(env, draft, "submit-review")

    async def approve():
        return await client.post(
            f"/teacher/quizzes/{draft['id']}/approve",
            json=action(draft),
            headers=headers("reviewer"),
        )

    async def deactivate():
        async with factory() as admin:
            reviewer = await admin.get(db.User, actors["reviewer"].id)
            reviewer.is_active = False
            await admin.commit()
        return True

    approval, disabled = await overlap(monkeypatch, approve, deactivate)
    assert approval.status_code == 200 and disabled
    async with factory() as session:
        reviewer = await session.get(db.User, actors["reviewer"].id)
        version = await session.get(db.QuizDraftVersion, uuid.UUID(draft["version"]["id"]))
        assert not reviewer.is_active and version.state == "approved"

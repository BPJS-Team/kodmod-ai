import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api import durable_jobs as jobs
from database.models import BackgroundJob


@pytest.fixture
async def queue(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(BackgroundJob.__table__.create)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(jobs, "async_session", factory)
    yield factory
    await engine.dispose()


async def test_expired_worker_is_reclaimed_and_old_lease_cannot_publish(queue):
    target = uuid.uuid4()
    async with queue() as session:
        created = await jobs.enqueue(session, "material_index", target, {"version": 1, "mapping": 0}, "material:1:0")
        await session.commit()
    first = await jobs.claim()
    assert first.id == created.id and first.attempts == 1
    assert await jobs.claim() is None
    async with queue() as session:
        row = await session.get(BackgroundJob, first.id)
        row.lease_expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()
    second = await jobs.claim()
    assert second.id == first.id and second.lease_token != first.lease_token
    assert await jobs.finish(first.id, first.lease_token, result={"obsolete": True}) is False
    assert await jobs.finish(second.id, second.lease_token, result={"ready": True}) is True
    async with queue() as session:
        row = await session.get(BackgroundJob, first.id)
        assert row.state == "complete" and row.result == {"ready": True}


async def test_retry_is_bounded_and_exact_version_enqueue_is_idempotent(queue):
    target = uuid.uuid4()
    async with queue() as session:
        first = await jobs.enqueue(session, "material_import", target, {}, "import:1", max_attempts=2)
        second = await jobs.enqueue(session, "material_import", target, {}, "import:1")
        assert first.id == second.id
        await session.commit()
    claimed = await jobs.claim()
    await jobs.fail(claimed.id, claimed.lease_token)
    async with queue() as session:
        row = await session.get(BackgroundJob, claimed.id)
        row.available_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()
    claimed = await jobs.claim()
    await jobs.fail(claimed.id, claimed.lease_token)
    async with queue() as session:
        row = await session.scalar(select(BackgroundJob))
        assert row.state == "failed" and row.attempts == 2
        assert "Traceback" not in row.error_message
    assert await jobs.claim() is None

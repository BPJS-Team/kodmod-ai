"""Lease recovery and concurrent claims on dedicated port 5434 only."""
import asyncio
import os
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from api import durable_jobs as jobs
from database.models import BackgroundJob

pytestmark = pytest.mark.skipif(os.getenv("KODMOD_JOBS_POSTGRES") != "1", reason="Dedicated PostgreSQL required")


@pytest.fixture
async def queue(monkeypatch):
    dsn = "postgresql+asyncpg://kodmod:kodmod@127.0.0.1:5434/kodmod_test"
    schema = "jobs_test_" + uuid.uuid4().hex
    control = create_async_engine(dsn, poolclass=NullPool)
    async with control.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(dsn, poolclass=NullPool, connect_args={"server_settings": {"search_path": schema}})
    try:
        async with engine.begin() as connection:
            await connection.run_sync(BackgroundJob.__table__.create)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        monkeypatch.setattr(jobs, "async_session", factory)
        yield factory
    finally:
        await engine.dispose()
        assert schema.startswith("jobs_test_") and len(schema) == 42
        async with control.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await control.dispose()


async def test_two_workers_claim_distinct_jobs_without_waiting_on_each_other(queue):
    async with queue() as session:
        for index in range(2):
            await jobs.enqueue(session, "material_import", uuid.uuid4(), {}, f"claim:{index}")
        await session.commit()
    claims = await asyncio.gather(jobs.claim(), jobs.claim())
    assert all(claim is not None for claim in claims)
    assert len({claim.id for claim in claims}) == 2
    assert await jobs.claim() is None


async def test_concurrent_enqueue_commits_one_versioned_job(queue):
    async def submit():
        async with queue() as session:
            row = await jobs.enqueue(session, "material_import", uuid.UUID(int=1), {}, "same-source-version")
            await session.commit()
            return row.id
    ids = await asyncio.gather(submit(), submit())
    assert ids[0] == ids[1]

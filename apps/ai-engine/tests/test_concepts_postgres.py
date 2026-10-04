"""Mapping locks and additive migrations on the dedicated test DB, port 5434."""

import asyncio
import os
import uuid
from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from api.dependencies import current_user, db_session
from api.routes import classrooms
from database import models as db

pytestmark = pytest.mark.skipif(os.getenv("KODMOD_CONCEPTS_POSTGRES") != "1", reason="Dedicated PostgreSQL required")
DSN = "postgresql+asyncpg://kodmod:kodmod@127.0.0.1:5434/kodmod_test"


def test_concept_migration_preserves_legacy_material_and_roundtrips():
    prefix = "concepts_migration_"
    name = prefix + uuid.uuid4().hex
    admin = create_engine("postgresql+psycopg://kodmod:kodmod@127.0.0.1:5434/kodmod_test", isolation_level="AUTOCOMMIT")
    engine = None
    try:
        with admin.connect() as conn:
            conn.execute(text(f'CREATE DATABASE "{name}"'))
        engine = create_engine(f"postgresql+psycopg://kodmod:kodmod@127.0.0.1:5434/{name}")
        with engine.begin() as conn:
            config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
            config.attributes["connection"] = conn
            command.upgrade(config, "0008_audit_events")
            actor_id, room_id, mid = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
            conn.execute(db.User.__table__.insert().values(id=actor_id, username="legacy-teacher", password_hash="test-only", role="teacher", full_name="Legacy"))
            conn.execute(text("INSERT INTO classrooms (id, teacher_id, name, subject, description, is_archived, created_at) VALUES (:id, :teacher, 'Legacy class', 'Matematika', '', false, NOW())"), {"id": room_id, "teacher": actor_id})
            conn.execute(text("INSERT INTO class_materials (id, class_id, title, content, published, created_at) VALUES (:id, :room, 'Legacy material', 'Existing reviewed text', true, NOW())"), {"id": mid, "room": room_id})
            command.upgrade(config, "0009_material_concepts")
            row = conn.execute(text("SELECT content, mapping_version, indexed_mapping_version FROM class_materials WHERE id=:id"), {"id": mid}).one()
            assert tuple(row) == ("Existing reviewed text", 0, 0)
            assert conn.scalar(text("SELECT subject_id FROM classrooms WHERE id=:id"), {"id": room_id}) is None
            assert {"material_concepts", "assignment_mastery_events"}.issubset(inspect(conn).get_table_names())
            command.downgrade(config, "0008_audit_events")
            command.upgrade(config, "0009_material_concepts")
            assert conn.scalar(text("SELECT content FROM class_materials WHERE id=:id"), {"id": mid}) == "Existing reviewed text"
    finally:
        if engine:
            engine.dispose()
        assert name.startswith(prefix) and len(name) == len(prefix) + 32
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{name}"'))
        admin.dispose()


@pytest.fixture
async def mapping_pg(monkeypatch):
    schema = "mapping_test_" + uuid.uuid4().hex
    control = create_async_engine(DSN, poolclass=NullPool)
    async with control.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(DSN, poolclass=NullPool, connect_args={"server_settings": {"search_path": schema}})
    names = {"users", "subjects", "concepts", "classrooms", "enrollments", "class_materials", "class_activities", "material_concepts"}
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: db.Base.metadata.create_all(c, tables=[t for t in db.Base.metadata.sorted_tables if t.name in names]))
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            actor = db.User(username="owner", full_name="Owner", role="teacher", password_hash="test-only")
            one, two = db.Subject(name="Matematika"), db.Subject(name="Biologi")
            session.add_all([actor, one, two])
            await session.flush()
            room = db.Classroom(name="Class", subject=one.name, subject_id=one.id, teacher_id=actor.id)
            concept = db.Concept(name="Pecahan", slug="pecahan", subject_id=one.id)
            session.add_all([room, concept])
            await session.flush()
            material = db.ClassMaterial(class_id=room.id, title="Pecahan", content="Pecahan senilai.", published=False)
            session.add(material)
            await session.commit()
        app = FastAPI()
        app.include_router(classrooms.router, prefix="/classes")
        async def transaction():
            async with factory() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        app.dependency_overrides[current_user] = lambda: actor
        app.dependency_overrides[db_session] = transaction
        monkeypatch.setattr(classrooms, "index_class_material", AsyncMock())
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://mapping.test") as client:
            yield client, factory, room, material, concept, two
    finally:
        await engine.dispose()
        assert schema.startswith("mapping_test_")
        async with control.begin() as conn:
            await conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await control.dispose()


async def test_concurrent_mapping_approvals_accept_one_review(mapping_pg):
    client, factory, room, material, concept, _ = mapping_pg
    path = f"/classes/{room.id}/materials/{material.id}/concepts"
    body = {"expected_content_version": 1, "expected_mapping_version": 0,
            "concept_ids": [str(concept.id)], "primary_concept_id": str(concept.id)}
    one, two = await asyncio.gather(client.put(path, json=body), client.put(path, json=body))
    assert sorted([one.status_code, two.status_code]) == [200, 409]
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(db.MaterialConcept)) == 1
        current = await session.get(db.ClassMaterial, material.id)
        assert current.mapping_version == 1


async def test_subject_change_serializes_with_review_and_never_keeps_wrong_concept(mapping_pg):
    client, factory, room, material, concept, other = mapping_pg
    path = f"/classes/{room.id}/materials/{material.id}/concepts"
    body = {"expected_content_version": 1, "expected_mapping_version": 0, "concept_ids": [str(concept.id)]}
    reviewed, changed = await asyncio.gather(
        client.put(path, json=body), client.patch(f"/classes/{room.id}", json={"subject_id": str(other.id)}))
    assert reviewed.status_code in {200, 409}
    assert changed.status_code == 200, changed.text
    assert (await client.get(path)).json()["concepts"] == []
    async with factory() as session:
        current = await session.get(db.Classroom, room.id)
        assert current.subject_id == other.id

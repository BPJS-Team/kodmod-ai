"""Isolated route tests. Run python -m unittest tests.classroom_test -v.

Uses an in-memory SQLite database only; never connects to the application DB.
"""

import unittest
import uuid

import httpx
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.dependencies import current_user, db_session
from api.routes import classrooms
from database.models import Base, ClassActivity, ClassMaterial, Classroom, Enrollment, User


class ClassroomRoutesTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as conn:
            await conn.run_sync(
                lambda c: Base.metadata.create_all(
                    c,
                    tables=[
                        User.__table__,
                        Classroom.__table__,
                        Enrollment.__table__,
                        ClassMaterial.__table__,
                        ClassActivity.__table__,
                    ],
                )
            )
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        self.teacher = User(
            id=uuid.uuid4(),
            username="teacher",
            full_name="Guru Satu",
            role="teacher",
            is_active=True,
            password_hash="unused",
        )
        self.other_teacher = User(
            id=uuid.uuid4(),
            username="other",
            full_name="Guru Dua",
            role="teacher",
            is_active=True,
            password_hash="unused",
        )
        self.student = User(
            id=uuid.uuid4(),
            username="student",
            full_name="Siswa Satu",
            role="student",
            is_active=True,
            password_hash="unused",
        )
        self.outsider = User(
            id=uuid.uuid4(),
            username="outsider",
            full_name="Siswa Dua",
            role="student",
            is_active=True,
            password_hash="unused",
        )
        async with self.sessions() as s:
            s.add_all([self.teacher, self.other_teacher, self.student, self.outsider])
            await s.commit()
        app = FastAPI()
        app.include_router(classrooms.router, prefix="/classes")
        self.actor = self.teacher

        async def actor():
            return self.actor

        async def database():
            async with self.sessions() as s:
                try:
                    yield s
                    await s.commit()
                except Exception:
                    await s.rollback()
                    raise

        app.dependency_overrides[current_user] = actor
        app.dependency_overrides[db_session] = database
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        await self.engine.dispose()

    async def create_class(self):
        response = await self.client.post(
            "/classes",
            json={
                "name": "Matematika VII",
                "subject": "Matematika",
                "description": "Belajar bersama",
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    async def test_learning_material_only_visible_to_enrolled_student(self):
        cid = await self.create_class()
        added = await self.client.post(f"/classes/{cid}/members", json={"username": "student"})
        self.assertEqual(added.status_code, 201)
        material = await self.client.post(
            f"/classes/{cid}/materials",
            json={
                "title": "Pecahan",
                "content": "Satu per dua sama dengan dua per empat.",
                "published": True,
            },
        )
        self.assertEqual(material.status_code, 201)
        mid = material.json()["id"]
        self.actor = self.student
        self.assertEqual(len((await self.client.get("/classes")).json()), 1)
        self.assertIn(
            "Satu per dua",
            (await self.client.get(f"/classes/{cid}/materials/{mid}")).json()["content"],
        )
        self.actor = self.outsider
        self.assertEqual((await self.client.get("/classes")).json(), [])
        self.assertEqual((await self.client.get(f"/classes/{cid}")).status_code, 404)
        self.assertEqual(
            (await self.client.get(f"/classes/{cid}/materials/{mid}")).status_code, 404
        )

    async def test_teacher_ownership_and_student_write_denied(self):
        cid = await self.create_class()
        self.actor = self.other_teacher
        self.assertEqual((await self.client.get(f"/classes/{cid}")).status_code, 404)
        self.assertEqual(
            (
                await self.client.post(f"/classes/{cid}/members", json={"username": "student"})
            ).status_code,
            404,
        )
        self.actor = self.student
        self.assertEqual(
            (await self.client.post("/classes", json={"name": "x", "subject": "y"})).status_code,
            403,
        )

    async def test_drafts_removal_archive_and_audit(self):
        cid = await self.create_class()
        await self.client.post(f"/classes/{cid}/members", json={"username": "student"})
        duplicate = await self.client.post(f"/classes/{cid}/members", json={"username": "student"})
        self.assertEqual(duplicate.status_code, 409)
        draft = await self.client.post(
            f"/classes/{cid}/materials",
            json={"title": "Draft", "content": "Belum terbit", "published": False},
        )
        mid = draft.json()["id"]
        self.actor = self.student
        self.assertEqual((await self.client.get(f"/classes/{cid}")).json()["materials"], [])
        self.assertEqual(
            (await self.client.get(f"/classes/{cid}/materials/{mid}")).status_code, 404
        )
        self.actor = self.teacher
        await self.client.delete(f"/classes/{cid}/members/{self.student.id}")
        self.actor = self.student
        self.assertEqual((await self.client.get(f"/classes/{cid}")).status_code, 404)
        self.actor = self.teacher
        response = await self.client.patch(f"/classes/{cid}", json={"is_archived": True})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            (
                await self.client.post(
                    f"/classes/{cid}/materials", json={"title": "x", "content": "y"}
                )
            ).status_code,
            409,
        )
        async with self.sessions() as s:
            self.assertGreaterEqual(
                len((await s.execute(select(ClassActivity))).scalars().all()), 5
            )

    async def test_invalid_and_wrong_role_members(self):
        self.assertEqual(
            (
                await self.client.post("/classes", json={"name": "  ", "subject": "Math"})
            ).status_code,
            422,
        )
        cid = await self.create_class()
        self.assertEqual(
            (
                await self.client.post(f"/classes/{cid}/members", json={"username": "other"})
            ).status_code,
            404,
        )
        self.assertEqual(
            (
                await self.client.post(
                    f"/classes/{cid}/materials", json={"title": "Empty", "content": "  "}
                )
            ).status_code,
            422,
        )

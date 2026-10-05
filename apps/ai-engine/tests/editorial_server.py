"""Opt-in local UI acceptance fixture. Never connects to the application DB.

Run: python -m tests.editorial_server
Dummy accounts: editorial-owner/reviewer/admin/student, password below.
The disposable schema is removed on graceful shutdown. No provider calls.
"""

from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

# Override before importing the cached settings. This fixture cannot read real
# provider credentials or inherit the main application's connection settings.
os.environ.update(
    ENV="test",
    DB_HOST="127.0.0.1",
    DB_PORT="5434",
    DB_NAME="kodmod_editorial_migration_test",
    DB_USER="kodmod",
    DB_PASSWORD="kodmod",
    OPENAI_API_KEY="test-key",
    ELEVENLABS_API_KEY="test-key",
    JWT_SECRET="editorial-fixture-only-secret-0123456789abcdef",
    CHECKPOINTER="memory",
    LANGCHAIN_TRACING_V2="false",
)

import uvicorn
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.dependencies import db_session
from api.routes import auth, classrooms, editorial_quizzes, subjects
from api.security import hash_password
from database.models import Base, Classroom, Enrollment, Subject, User

# Each run owns its schema, including after an interrupted earlier fixture.
SCHEMA = f"editorial_ui_fixture_{uuid.uuid4().hex}"
PASSWORD = "editorial-test-password-123"
URL = "postgresql+asyncpg://kodmod:kodmod@127.0.0.1:5434/kodmod_editorial_migration_test"
engine = create_async_engine(
    URL,
    connect_args={"server_settings": {"search_path": SCHEMA + ",public"}},
    execution_options={"schema_translate_map": {None: SCHEMA}},
)
factory = async_sessionmaker(engine, expire_on_commit=False)
fixture: dict[str, Any] = {}


async def seed_fixture():
    async with engine.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{SCHEMA}"'))
        await connection.run_sync(Base.metadata.create_all)
    async with factory() as session:
        users = {}
        for name, role in [
            ("owner", "teacher"),
            ("reviewer", "teacher"),
            ("admin", "admin"),
            ("student", "student"),
            ("outsider", "student"),
        ]:
            users[name] = User(
                username=f"editorial-{name}",
                full_name={
                    "owner": "Bu Rani",
                    "reviewer": "Pak Arya",
                    "admin": "Admin KODMOD",
                    "student": "Nadia Putri",
                    "outsider": "Siswa Lain",
                }[name],
                role=role,
                password_hash=hash_password(PASSWORD),
            )
            session.add(users[name])
        subject = Subject(name="Matematika")
        session.add(subject)
        await session.flush()
        classroom = Classroom(
            teacher_id=users["owner"].id,
            name="Matematika · Kelas 7A",
            subject="Matematika",
            description="Belajar pecahan melalui contoh dalam keseharian.",
        )
        session.add(classroom)
        await session.flush()
        session.add(Enrollment(class_id=classroom.id, student_id=users["student"].id))
        await session.commit()
        fixture.update(
            fixture="editorial-postgres",
            schema=SCHEMA,
            subject_id=str(subject.id),
            class_id=str(classroom.id),
            users={name: str(user.id) for name, user in users.items()},
        )


@asynccontextmanager
async def lifespan(_):
    try:
        await seed_fixture()
        yield
    finally:
        try:
            async with engine.begin() as connection:
                await connection.execute(text(f'DROP SCHEMA IF EXISTS "{SCHEMA}" CASCADE'))
        finally:
            await engine.dispose()


app = FastAPI(lifespan=lifespan)
app.include_router(auth.router, prefix="/auth")
app.include_router(classrooms.router, prefix="/classes")
app.include_router(subjects.router, prefix="/subjects")
app.include_router(editorial_quizzes.router)


async def transaction():
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[db_session] = transaction


@app.get("/fixture")
async def metadata():
    return fixture


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8118)

"""Versioned indexing and authorization for classroom-grounded tutoring."""

import logging
import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import ClassMaterial, Classroom, Enrollment, User
from database.session import async_session
from rag.ingestion import build_material_records
from rag.stores.pgvector_store import replace_material_chunks

log = logging.getLogger(__name__)


async def resolve_tutoring_context(
    session: AsyncSession,
    class_id: uuid.UUID | None,
    material_id: uuid.UUID | None,
    user: User,
) -> dict | None:
    """Recheck access and current indexing before every student Tutor turn."""
    if class_id is None:
        if material_id is not None:
            raise HTTPException(422, "Pilih kelas untuk materi ini.")
        return None
    if user.role != "student":
        raise HTTPException(403, "Tutor kelas hanya tersedia untuk siswa.")
    classroom = await session.get(Classroom, class_id)
    if (
        classroom is None
        or classroom.is_archived
        or await session.get(Enrollment, (class_id, user.id)) is None
    ):
        raise HTTPException(404, "Kelas atau materi tidak ditemukan.")
    material = None
    if material_id is not None:
        material = await session.get(ClassMaterial, material_id)
        if material is None or material.class_id != class_id or not material.published:
            raise HTTPException(404, "Kelas atau materi tidak ditemukan.")
        ready = (
            material.rag_status == "ready"
            and material.indexed_version == material.content_version
            and material.n_chunks > 0
        )
    else:
        ready = await session.scalar(
            select(func.count())
            .select_from(ClassMaterial)
            .where(
                ClassMaterial.class_id == class_id,
                ClassMaterial.published.is_(True),
                ClassMaterial.rag_status == "ready",
                ClassMaterial.indexed_version == ClassMaterial.content_version,
                ClassMaterial.n_chunks > 0,
            )
        )
    if not ready:
        raise HTTPException(
            409,
            "Materi belum siap untuk Tutor AI. Tunggu indeks selesai atau minta guru memproses ulang.",
        )
    return {
        "class_id": str(classroom.id),
        "material_id": str(material.id) if material else None,
        "subject_name": classroom.subject,
        "material_title": material.title if material else None,
    }


async def index_class_material(material_id: uuid.UUID, version: int) -> None:
    """Publish an index atomically; outdated jobs never replace newer content."""
    try:
        async with async_session() as session:
            row = await session.scalar(
                select(ClassMaterial).where(ClassMaterial.id == material_id).with_for_update()
            )
            if row is None or row.content_version != version or not row.published:
                return
            classroom = await session.get(Classroom, row.class_id)
            if classroom is None or classroom.is_archived:
                return
            if row.rag_status == "ready" and row.indexed_version == version:
                return
            row.rag_status = "processing"
            row.rag_error = None
            content, source = row.content, row.source_filename or row.title
            await session.commit()

        records = await build_material_records(content, source=source)
        if not records:
            raise ValueError("No material chunks")

        async with async_session() as session:
            row = await session.scalar(
                select(ClassMaterial).where(ClassMaterial.id == material_id).with_for_update()
            )
            if row is None or row.content_version != version or not row.published:
                return
            if row.rag_status == "ready" and row.indexed_version == version:
                return
            await replace_material_chunks(session, material_id, version, records)
            row.indexed_version = version
            row.n_chunks = len(records)
            row.rag_status = "ready"
            row.rag_error = None
            await session.commit()
    except Exception:
        log.exception("Classroom material indexing failed for %s", material_id)
        try:
            async with async_session() as session:
                row = await session.scalar(
                    select(ClassMaterial).where(ClassMaterial.id == material_id).with_for_update()
                )
                if row is not None and row.content_version == version and row.rag_status != "ready":
                    row.rag_status = "failed" if row.published else "pending"
                    row.rag_error = "Indeks AI belum berhasil dibuat. Periksa koneksi lalu gunakan Proses ulang."
                    await session.commit()
        except Exception:
            log.exception("Could not record material indexing failure for %s", material_id)

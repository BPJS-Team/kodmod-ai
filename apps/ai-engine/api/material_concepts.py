"""Explicit reviewed Concept mappings; never infer approval from a label."""

import uuid

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import ClassMaterial, Classroom, Concept, MaterialConcept, Subject, User


class MappingApproval(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_content_version: int = Field(ge=1)
    expected_mapping_version: int = Field(ge=0)
    concept_ids: list[uuid.UUID] = Field(max_length=30)
    primary_concept_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def unique_primary(self):
        if len(set(self.concept_ids)) != len(self.concept_ids):
            raise ValueError("Pilih setiap konsep satu kali.")
        if self.primary_concept_id and self.primary_concept_id not in self.concept_ids:
            raise ValueError("Konsep utama harus termasuk konsep yang dipilih.")
        return self


async def current_concepts(session: AsyncSession, material: ClassMaterial, classroom: Classroom):
    if not classroom.subject_id or not material.mapping_version:
        return []
    rows = (
        await session.execute(
            select(MaterialConcept, Concept)
            .join(Concept)
            .where(
                MaterialConcept.material_id == material.id,
                MaterialConcept.mapping_version == material.mapping_version,
                MaterialConcept.content_version == material.content_version,
                Concept.subject_id == classroom.subject_id,
                Concept.is_active.is_(True),
            )
            .order_by(MaterialConcept.is_primary.desc(), Concept.name)
        )
    ).all()
    return [
        {
            "id": str(concept.id),
            "name": concept.name,
            "primary": mapping.is_primary,
            "approved_by": str(mapping.approved_by) if mapping.approved_by else None,
            "approved_at": mapping.approved_at.isoformat(),
            "content_version": mapping.content_version,
            "mapping_version": mapping.mapping_version,
        }
        for mapping, concept in rows
    ]


async def mapping_out(session, material, classroom):
    return {
        "material_id": str(material.id),
        "subject_id": str(classroom.subject_id) if classroom.subject_id else None,
        "content_version": material.content_version,
        "mapping_version": material.mapping_version,
        "concepts": await current_concepts(session, material, classroom),
    }


async def approve_mapping(session, material, classroom, body: MappingApproval, actor: User):
    if (
        material.content_version != body.expected_content_version
        or material.mapping_version != body.expected_mapping_version
    ):
        raise HTTPException(409, "Materi atau pemetaan berubah. Muat ulang sebelum meninjau.")
    if body.concept_ids and not classroom.subject_id:
        raise HTTPException(422, "Pilih mata pelajaran kelas sebelum menyetujui konsep.")
    concepts = (
        list(
            (
                await session.scalars(
                    select(Concept)
                    .where(
                        Concept.id.in_(body.concept_ids),
                        Concept.subject_id == classroom.subject_id,
                        Concept.is_active.is_(True),
                    )
                    .with_for_update(read=True)
                )
            ).all()
        )
        if body.concept_ids
        else []
    )
    if len(concepts) != len(body.concept_ids):
        raise HTTPException(422, "Pilih konsep aktif dari mata pelajaran kelas ini.")
    material.mapping_version += 1
    material.rag_status, material.rag_error, material.n_chunks = "pending", None, 0
    for concept in concepts:
        session.add(
            MaterialConcept(
                material_id=material.id,
                mapping_version=material.mapping_version,
                content_version=material.content_version,
                concept_id=concept.id,
                is_primary=concept.id == body.primary_concept_id,
                approved_by=actor.id,
            )
        )
    await session.flush()


async def select_subject(session, subject_id: uuid.UUID | None):
    if subject_id is None:
        return None
    subject = await session.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(422, "Mata pelajaran tidak ditemukan.")
    return subject


async def change_subject(session, classroom, subject_id):
    subject = await select_subject(session, subject_id)
    if classroom.subject_id == subject_id:
        return []
    classroom.subject_id = subject_id
    if subject:
        classroom.subject = subject.name
    materials = list(
        (
            await session.scalars(
                select(ClassMaterial)
                .where(ClassMaterial.class_id == classroom.id)
                .order_by(ClassMaterial.id)
                .with_for_update()
            )
        ).all()
    )
    for material in materials:
        material.mapping_version += 1
        material.rag_status, material.rag_error, material.n_chunks = "pending", None, 0
    return materials

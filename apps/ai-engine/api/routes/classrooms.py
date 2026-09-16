"""Teacher-owned classes with private, accessible text materials.

Class content is deliberately separate from the shared curriculum/RAG store.
Every nested resource repeats the class membership check on the server.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import current_user, db_session, require_teacher
from database.models import ClassActivity, ClassMaterial, Classroom, Enrollment, User

router = APIRouter(tags=["classes"])


class ClassWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    subject: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)


class ClassUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_archived: bool | None = None


class MemberWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    username: str = Field(min_length=3, max_length=64)


class MaterialWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=100000)
    published: bool = False


async def accessible(session: AsyncSession, class_id: uuid.UUID, user: User, *, write=False):
    row = await session.get(Classroom, class_id)
    owner = row is not None and user.role == "teacher" and row.teacher_id == user.id
    member = (
        row is not None
        and user.role == "student"
        and not row.is_archived
        and await session.get(Enrollment, (class_id, user.id)) is not None
    )
    if row is None or not (owner or (member and not write)):
        raise HTTPException(404, "Kelas tidak ditemukan.")
    if write and row.is_archived:
        raise HTTPException(409, "Buka arsip kelas sebelum mengubah isinya.")
    return row


def record(session, row, user, action, target=None):
    session.add(
        ClassActivity(
            class_id=row.id,
            actor_id=user.id,
            action=action,
            target_id=str(target) if target else None,
        )
    )


async def summary(session, row, user):
    member_count = await session.scalar(
        select(func.count()).select_from(Enrollment).where(Enrollment.class_id == row.id)
    )
    material_query = (
        select(func.count()).select_from(ClassMaterial).where(ClassMaterial.class_id == row.id)
    )
    if user.role == "student":
        material_query = material_query.where(ClassMaterial.published.is_(True))
    teacher = await session.get(User, row.teacher_id)
    return {
        "id": str(row.id),
        "name": row.name,
        "subject": row.subject,
        "description": row.description,
        "is_archived": row.is_archived,
        "teacher_name": teacher.full_name if teacher else "Guru",
        "member_count": member_count,
        "material_count": await session.scalar(material_query),
        "created_at": row.created_at.isoformat(),
    }


def material_info(row):
    return {
        "id": str(row.id),
        "title": row.title,
        "published": row.published,
        "created_at": row.created_at.isoformat(),
    }


@router.get("")
async def list_classes(
    user: User = Depends(current_user), session: AsyncSession = Depends(db_session)
):
    stmt = select(Classroom).order_by(Classroom.created_at.desc())
    if user.role == "teacher":
        stmt = stmt.where(Classroom.teacher_id == user.id)
    elif user.role == "student":
        stmt = stmt.join(Enrollment).where(
            Enrollment.student_id == user.id, Classroom.is_archived.is_(False)
        )
    else:
        raise HTTPException(403, "Gunakan ruang guru atau siswa.")
    rows = (await session.execute(stmt)).scalars().all()
    return [await summary(session, row, user) for row in rows]


@router.post("", status_code=201)
async def create_class(
    body: ClassWrite,
    user: User = Depends(require_teacher),
    session: AsyncSession = Depends(db_session),
):
    row = Classroom(teacher_id=user.id, **body.model_dump())
    session.add(row)
    await session.flush()
    record(session, row, user, "class.created")
    return await summary(session, row, user)


@router.get("/{class_id}")
async def detail(
    class_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
):
    row = await accessible(session, class_id, user)
    result = await summary(session, row, user)
    query = (
        select(ClassMaterial)
        .where(ClassMaterial.class_id == row.id)
        .order_by(ClassMaterial.created_at.desc())
    )
    if user.role == "student":
        query = query.where(ClassMaterial.published.is_(True))
    result["materials"] = [material_info(m) for m in (await session.execute(query)).scalars()]
    result["members"] = []
    if user.role == "teacher":
        members = (
            await session.execute(
                select(User)
                .join(Enrollment, Enrollment.student_id == User.id)
                .where(Enrollment.class_id == row.id)
                .order_by(User.full_name)
            )
        ).scalars()
        result["members"] = [
            {
                "id": str(m.id),
                "full_name": m.full_name,
                "username": m.username,
                "is_active": m.is_active,
            }
            for m in members
        ]
    return result


@router.patch("/{class_id}")
async def update_class(
    class_id: uuid.UUID,
    body: ClassUpdate,
    user: User = Depends(require_teacher),
    session: AsyncSession = Depends(db_session),
):
    row = await accessible(session, class_id, user)
    for key, value in body.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(row, key, value)
    record(session, row, user, "class.updated")
    await session.flush()
    return await summary(session, row, user)


@router.post("/{class_id}/members", status_code=201)
async def add_member(
    class_id: uuid.UUID,
    body: MemberWrite,
    user: User = Depends(require_teacher),
    session: AsyncSession = Depends(db_session),
):
    row = await accessible(session, class_id, user, write=True)
    student = await session.scalar(
        select(User).where(
            User.username == body.username.lower(), User.role == "student", User.is_active.is_(True)
        )
    )
    if student is None:
        raise HTTPException(404, "Siswa aktif dengan username tersebut tidak ditemukan.")
    if await session.get(Enrollment, (class_id, student.id)):
        raise HTTPException(409, "Siswa sudah menjadi anggota kelas.")
    session.add(Enrollment(class_id=class_id, student_id=student.id))
    try:
        await session.flush()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(409, "Keanggotaan sudah berubah. Muat ulang kelas.") from error
    record(session, row, user, "member.added", student.id)
    return {"id": str(student.id)}


@router.delete("/{class_id}/members/{student_id}", status_code=204)
async def remove_member(
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    user: User = Depends(require_teacher),
    session: AsyncSession = Depends(db_session),
):
    row = await accessible(session, class_id, user, write=True)
    member = await session.get(Enrollment, (class_id, student_id))
    if member is None:
        raise HTTPException(404, "Anggota tidak ditemukan.")
    await session.delete(member)
    record(session, row, user, "member.removed", student_id)


@router.post("/{class_id}/materials", status_code=201)
async def create_material(
    class_id: uuid.UUID,
    body: MaterialWrite,
    user: User = Depends(require_teacher),
    session: AsyncSession = Depends(db_session),
):
    row = await accessible(session, class_id, user, write=True)
    material = ClassMaterial(class_id=class_id, **body.model_dump())
    session.add(material)
    await session.flush()
    record(session, row, user, "material.created", material.id)
    return material_info(material)


@router.get("/{class_id}/materials/{material_id}")
async def read_material(
    class_id: uuid.UUID,
    material_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
):
    await accessible(session, class_id, user)
    row = await session.get(ClassMaterial, material_id)
    if row is None or row.class_id != class_id or (user.role == "student" and not row.published):
        raise HTTPException(404, "Materi tidak ditemukan.")
    return {**material_info(row), "content": row.content}


@router.put("/{class_id}/materials/{material_id}")
async def edit_material(
    class_id: uuid.UUID,
    material_id: uuid.UUID,
    body: MaterialWrite,
    user: User = Depends(require_teacher),
    session: AsyncSession = Depends(db_session),
):
    classroom = await accessible(session, class_id, user, write=True)
    row = await session.get(ClassMaterial, material_id)
    if row is None or row.class_id != class_id:
        raise HTTPException(404, "Materi tidak ditemukan.")
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    record(session, classroom, user, "material.updated", row.id)
    await session.flush()
    return material_info(row)

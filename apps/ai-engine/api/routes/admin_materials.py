"""Admin catalog and moderation of reviewed classroom materials."""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, select

from api.dependencies import db_session, require_admin
from api.material_service import index_class_material
from api.routes.classrooms import MaterialWrite, material_info, record
from database.models import ClassMaterial, Classroom, User

router = APIRouter(tags=["admin-materials"])


def catalog_query():
    return (
        select(ClassMaterial, Classroom, User)
        .join(Classroom, ClassMaterial.class_id == Classroom.id)
        .join(User, Classroom.teacher_id == User.id)
    )


def catalog_item(material, classroom, teacher, *, content=False):
    result = {
        **material_info(material),
        "class_id": str(classroom.id),
        "class_name": classroom.name,
        "subject": classroom.subject,
        "is_archived": classroom.is_archived,
        "teacher_id": str(teacher.id),
        "teacher_name": teacher.full_name,
    }
    if content:
        result["content"] = material.content
    return result


@router.get("/materials")
async def list_materials(
    search: str = Query("", max_length=120),
    published: bool | None = None,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    actor=Depends(require_admin),
    session=Depends(db_session),
):
    query = catalog_query()
    if search.strip():
        # User text remains a literal substring, not a wildcard expression.
        value = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(ClassMaterial.title.ilike(f"%{value}%", escape="\\"))
    if published is not None:
        query = query.where(ClassMaterial.published.is_(published))
    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    rows = (
        await session.execute(
            query.order_by(ClassMaterial.created_at.desc(), ClassMaterial.id)
            .offset(offset)
            .limit(limit)
        )
    ).all()
    return {
        "items": [catalog_item(*row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


async def material_for(session, material_id, *, lock=False):
    query = catalog_query().where(ClassMaterial.id == material_id)
    if lock:
        query = query.with_for_update(of=ClassMaterial)
    row = (await session.execute(query)).one_or_none()
    if row is None:
        raise HTTPException(404, "Materi tidak ditemukan.")
    return row


@router.get("/materials/{material_id}")
async def read_material(
    material_id: uuid.UUID, actor=Depends(require_admin), session=Depends(db_session)
):
    return catalog_item(*await material_for(session, material_id), content=True)


@router.put("/materials/{material_id}")
async def update_material(
    material_id: uuid.UUID,
    body: MaterialWrite,
    background: BackgroundTasks,
    actor=Depends(require_admin),
    session=Depends(db_session),
):
    material, classroom, teacher = await material_for(session, material_id, lock=True)
    if classroom.is_archived:
        raise HTTPException(409, "Buka arsip kelas sebelum mengubah materi.")
    if material.content != body.content or material.source_filename != body.source_filename:
        material.content_version += 1
        material.n_chunks = 0
        material.rag_status, material.rag_error = "pending", None
    for key, value in body.model_dump().items():
        setattr(material, key, value)
    if not material.published:
        material.rag_status = "pending"
    elif material.indexed_version == material.content_version and material.n_chunks > 0:
        material.rag_status = "ready"
    record(session, classroom, actor, "material.admin-updated", material.id)
    await session.flush()
    await session.commit()
    if material.published and material.rag_status != "ready":
        background.add_task(index_class_material, material.id, material.content_version)
    return catalog_item(material, classroom, teacher, content=True)


@router.post("/materials/{material_id}/index", status_code=202)
async def reindex_material(
    material_id: uuid.UUID,
    background: BackgroundTasks,
    actor=Depends(require_admin),
    session=Depends(db_session),
):
    material, classroom, teacher = await material_for(session, material_id, lock=True)
    if classroom.is_archived or not material.published:
        raise HTTPException(409, "Materi harus terbit di kelas aktif sebelum diproses.")
    if material.rag_status != "ready" or material.indexed_version != material.content_version:
        material.rag_status, material.rag_error = "pending", None
        record(session, classroom, actor, "material.admin-index-requested", material.id)
        await session.commit()
        background.add_task(index_class_material, material.id, material.content_version)
    return catalog_item(material, classroom, teacher, content=True)

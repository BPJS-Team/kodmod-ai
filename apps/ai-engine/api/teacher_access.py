"""Classroom membership gates for teacher analytics and transcripts."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Classroom, Enrollment, LearningSession, User


def teacher_roster_query(teacher_id: uuid.UUID):
    return (
        select(User.id)
        .join(Enrollment, Enrollment.student_id == User.id)
        .join(Classroom, Classroom.id == Enrollment.class_id)
        .where(
            User.role == "student",
            User.is_active.is_(True),
            Classroom.teacher_id == teacher_id,
            Classroom.is_archived.is_(False),
        )
        .distinct()
    )


async def require_teacher_student(
    session: AsyncSession, teacher_id: uuid.UUID, student_id: uuid.UUID
) -> User:
    student = (
        await session.execute(
            select(User).where(User.id == student_id, User.id.in_(teacher_roster_query(teacher_id)))
        )
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such student.")
    return student


def teacher_session_scope(teacher_id: uuid.UUID):
    own_classes = select(Classroom.id).where(
        Classroom.teacher_id == teacher_id, Classroom.is_archived.is_(False)
    )
    return or_(LearningSession.class_id.is_(None), LearningSession.class_id.in_(own_classes))

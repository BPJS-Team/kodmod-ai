"""Operational admin metrics and a redacted activity feed.

The existing admin routes manage accounts and invitation codes.  This module
keeps operational visibility separate from those mutations so the dashboard
can load a bounded, safe feed without exposing passwords, access tokens, or
conversation text.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import db_session, require_admin
from config.settings import settings
from database.models import (
    ClassActivity,
    Classroom,
    InvitationCode,
    LearningSession,
    QuizSession,
    User,
)

router = APIRouter(
    tags=["admin-insights"],
    dependencies=[Depends(require_admin)],
)


async def _count(session: AsyncSession, model, *conditions) -> int:
    stmt = select(func.count()).select_from(model)
    if conditions:
        stmt = stmt.where(*conditions)
    return int(await session.scalar(stmt) or 0)


@router.get("/insights/overview")
async def overview(session: AsyncSession = Depends(db_session)) -> dict:
    """Return aggregate operational counts and redacted provider readiness."""
    total_users = await _count(session, User)
    students = await _count(session, User, User.role == "student")
    teachers = await _count(session, User, User.role == "teacher")
    admins = await _count(session, User, User.role == "admin")
    active_users = await _count(session, User, User.is_active.is_(True))
    active_invitations = await _count(session, InvitationCode, InvitationCode.is_active.is_(True))
    classrooms = await _count(session, Classroom)
    learning_sessions = await _count(session, LearningSession)
    open_sessions = await _count(session, LearningSession, LearningSession.ended_at.is_(None))
    quiz_sessions = await _count(session, QuizSession)

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "users": {
            "total": total_users,
            "active": active_users,
            "students": students,
            "teachers": teachers,
            "admins": admins,
        },
        "learning": {
            "classrooms": classrooms,
            "sessions": learning_sessions,
            "open_sessions": open_sessions,
            "quiz_sessions": quiz_sessions,
        },
        "invitations": {"active": active_invitations},
        "providers": {
            "elevenlabs": {
                "configured": bool(settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_TTS_VOICE_ID),
                "tts_backend": settings.TTS_BACKEND,
                "stt_backend": settings.STT_BACKEND,
            }
        },
    }


@router.get("/activity")
async def activity(
    limit: int = Query(default=30, ge=1, le=100),
    session: AsyncSession = Depends(db_session),
) -> dict:
    """Return recent metadata-only events for operational review."""
    class_rows = (
        await session.execute(
            select(ClassActivity, User.full_name, User.role, Classroom.name)
            .outerjoin(User, ClassActivity.actor_id == User.id)
            .join(Classroom, ClassActivity.class_id == Classroom.id)
            .order_by(ClassActivity.created_at.desc())
            .limit(limit)
        )
    ).all()
    session_rows = (
        await session.execute(
            select(LearningSession, User.full_name)
            .join(User, LearningSession.student_id == User.id)
            .order_by(LearningSession.started_at.desc())
            .limit(limit)
        )
    ).all()
    quiz_rows = (
        await session.execute(
            select(QuizSession, User.full_name)
            .join(User, QuizSession.student_id == User.id)
            .order_by(QuizSession.started_at.desc())
            .limit(limit)
        )
    ).all()

    events: list[dict] = []
    for row, actor_name, actor_role, class_name in class_rows:
        events.append(
            {
                "id": str(row.id),
                "type": "class_activity",
                "action": row.action,
                "actor_name": actor_name or "Pengguna dihapus",
                "actor_role": actor_role,
                "target_name": class_name,
                "occurred_at": row.created_at.isoformat() if row.created_at else None,
            }
        )
    for row, student_name in session_rows:
        events.append(
            {
                "id": str(row.id),
                "type": "learning_session",
                "action": "session.ended" if row.ended_at else "session.started",
                "actor_name": student_name,
                "actor_role": "student",
                "target_name": row.title or "Sesi tanpa judul",
                "occurred_at": (
                    row.ended_at or row.started_at
                ).isoformat()
                if (row.ended_at or row.started_at)
                else None,
            }
        )
    for row, student_name in quiz_rows:
        events.append(
            {
                "id": str(row.id),
                "type": "quiz_session",
                "action": f"quiz.{row.status}",
                "actor_name": student_name,
                "actor_role": "student",
                "target_name": "Latihan adaptif",
                "occurred_at": (
                    row.ended_at or row.started_at
                ).isoformat()
                if (row.ended_at or row.started_at)
                else None,
            }
        )

    events.sort(key=lambda item: item.get("occurred_at") or "", reverse=True)
    return {
        "items": events[:limit],
        "limit": limit,
        "generated_at": datetime.now(UTC).isoformat(),
    }

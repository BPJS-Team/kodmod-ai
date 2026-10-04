"""Operational admin metrics and a redacted activity feed.

The existing admin routes manage accounts and invitation codes.  This module
keeps operational visibility separate from those mutations so the dashboard
can load a bounded, safe feed without exposing passwords, access tokens, or
conversation text.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import db_session, require_admin
from config.settings import settings
from database.models import (
    AuditEvent,
    ClassActivity,
    Classroom,
    InvitationCode,
    LearningSession,
    QuizSession,
    User,
)
from voice.elevenlabs import get_subscription_info

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
    voice_enabled = settings.TTS_BACKEND == "elevenlabs" or settings.STT_BACKEND == "elevenlabs"
    voice_configured = (
        (settings.TTS_BACKEND != "elevenlabs" or bool(settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_TTS_VOICE_ID))
        and (settings.STT_BACKEND != "elevenlabs" or bool(settings.ELEVENLABS_API_KEY))
    )

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
                "enabled": voice_enabled,
                "configured": voice_configured,
                "tts_backend": settings.TTS_BACKEND,
                "stt_backend": settings.STT_BACKEND,
            }
        },
    }


@router.get("/activity")
async def activity(
    limit: int = Query(default=30, ge=1, le=100),
    category: str | None = Query(default=None, max_length=50),
    session: AsyncSession = Depends(db_session),
) -> dict:
    """Return recent metadata-only events for operational review."""
    events: list[dict] = []

    # 1. Audit events (account, auth, invitation, admin actions)
    if category is None or category in {"account", "invitation", "auth", "admin"}:
        audit_stmt = select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit)
        if category:
            audit_stmt = audit_stmt.where(AuditEvent.category == category)
        audit_rows = (await session.execute(audit_stmt)).scalars().all()
        for row in audit_rows:
            events.append(
                {
                    "id": str(row.id),
                    "type": "audit_event",
                    "category": row.category,
                    "action": row.action,
                    "actor_name": row.actor_name or "Sistem",
                    "actor_role": row.actor_role,
                    "target_name": row.target_name or (row.target_type or "Aksi sistem"),
                    "details": row.details,
                    "occurred_at": row.created_at.isoformat() if row.created_at else None,
                }
            )

    # 2. Classroom activities
    if category is None or category == "classroom":
        class_rows = (
            await session.execute(
                select(ClassActivity, User.full_name, User.role, Classroom.name)
                .outerjoin(User, ClassActivity.actor_id == User.id)
                .join(Classroom, ClassActivity.class_id == Classroom.id)
                .order_by(ClassActivity.created_at.desc())
                .limit(limit)
            )
        ).all()
        for row, actor_name, actor_role, class_name in class_rows:
            events.append(
                {
                    "id": str(row.id),
                    "type": "class_activity",
                    "category": "classroom",
                    "action": row.action,
                    "actor_name": actor_name or "Pengguna dihapus",
                    "actor_role": actor_role,
                    "target_name": class_name,
                    "occurred_at": row.created_at.isoformat() if row.created_at else None,
                }
            )

    # 3. Learning sessions
    if category is None or category == "learning":
        session_rows = (
            await session.execute(
                select(LearningSession, User.full_name)
                .join(User, LearningSession.student_id == User.id)
                .order_by(LearningSession.started_at.desc())
                .limit(limit)
            )
        ).all()
        for row, student_name in session_rows:
            events.append(
                {
                    "id": str(row.id),
                    "type": "learning_session",
                    "category": "learning",
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

    # 4. Quiz sessions
    if category is None or category == "quiz":
        quiz_rows = (
            await session.execute(
                select(QuizSession, User.full_name)
                .join(User, QuizSession.student_id == User.id)
                .order_by(QuizSession.started_at.desc())
                .limit(limit)
            )
        ).all()
        for row, student_name in quiz_rows:
            events.append(
                {
                    "id": str(row.id),
                    "type": "quiz_session",
                    "category": "quiz",
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
        "category": category,
        "generated_at": datetime.now(UTC).isoformat(),
    }


@router.get("/insights/ai-usage")
async def ai_usage(session: AsyncSession = Depends(db_session),
    days: int = Query(7, ge=1, le=90), page: int = Query(1, ge=1, le=10000), limit: int = Query(20, ge=1, le=100),
    provider: Literal["openai", "elevenlabs"] | None = None,
    status: Literal["success", "error", "cancelled", "cache_hit"] | None = None,
    search: str = Query("", max_length=120)) -> dict:
    """Live provider quota and configuration; unknown metrics stay unknown."""
    quota = await get_subscription_info()
    available = bool(quota.get("available"))
    from api.provider_insights import measured_usage
    measured = await measured_usage(session, days=days, page=page, limit=limit, provider=provider, status=status, search=search)
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "elevenlabs": {
            "enabled": settings.TTS_BACKEND == "elevenlabs" or settings.STT_BACKEND == "elevenlabs",
            "configured": bool(settings.ELEVENLABS_API_KEY),
            "available": available,
            "tier": quota.get("tier") if available else None,
            "character_count": quota.get("character_count") if available else None,
            "character_limit": quota.get("character_limit") if available else None,
            "next_reset_unix": quota.get("next_reset_unix") if available else None,
            "tts_model": settings.ELEVENLABS_TTS_MODEL,
            "tts_voice_id": settings.ELEVENLABS_TTS_VOICE_ID,
            "stt_backend": settings.STT_BACKEND,
        },
        "openai": {
            "configured": bool(settings.OPENAI_API_KEY),
            **measured.pop("openai_usage"),
            "models": {
                "tutor": settings.LLM_TUTOR_MODEL,
                "router": settings.LLM_ROUTER_MODEL,
                "quiz": settings.LLM_QUIZ_MODEL,
                "embedding": settings.EMBEDDING_MODEL,
            },
        },
        **measured,
        "session_counts": {
            "learning": await _count(session, LearningSession),
            "assessments": await _count(session, QuizSession),
        },
    }

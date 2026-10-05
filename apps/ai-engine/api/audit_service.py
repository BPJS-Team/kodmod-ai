"""Audit service for recording persistent, metadata-only activity events."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from database.models import AuditEvent, User


def record_audit(
    session: AsyncSession,
    *,
    action: str,
    category: str = "account",
    actor: User | None = None,
    actor_id: uuid.UUID | None = None,
    actor_name: str | None = None,
    actor_role: str | None = None,
    target_type: str | None = None,
    target_id: str | uuid.UUID | None = None,
    target_name: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditEvent:
    """Record an audit event into the active session without flushing or committing.

    Actor and target names are snapshot strings to preserve history even if entities
    are deleted. Sensitive data (passwords, tokens, raw conversational chat texts)
    must never be passed in details.
    """
    event = AuditEvent(
        actor_id=actor.id if actor else actor_id,
        actor_name=actor.full_name if actor else actor_name,
        actor_role=actor.role if actor else actor_role,
        category=category,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        target_name=target_name,
        details=details,
    )
    session.add(event)
    return event

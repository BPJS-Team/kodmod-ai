"""Guided learning API. SQL owns progress; LangGraph runs teaching actions."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select

from api.dependencies import db_session, require_student
from api.learning_service import apply_learning_action, lesson_out, start_lesson
from database.models import LearningSession
from models.learning import LearningAction, LearningOut, LearningStart

router = APIRouter(tags=["learning"])
log = logging.getLogger(__name__)


@router.post("/start", response_model=LearningOut)
async def start(body: LearningStart, student=Depends(require_student), session=Depends(db_session)):
    try:
        return await start_lesson(session, student, body)
    except HTTPException:
        raise
    except Exception:
        log.exception("Could not prepare guided learning")
        raise HTTPException(503, "Penjelasan belum dapat disiapkan. Coba lagi.") from None


@router.get("/active", response_model=list[LearningOut])
async def active(student=Depends(require_student), session=Depends(db_session)):
    rows = (await session.scalars(select(LearningSession).where(
        LearningSession.student_id == student.id, LearningSession.ended_at.is_(None),
        LearningSession.guided_state.is_not(None)
    ).order_by(LearningSession.started_at.desc()).limit(50))).all()
    outputs = []
    for row in rows:
        try:
            outputs.append(await lesson_out(session, row, student))
        except HTTPException as exc:
            if exc.status_code not in (404, 409):
                raise
    return outputs


@router.get("/sessions/{session_id}", response_model=LearningOut)
async def recover(session_id: uuid.UUID, student=Depends(require_student), session=Depends(db_session)):
    from api.learning_service import owned_lesson
    row, material = await owned_lesson(session, session_id, student)
    return await lesson_out(session, row, student, material)


@router.post("/sessions/{session_id}/actions", response_model=LearningOut)
async def action(session_id: uuid.UUID, body: LearningAction, request: Request,
                 student=Depends(require_student), session=Depends(db_session)):
    try:
        result = await apply_learning_action(session, request.app.state.graph, student, session_id, body)
        await session.commit()
        return result
    except HTTPException:
        raise
    except Exception:
        log.exception("Could not apply guided action %s", body.request_id)
        raise HTTPException(503, "Tindakan belum dapat dipastikan. Coba kirim ulang tindakan yang sama.") from None

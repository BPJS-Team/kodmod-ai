"""Adaptive quiz REST endpoints with durable, transactional submissions."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from api.assessment_service import start_assessment, submit_assessment
from api.dependencies import require_student
from database.models import User
from database.session import async_session
from models.quiz import QuizStartRequest, QuizStartResponse, QuizSubmitRequest, QuizSubmitResponse

log = logging.getLogger(__name__)
router = APIRouter(tags=["quiz"])


@router.post("/start", response_model=QuizStartResponse)
async def start_quiz(
    request: Request, body: QuizStartRequest, student: User = Depends(require_student)
):
    """Create and commit an owned adaptive quiz before returning its first question."""
    try:
        async with async_session() as session:
            response = await start_assessment(session, request.app.state.graph, student, body)
        return response
    except HTTPException:
        raise
    except Exception:
        log.exception("Could not create assessment session")
        raise HTTPException(503, "Latihan belum dapat disiapkan. Coba lagi.") from None


@router.post("/submit", response_model=QuizSubmitResponse)
async def submit_answer(
    request: Request, body: QuizSubmitRequest, student: User = Depends(require_student)
):
    """Accept one answer atomically or replay the same committed submission result."""
    try:
        async with async_session() as session:
            response = await submit_assessment(session, request.app.state.graph, student, body)
        return response
    except HTTPException:
        raise
    except Exception:
        log.exception("Could not accept assessment submission %s", body.submission_id)
        raise HTTPException(
            503, "Hasil belum dapat dipastikan. Kirim ulang jawaban yang sama."
        ) from None


async def _load_mastery(student_id: str) -> tuple[dict, dict]:
    """Compatibility helper for other graph entry points."""
    from analytics.student_model import StudentModel

    model = await StudentModel.load(student_id)
    return await model.mastery_scores(), dict(model._confidence)

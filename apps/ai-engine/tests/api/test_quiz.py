"""Stage 4 §7 - /quiz endpoints.

Spec: docs/assessment-api.md and docs/testplan/04-api.md §7.
"""

from __future__ import annotations

import uuid

import pytest

pytestmark = [pytest.mark.api, pytest.mark.asyncio(loop_scope="session")]


async def test_km_api_070_quiz_start(client, student_factory, concept_ids, auth_headers) -> None:  # type: ignore[no-untyped-def]
    st, tok = await student_factory()
    r = await client.post(
        "/quiz/start",
        headers=auth_headers(tok),
        json={
            "concept_id": concept_ids["pecahan"],
            "n_questions": 3,
            "difficulty": "easy",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert {"quiz_session_id", "first_question", "total_questions"} <= set(body)


async def test_km_api_071_quiz_start_load_mastery_ok(
    client, student_factory, concept_ids, auth_headers
) -> None:  # type: ignore[no-untyped-def]
    st, tok = await student_factory()
    r = await client.post(
        "/quiz/start",
        headers=auth_headers(tok),
        json={"concept_id": concept_ids["pecahan"], "n_questions": 2},
    )
    assert r.status_code != 500


async def test_km_api_072_quiz_submit(client, student_factory, auth_headers) -> None:  # type: ignore[no-untyped-def]
    _st, tok = await student_factory()
    r = await client.post(
        "/quiz/submit",
        headers=auth_headers(tok),
        json={
            "quiz_session_id": str(uuid.uuid4()),
            "question_id": str(uuid.uuid4()),
            "submission_id": str(uuid.uuid4()),
            "student_answer": "A",
        },
    )
    assert r.status_code == 404


async def test_km_api_073_quiz_submit_completes(
    client, student_factory, concept_ids, auth_headers
) -> None:  # type: ignore[no-untyped-def]
    st, tok = await student_factory()
    start = await client.post(
        "/quiz/start",
        headers=auth_headers(tok),
        json={"concept_id": concept_ids["pecahan"], "n_questions": 1},
    )
    assert start.status_code == 200
    sess = start.json()["quiz_session_id"]
    sub = await client.post(
        "/quiz/submit",
        headers=auth_headers(tok),
        json={
            "quiz_session_id": sess,
            "question_id": start.json()["first_question"]["question_id"],
            "submission_id": str(uuid.uuid4()),
            "student_answer": "A",
        },
    )
    assert sub.status_code == 200, sub.text
    assert sub.json()["quiz_complete"] is True
    assert sub.json()["final_summary"]


async def test_km_api_074_quiz_start_ignores_any_body_student_id(
    client, student_factory, concept_ids, auth_headers
) -> None:  # type: ignore[no-untyped-def]
    """The quiz belongs to the token holder; a stray student_id in the body is inert."""
    _st, tok = await student_factory()
    r = await client.post(
        "/quiz/start",
        headers=auth_headers(tok),
        json={
            "student_id": str(uuid.uuid4()),  # ignored: not part of the schema
            "concept_id": concept_ids["pecahan"],
            "n_questions": 1,
        },
    )
    assert r.status_code != 403

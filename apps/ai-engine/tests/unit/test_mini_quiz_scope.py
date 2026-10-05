"""Mini-quiz attribution and persistence boundaries for classroom tutoring."""

import json
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from agents import quiz_agent
from analytics import student_model

pytestmark = [pytest.mark.unit]


@pytest.mark.parametrize("scope", ["class", "material", "selected_material"])
@pytest.mark.parametrize("requested_topic", ["", "Pecahan senilai"])
async def test_unmapped_classroom_mini_quiz_keeps_material_topic_without_concept(
    monkeypatch, scope, requested_topic
):
    stale_concept = str(uuid.uuid4())
    prompts = []

    class MiniQuizLLM:
        async def ainvoke(self, messages):
            prompts.append(messages[-1]["content"])
            return SimpleNamespace(
                content=json.dumps(
                    {
                        "text": "Berapa pecahan yang senilai dengan satu per dua?",
                        "expected_answer": "Dua per empat",
                        "concept_id": stale_concept,
                    }
                )
            )

    monkeypatch.setattr(quiz_agent, "get_quiz_llm", lambda: MiniQuizLLM())
    result = await quiz_agent.mini_quiz_node(
        {
            "class_id": None if scope == "material" else str(uuid.uuid4()),
            "material_id": None if scope == "class" else str(uuid.uuid4()),
            "current_topic": requested_topic,
            "current_concept_id": stale_concept,
            "generated_response": "Satu per dua sama dengan dua per empat.",
            "retrieved_docs": [
                {"material_title": "Pecahan senilai", "concept_ids": [stale_concept]}
            ],
        }
    )

    assert result["quiz_question"]["concept_id"] == ""
    assert result["quiz_questions"][0]["concept_id"] == ""
    assert "Topic: Pecahan senilai" in prompts[0]
    assert stale_concept not in prompts[0]
    assert "Satu per dua sama dengan dua per empat." in prompts[0]


@pytest.mark.parametrize("assessment_managed", [False, True])
async def test_managed_mini_quiz_leaves_redis_persistence_to_assessment(
    monkeypatch, assessment_managed
):
    stored_sessions = []

    async def store_quiz_session(session_id, payload):
        stored_sessions.append((session_id, payload))

    class MiniQuizLLM:
        async def ainvoke(self, messages):
            return SimpleNamespace(content='{"text":"Apa itu pecahan?","expected_answer":"Bagian"}')

    monkeypatch.setattr("memory.short_term.store_quiz_session", store_quiz_session)
    monkeypatch.setattr(quiz_agent, "get_quiz_llm", lambda: MiniQuizLLM())
    result = await quiz_agent.mini_quiz_node(
        {
            "session_id": "session-1",
            "current_concept_id": str(uuid.uuid4()),
            "assessment_managed": assessment_managed,
        }
    )

    if assessment_managed:
        assert stored_sessions == []
    else:
        assert stored_sessions == [("session-1", result)]


async def test_standalone_mini_quiz_keeps_its_selected_concept(monkeypatch):
    concept_id = str(uuid.uuid4())
    prompts = []

    class MiniQuizLLM:
        async def ainvoke(self, messages):
            prompts.append(messages[-1]["content"])
            return SimpleNamespace(content='{"text":"Apa itu pecahan?","expected_answer":"Bagian"}')

    monkeypatch.setattr(quiz_agent, "get_quiz_llm", lambda: MiniQuizLLM())
    result = await quiz_agent.mini_quiz_node({"current_concept_id": concept_id})

    assert result["quiz_question"]["concept_id"] == concept_id
    assert f"Concept: {concept_id}" in prompts[0]


@pytest.mark.parametrize("managed", [False, True])
@pytest.mark.parametrize("scope", ["class", "material", "selected_material"])
async def test_old_scoped_mini_quiz_uuid_never_updates_global_mastery(monkeypatch, managed, scope):
    existing_concept, stale_concept = str(uuid.uuid4()), str(uuid.uuid4())
    student_id = str(uuid.uuid4())
    model = student_model.StudentModel(
        student_id,
        _scores={existing_concept: 0.7},
        _confidence={existing_concept: 0.8},
        _attempts={existing_concept: 4},
    )
    load, persist, store, clear = (
        AsyncMock(return_value=model),
        AsyncMock(),
        AsyncMock(),
        AsyncMock(),
    )
    monkeypatch.setattr(student_model.StudentModel, "load", load)
    monkeypatch.setattr(student_model.StudentModel, "persist", persist)
    monkeypatch.setattr("memory.short_term.store_quiz_session", store)
    monkeypatch.setattr("memory.short_term.clear_quiz_session", clear)
    result = await student_model.update_student_model_node(
        {
            "student_id": student_id,
            "session_id": "old-mini-quiz",
            "assessment_managed": managed,
            "class_id": None if scope == "material" else str(uuid.uuid4()),
            "material_id": None if scope == "class" else str(uuid.uuid4()),
            "mastery_scores": {existing_concept: 0.7},
            "mastery_confidence": {existing_concept: 0.8},
            "quiz_questions": [{"question_id": "old-q", "concept_id": stale_concept}],
            "quiz_attempts": [{"question_id": "old-q", "score": 1.0, "confidence": 0.9}],
            "current_question_index": 0,
        }
    )
    assert result["mastery_scores"] == {existing_concept: 0.7}
    assert result["mastery_confidence"] == {existing_concept: 0.8}
    assert model._attempts == {existing_concept: 4}
    assert result["mastery_applied_attempts"] == 1
    assert result["current_question_index"] == 1
    persist.assert_not_called()
    store.assert_not_called()
    if managed:
        load.assert_not_called()
        clear.assert_not_called()
    else:
        clear.assert_awaited_once_with("old-mini-quiz")

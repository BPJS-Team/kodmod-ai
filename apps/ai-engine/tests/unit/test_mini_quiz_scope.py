"""Mini-quiz attribution and persistence boundaries for classroom tutoring."""

import json
import uuid
from types import SimpleNamespace

import pytest

from agents import quiz_agent

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
            "retrieved_docs": [{"material_title": "Pecahan senilai", "concept_ids": [stale_concept]}],
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

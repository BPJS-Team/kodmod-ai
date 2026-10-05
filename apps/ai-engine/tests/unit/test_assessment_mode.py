"""Managed REST assessment nodes must not commit evidence independently."""

import uuid
from unittest.mock import AsyncMock

from agents import analytics_agent, intent_router, scoring_agent
from analytics import student_model


async def test_managed_answer_does_not_classify_meta_commands(monkeypatch):
    classifier = AsyncMock()
    monkeypatch.setattr(intent_router, "get_router_llm", lambda: classifier)
    result = await intent_router.intent_router_node(
        {
            "assessment_managed": True,
            "intent": "quiz",
            "user_input": "stop",
            "student_answer": "stop",
            "quiz_session_id": "quiz",
            "quiz_questions": [{"question_id": "q"}],
            "current_question_index": 0,
        }
    )
    assert result["intent"] == "quiz"
    assert result["student_answer"] == "stop"
    classifier.ainvoke.assert_not_called()


async def test_managed_scoring_does_not_write_redis(monkeypatch):
    from memory import short_term

    store = AsyncMock()
    monkeypatch.setattr(short_term, "store_quiz_session", store)
    await scoring_agent._persist_progress(
        {"assessment_managed": True, "session_id": "quiz"}, [], 1, 0.0
    )
    store.assert_not_called()


async def test_managed_mastery_is_only_a_preview(monkeypatch):
    from memory import short_term

    load, persist, store, clear = AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    monkeypatch.setattr(student_model.StudentModel, "load", load)
    monkeypatch.setattr(student_model.StudentModel, "persist", persist)
    monkeypatch.setattr(short_term, "store_quiz_session", store)
    monkeypatch.setattr(short_term, "clear_quiz_session", clear)
    cid = str(uuid.uuid4())
    result = await student_model.update_student_model_node(
        {
            "assessment_managed": True,
            "student_id": str(uuid.uuid4()),
            "session_id": "quiz",
            "mastery_scores": {cid: 0.5},
            "mastery_confidence": {cid: 0.5},
            "quiz_questions": [{"question_id": "q", "concept_id": cid}],
            "quiz_attempts": [{"question_id": "q", "score": 1.0, "confidence": 0.9}],
        }
    )
    assert result["mastery_scores"][cid] == 0.6125
    assert result["current_question_index"] == 1
    assert result["mastery_applied_attempts"] == 1
    load.assert_not_called()
    persist.assert_not_called()
    store.assert_not_called()
    clear.assert_not_called()


async def test_managed_analytics_uses_pending_state_without_database_writes(monkeypatch):
    read, save = AsyncMock(), AsyncMock()
    monkeypatch.setattr(analytics_agent.StudentAggregator, "summarise", read)
    monkeypatch.setattr(analytics_agent, "save_analytics_report", save)
    result = await analytics_agent.analytics_node(
        {
            "assessment_managed": True,
            "student_id": str(uuid.uuid4()),
            "mastery_scores": {"a": 0.6, "b": 0.8},
            "cumulative_quiz_score": 0.9,
        }
    )
    assert result["analytics_summary"]["overall_mastery"] == 0.7
    assert result["analytics_summary"]["avg_quiz_score"] == 0.9
    read.assert_not_called()
    save.assert_not_called()

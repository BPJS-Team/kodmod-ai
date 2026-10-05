"""Localized deterministic analytics must work without an LLM call."""

import pytest

from analytics.insights import (
    generate_cohort_alerts,
    generate_insights,
    generate_student_spoken_summary,
    generate_teacher_summary,
)

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "window,phrase",
    [("today", "today"), ("week", "past 7 days"), ("month", "past 30 days"), ("all", "so far")],
)
def test_student_spoken_summary_uses_selected_language_and_window(window, phrase):
    result = generate_student_spoken_summary(
        {"student_name": "Budi", "n_sessions": 2, "window": window, "quiz_accuracy": 0.8},
        language="en",
    )
    assert "Hello Budi" in result
    assert "80 percent" in result
    assert phrase in result.lower()
    assert "persen" not in result


def test_formal_answers_are_described_even_without_a_tutor_session():
    result = generate_student_spoken_summary(
        {"student_name": "Budi", "n_sessions": 0, "n_quiz_attempts": 1, "quiz_accuracy": 1},
        language="id",
    )
    assert "100 persen" in result
    assert "belum belajar sama sekali" not in result


def test_english_teacher_insights_and_cohort_alerts():
    result = generate_teacher_summary(
        {"student_name": "Budi", "n_quiz_attempts": 3, "quiz_accuracy": 0.3, "window": "all"},
        language="en",
    )
    assert "quiz accuracy 30%" in result["headline"]
    assert result["alerts"][0]["title"] == "Budi: low accuracy"
    alerts = generate_cohort_alerts(
        {
            "cohort_weak_concepts": [
                {"concept_name": "Fractions", "avg_mastery": 0.4, "n_students": 2}
            ]
        },
        language="en",
    )
    assert alerts[0]["title"] == "Needs practice: Fractions"


@pytest.mark.parametrize("audience", ["student", "teacher"])
async def test_no_llm_and_failed_polish_keep_the_selected_language(monkeypatch, audience):
    def unavailable():
        raise RuntimeError("offline")

    monkeypatch.setattr("analytics.insights.get_recommendation_llm", unavailable)
    data = {"student_name": "Budi", "n_sessions": 2, "quiz_accuracy": 0.8, "window": "month"}
    deterministic = await generate_insights(data, audience=audience, language="en")
    fallback = await generate_insights(data, audience=audience, language="en", use_llm=True)
    assert fallback == deterministic
    assert "past 30 days" in fallback["spoken"]

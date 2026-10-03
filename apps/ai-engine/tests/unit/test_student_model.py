"""Unit tests for analytics/student_model.StudentModel BKT logic."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from analytics.student_model import StudentModel


@pytest.fixture
def model():
    return StudentModel(student_id="00000000-0000-0000-0000-000000000001")


async def test_correct_answer_increases_mastery(model):
    initial = (await model.mastery_scores()).get("c1", 0.5)
    model.update(concept_id="c1", attempt_score=1.0)
    after = (await model.mastery_scores())["c1"]
    assert after > initial


async def test_wrong_answer_decreases_or_dampens(model):
    model.update(concept_id="c1", attempt_score=1.0)
    after_correct = (await model.mastery_scores())["c1"]
    model.update(concept_id="c1", attempt_score=0.0)
    after_wrong = (await model.mastery_scores())["c1"]
    assert after_wrong <= after_correct


async def test_mastery_bounded_0_1(model):
    for _ in range(50):
        model.update(concept_id="c1", attempt_score=1.0)
    assert 0.0 <= (await model.mastery_scores())["c1"] <= 1.0


async def test_decay_reduces_mastery_over_time(model):
    model.update(concept_id="c1", attempt_score=1.0)
    before = (await model.mastery_scores())["c1"]
    model._last_practiced["c1"] = datetime.now(UTC) - timedelta(days=30)
    model.apply_decay()
    after = (await model.mastery_scores())["c1"]
    assert after < before


def test_weak_concepts_returns_lowest_first(model):
    model.update(concept_id="hard", attempt_score=0.0)
    model.update(concept_id="easy", attempt_score=1.0)
    model.update(concept_id="easy", attempt_score=1.0)
    weak = model.weak_concepts(2)
    assert weak[0] == "hard"


def test_overall_mastery_average(model):
    model.update(concept_id="a", attempt_score=1.0)
    model.update(concept_id="b", attempt_score=0.0)
    overall = model.overall_mastery()
    assert 0.0 <= overall <= 1.0

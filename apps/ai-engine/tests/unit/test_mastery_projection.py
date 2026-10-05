"""Inactivity affects a snapshot once, with consistent UTC day boundaries."""

from datetime import UTC, datetime

import pytest
from freezegun import freeze_time

from analytics.student_model import StudentModel

pytestmark = pytest.mark.unit


def test_repeated_decay_read_is_stable_then_advances_one_day():
    model = StudentModel(
        "student",
        _scores={"concept": 0.8},
        _last_practiced={"concept": datetime(2026, 1, 1, 12, tzinfo=UTC)},
    )
    with freeze_time("2026-01-31 12:00:00", real_asyncio=True) as clock:
        model.apply_decay()
        model.apply_decay()
        assert model.overall_mastery() == pytest.approx(0.65)
        clock.move_to("2026-02-01 12:00:00")
        model.apply_decay()
        assert model.overall_mastery() == pytest.approx(0.645)


def test_naive_historical_timestamp_is_read_as_utc():
    model = StudentModel(
        "student",
        _scores={"concept": 0.8},
        _last_practiced={"concept": datetime(2026, 1, 1, 12)},
    )
    with freeze_time("2026-01-31 12:00:00", real_asyncio=True):
        model.apply_decay()
    assert model.overall_mastery() == pytest.approx(0.65)

"""Editorial payload bounds and student contract disclosure checks."""

import uuid
from copy import deepcopy

import pytest
from pydantic import ValidationError

from models.editorial_quiz import AssignInput, DraftInput, StudentQuestion

pytestmark = pytest.mark.contract


def body():
    return {
        "subject_id": str(uuid.uuid4()),
        "title": "Pecahan",
        "questions": [
            {
                "order_index": 1,
                "prompt": "Satu dibagi dua?",
                "options": [{"id": "a", "label": "Setengah"}, {"id": "b", "label": "Satu"}],
                "correct_option_id": "a",
            }
        ],
    }


@pytest.mark.parametrize(
    "mutation",
    [
        lambda b: b.update(title=" "),
        lambda b: b.update(title="a" * 201),
        lambda b: b.update(description="a" * 2001),
        lambda b: b.update(questions=[]),
        lambda b: b.update(questions=b["questions"] * 21),
        lambda b: b["questions"][0].update(prompt="a" * 4001),
        lambda b: b["questions"][0].update(narration="a" * 6001),
        lambda b: b["questions"][0].update(explanation="a" * 4001),
        lambda b: b["questions"][0].update(correct_option_id="missing"),
        lambda b: b["questions"][0].update(difficulty="extreme"),
        lambda b: b["questions"][0].update(order_index=2),
        lambda b: b["questions"][0]["options"].pop(),
        lambda b: b["questions"][0]["options"].extend([{"id": "c", "label": "c"}] * 5),
        lambda b: b["questions"][0]["options"][1].update(id="a"),
        lambda b: b["questions"][0]["options"][1].update(label="  "),
    ],
)
def test_invalid_draft_is_rejected(mutation):
    candidate = deepcopy(body())
    mutation(candidate)
    with pytest.raises(ValidationError):
        DraftInput.model_validate(candidate)


def test_schedule_requires_timezone_and_utc_order():
    base = {"version_id": str(uuid.uuid4()), "class_id": str(uuid.uuid4())}
    with pytest.raises(ValidationError):
        AssignInput.model_validate(base | {"opens_at": "2026-10-05T10:00:00"})
    with pytest.raises(ValidationError):
        AssignInput.model_validate(
            base | {"opens_at": "2026-10-05T11:00:00Z", "due_at": "2026-10-05T10:00:00Z"}
        )
    valid = AssignInput.model_validate(base | {"opens_at": "2026-10-05T11:00:00+07:00"})
    assert valid.opens_at.hour == 4


def test_student_contract_has_no_key_explanation_or_rubric():
    assert set(StudentQuestion.model_fields) == {
        "id",
        "order_index",
        "prompt",
        "narration",
        "options",
        "concept_id",
    }

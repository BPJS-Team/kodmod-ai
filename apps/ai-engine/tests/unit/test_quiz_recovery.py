"""SQL recovery is independent of app checkpoints and never reveals answers."""

from tests.assessment_test import assessment_http as assessment_http
from tests.assessment_test import start, submission


async def test_recovery_restores_cursor_after_restart_without_graph(assessment_http):
    client, factory, controls, graph, concept, stranger = assessment_http
    opened = await start(client, concept, count=2)
    result = await client.post("/quiz/submit", json=submission(opened))
    assert result.status_code == 200
    calls = graph.calls
    recovered = await client.get(f"/quiz/sessions/{opened['quiz_session_id']}")
    assert recovered.status_code == 200
    body = recovered.json()
    assert body["answered_questions"] == 1
    assert body["current_question"]["question_id"] == result.json()["next_question"]["question_id"]
    assert "expected_answer" not in recovered.text and "correct_answer" not in recovered.text
    assert graph.calls == calls
    assert len((await client.get("/quiz/active")).json()) == 1
    controls["actor"] = stranger
    assert (await client.get(f"/quiz/sessions/{opened['quiz_session_id']}")).status_code == 404
    assert (await client.get("/quiz/active")).json() == []


async def test_completed_session_restores_committed_result(assessment_http):
    client, _, _, _, concept, _ = assessment_http
    opened = await start(client, concept)
    result = (await client.post("/quiz/submit", json=submission(opened))).json()
    recovered = (await client.get(f"/quiz/sessions/{opened['quiz_session_id']}")).json()
    assert recovered["status"] == "completed"
    assert recovered["current_question"] is None
    assert recovered["last_result"] == result
    assert (await client.get("/quiz/active")).json() == []


async def test_material_pair_and_curriculum_scope_are_validated(assessment_http):
    import uuid

    client, _, _, graph, concept, _ = assessment_http
    for payload in [
        {"material_id": str(uuid.uuid4())},
        {"class_id": str(uuid.uuid4())},
        {
            "concept_id": str(concept.id),
            "class_id": str(uuid.uuid4()),
            "material_id": str(uuid.uuid4()),
        },
        {"student_id": str(uuid.uuid4())},
    ]:
        assert (await client.post("/quiz/start", json=payload)).status_code == 422
    assert graph.calls == 0

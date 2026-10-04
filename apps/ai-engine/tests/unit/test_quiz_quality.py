"""Generation must yield usable source-backed questions or an explicit failure."""

import json
from types import SimpleNamespace

import pytest

from agents import problem_generator as generator


def question(**updates):
    return {
        "text": "Apa arti pecahan senilai?",
        "type": "spoken",
        "expected_answer": "Pecahan yang memiliki nilai sama",
        "source_indices": [1],
        **updates,
    }


@pytest.mark.parametrize(
    "questions",
    [
        [],
        [question(expected_answer="(open-ended)")],
        [question(expected_answer="")],
        [question(source_indices=[9])],
        [question(source_indices=[])],
        [question(type="mcq", options=["A. satu", "B. dua"], expected_answer="A")],
        [
            question(
                type="mcq",
                options=["A. satu", "B. dua", "C. tiga", "D. empat"],
                expected_answer="Z",
            )
        ],
        [question(), question()],
    ],
)
def test_invalid_set_has_no_filler(questions):
    with pytest.raises(ValueError):
        generator.validate_generated_questions(json.dumps({"questions": questions}), 1, 1)


async def test_failed_set_can_be_replaced_by_real_provider_questions(monkeypatch):
    calls = []

    class LLM:
        async def ainvoke(self, messages):
            calls.append(messages)
            return SimpleNamespace(
                content=json.dumps({"questions": [] if len(calls) == 1 else [question()]})
            )

    async def retrieve(*args, **kwargs):
        return [{"text": "Pecahan senilai memiliki nilai yang sama."}]

    monkeypatch.setattr(generator.RAGTool, "retrieve", retrieve)
    monkeypatch.setattr(generator, "get_quiz_llm", lambda: LLM())
    result = await generator.problem_generator_node({"class_id": "class", "quiz_n_questions": 1})
    assert len(calls) == 2
    assert result["quiz_questions"][0]["expected_answer"] == "Pecahan yang memiliki nilai sama"


async def test_no_source_never_calls_provider(monkeypatch):
    async def empty(*args, **kwargs):
        return []

    monkeypatch.setattr(generator.RAGTool, "retrieve", empty)
    monkeypatch.setattr(
        generator, "get_quiz_llm", lambda: pytest.fail("No source must stop generation")
    )
    with pytest.raises(ValueError, match="source"):
        await generator.problem_generator_node({"quiz_n_questions": 1})


async def test_english_learner_can_use_indonesian_class_material(monkeypatch):
    import uuid

    from rag import retriever

    captured = []

    async def embed(texts):
        return [[0.1]]

    async def query(vector, **filters):
        captured.append(filters)
        return [{"text": "Materi Indonesia"}] if filters.get("language") is None else []

    monkeypatch.setattr(retriever, "embed_text", embed)
    monkeypatch.setattr(retriever.pgvector_store, "query", query)
    docs = await retriever.retrieve(
        "Explain", class_id=uuid.uuid4(), student_id=uuid.uuid4(), language="en", use_reranker=False
    )
    assert docs[0]["text"] == "Materi Indonesia"
    assert captured[0]["class_id"] is not None

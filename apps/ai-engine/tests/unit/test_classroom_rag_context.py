"""Offline boundaries for scoped retrieval and source disclosure."""

import uuid
from types import SimpleNamespace

import pytest

from agents import problem_generator
from tools import rag_tool

pytestmark = pytest.mark.unit


async def test_lost_class_scope_never_falls_back_to_general_tutoring(monkeypatch):
    from fastapi import HTTPException

    from rag import retriever

    async def embed(texts):
        return [[0.1]]

    async def empty(*args, **kwargs):
        return []

    monkeypatch.setattr(retriever, "embed_text", embed)
    monkeypatch.setattr(retriever.pgvector_store, "query", empty)
    with pytest.raises(HTTPException) as unavailable:
        await retriever.retrieve("Jelaskan", class_id=uuid.uuid4(), student_id=uuid.uuid4())
    assert unavailable.value.status_code == 409


async def test_malformed_class_scope_is_denied_before_shared_retrieval(monkeypatch):
    from fastapi import HTTPException

    from rag import retriever

    async def shared(*args, **kwargs):
        return [{"text": "Shared knowledge"}]

    monkeypatch.setattr(retriever, "retrieve", shared)
    with pytest.raises(HTTPException):
        await retriever.rag_retrieval_node(
            {"user_input": "Jelaskan", "class_id": "not-a-uuid", "student_id": str(uuid.uuid4())}
        )


async def test_rag_tool_keeps_material_identity_for_source_disclosure(monkeypatch):
    async def embed(texts):
        return [[0.1]]

    async def search(**kwargs):
        return [
            {
                "id": "chunk-1",
                "text": "Pecahan senilai",
                "source": "buku.pdf",
                "score": 0.9,
                "class_id": "class-1",
                "material_id": "material-1",
                "material_title": "Pecahan",
                "concept_id": "concept-1",
                "concept_ids": ["concept-1"],
            }
        ]

    monkeypatch.setattr(rag_tool, "embed_text", embed)
    monkeypatch.setattr(rag_tool.settings, "RAG_RERANK_ENABLED", False)
    tool = rag_tool.RAGTool()
    monkeypatch.setattr(tool._store, "similarity_search", search)
    docs = await tool.retrieve("Pecahan")
    assert docs[0].get("material_id") == "material-1"
    assert docs[0].get("class_id") == "class-1"
    assert docs[0].get("material_title") == "Pecahan"
    assert docs[0].get("concept_id") == "concept-1"


async def test_quiz_questions_use_selected_class_material_instead_of_shared_knowledge(monkeypatch):
    cid, mid, sid = (str(uuid.uuid4()) for _ in range(3))

    async def retrieve(self, query, k, filters):
        authorized = (
            filters.get("class_id") == cid
            and filters.get("material_id") == mid
            and filters.get("student_id") == sid
        )
        return [{"text": "Bahan kelas yang dipilih" if authorized else "Kurikulum umum"}]

    class ContextLLM:
        async def ainvoke(self, messages):
            grounded = "Bahan kelas yang dipilih" in messages[-1]["content"]
            return SimpleNamespace(
                content='{"questions":[{"text":"'
                + ("Latihan materi pilihan" if grounded else "Latihan umum")
                + '","expected_answer":"A"}]}'
            )

    monkeypatch.setattr(problem_generator.RAGTool, "retrieve", retrieve)
    monkeypatch.setattr(problem_generator, "get_quiz_llm", lambda: ContextLLM())
    result = await problem_generator.problem_generator_node(
        {
            "student_id": sid,
            "class_id": cid,
            "material_id": mid,
            "current_concept_id": "general",
            "quiz_n_questions": 1,
        }
    )
    assert result["quiz_questions"][0]["text"] == "Latihan materi pilihan"

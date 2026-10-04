import asyncio
from types import SimpleNamespace

from tools.llm_client import language_instruction


async def test_parallel_students_keep_their_own_language():
    async def prompt(language):
        await asyncio.sleep(0)
        return language_instruction(language)

    indonesian, english = await asyncio.gather(prompt("id"), prompt("en"))
    assert "Bahasa Indonesia" in indonesian
    assert "English" in english
    assert "English" not in indonesian


async def test_tutor_uses_language_from_each_turn_state(monkeypatch):
    from agents import tutoring_agent

    class Tutor:
        async def ainvoke(self, messages):
            await asyncio.sleep(0)
            return SimpleNamespace(content="English reply" if "in English," in messages[0].content
                                   else "Jawaban Indonesia")

    monkeypatch.setattr(tutoring_agent, "get_tutor_llm", Tutor)
    answers = await asyncio.gather(*(tutoring_agent.tutoring_node({
        "user_input": "Test", "learning_profile": {"language": lang}
    }) for lang in ["id", "en"]))
    assert [answer["generated_response"] for answer in answers] == ["Jawaban Indonesia", "English reply"]

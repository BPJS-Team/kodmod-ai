"""Subject catalog writes must not cross teacher ownership boundaries."""

import pytest
from sqlalchemy import select

from database.models import Document, Subject
from database.session import async_session

pytestmark = [pytest.mark.api, pytest.mark.asyncio(loop_scope="session")]


@pytest.mark.parametrize("method", ["patch", "delete"])
async def test_other_teacher_cannot_change_subject(
    client, teacher_factory, subject_factory, method
):
    owner, _ = await teacher_factory()
    _, token = await teacher_factory()
    subject = await subject_factory(created_by=owner.id)
    payload = (
        {"json": {"name": "Unauthorized rename", "description": "changed"}}
        if method == "patch"
        else {}
    )
    response = await getattr(client, method)(
        f"/subjects/{subject.id}", headers={"Authorization": f"Bearer {token}"}, **payload
    )
    assert response.status_code == 403, response.text
    async with async_session() as session:
        stored = await session.get(Subject, subject.id)
        assert stored is not None and stored.name == subject.name


@pytest.mark.parametrize("resource", ["concepts", "documents"])
async def test_other_teacher_cannot_add_subject_content(
    client, teacher_factory, subject_factory, resource
):
    owner, _ = await teacher_factory()
    _, token = await teacher_factory()
    subject = await subject_factory(created_by=owner.id)
    payload = (
        {
            "json": {
                "subject_id": str(subject.id),
                "name": "Injected concept",
                "slug": f"injected-{subject.id}",
            }
        }
        if resource == "concepts"
        else {"files": {"file": ("injected.txt", b"Unauthorized content", "text/plain")}}
    )
    response = await client.post(
        f"/subjects/{subject.id}/{resource}",
        headers={"Authorization": f"Bearer {token}"},
        **payload,
    )
    assert response.status_code == 403, response.text


async def test_other_teacher_cannot_delete_subject_document(
    client, teacher_factory, subject_factory, tmp_path
):
    owner, _ = await teacher_factory()
    _, token = await teacher_factory()
    subject = await subject_factory(created_by=owner.id)
    stored_file = tmp_path / "teacher-document.txt"
    stored_file.write_text("Original teaching content", encoding="utf-8")
    async with async_session() as session:
        document = Document(
            subject_id=subject.id,
            uploaded_by=owner.id,
            filename=stored_file.name,
            stored_path=str(stored_file),
            size_bytes=stored_file.stat().st_size,
            status="ready",
        )
        session.add(document)
        await session.flush()
        document_id = document.id
    response = await client.delete(
        f"/documents/{document_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403, response.text
    assert stored_file.read_text(encoding="utf-8") == "Original teaching content"
    async with async_session() as session:
        assert await session.get(Document, document_id) is not None


@pytest.mark.parametrize("role", ["teacher", "admin"])
async def test_subject_owner_and_admin_can_edit_catalog(
    client, user_factory, subject_factory, role
):
    owner, owner_token = await user_factory("teacher")
    token = owner_token if role == "teacher" else (await user_factory("admin"))[1]
    subject = await subject_factory(created_by=owner.id)
    response = await client.patch(
        f"/subjects/{subject.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": f"Reviewed {subject.id}", "description": "Reviewed subject"},
    )
    assert response.status_code == 200, response.text
    async with async_session() as session:
        assert (
            await session.scalar(select(Subject.name).where(Subject.id == subject.id))
            == f"Reviewed {subject.id}"
        )

"""Bounded document extraction for teacher review before material publication."""

import io
import zipfile
from pathlib import PurePosixPath

from defusedxml import ElementTree
from fastapi import HTTPException, UploadFile
from pypdf import PdfReader

from config.settings import settings

ALLOWED_IMPORTS = {".pdf", ".docx", ".md", ".txt"}
MAX_CONTENT = 100000
MAX_DOCX_EXPANDED = 50 * 1024 * 1024
MAX_DOCX_XML = 10 * 1024 * 1024
WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def safe_filename(filename: str | None) -> str:
    return PurePosixPath((filename or "materi.txt").replace("\\", "/")).name[:300]


def extract_document(data: bytes, filename: str) -> dict:
    """Return editable text; images, scan OCR and page citations are not inferred."""
    suffix = PurePosixPath(filename).suffix.lower()
    warnings = []
    try:
        if suffix == ".pdf":
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted or len(reader.pages) > 150:
                raise ValueError("Gunakan PDF tanpa sandi, maksimal 150 halaman.")
            pages = []
            for page in reader.pages:
                pages.append(page.extract_text() or "")
                if sum(map(len, pages)) > MAX_CONTENT:
                    raise ValueError(
                        "Teks melebihi 100.000 karakter. Pisahkan dokumen menjadi beberapa materi."
                    )
            content = "\n\n".join(pages)
            warnings.append(
                "Periksa rumus, tabel, dan urutan teks. Gambar atau hasil scan belum dibaca otomatis."
            )
        elif suffix == ".docx":
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                entries = archive.infolist()
                if (
                    len(entries) > 1000
                    or sum(entry.file_size for entry in entries) > MAX_DOCX_EXPANDED
                ):
                    raise ValueError("Paket DOCX terlalu besar setelah dibuka.")
                document = archive.getinfo("word/document.xml")
                if document.file_size > MAX_DOCX_XML:
                    raise ValueError("Isi DOCX terlalu besar. Pisahkan menjadi beberapa materi.")
                root = ElementTree.fromstring(archive.read(document))
                content = "\n".join(
                    "".join(node.itertext())
                    for paragraph in root.iter(f"{WORD_NS}p")
                    for node in [paragraph]
                )
            warnings.append(
                "Periksa urutan tabel dan rumus. Gambar dan tata letak tidak disertakan."
            )
        else:
            content = data.decode("utf-8-sig", errors="strict")
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            422, "Berkas tidak dapat dibaca. Gunakan PDF, DOCX, atau teks yang valid."
        ) from exc

    content = content.strip()
    if not content or "\0" in content:
        raise HTTPException(
            422,
            "Tidak ditemukan teks yang dapat dibaca. Untuk PDF scan, gunakan OCR atau salin teks terlebih dahulu.",
        )
    if len(content) > MAX_CONTENT:
        raise HTTPException(
            422, "Teks melebihi 100.000 karakter. Pisahkan dokumen menjadi beberapa materi."
        )
    return {
        "filename": filename,
        "title": PurePosixPath(filename).stem[:200],
        "content": content,
        "warnings": warnings,
    }


async def import_document(file: UploadFile) -> dict:
    filename = safe_filename(file.filename)
    if PurePosixPath(filename).suffix.lower() not in ALLOWED_IMPORTS:
        raise HTTPException(415, "Gunakan berkas PDF, DOCX, Markdown (.md), atau teks (.txt).")
    data = bytearray()
    while chunk := await file.read(1024 * 1024):
        data.extend(chunk)
        if len(data) > settings.MAX_UPLOAD_BYTES:
            raise HTTPException(413, f"Berkas maksimal {settings.MAX_UPLOAD_MB} MB.")
    if not data:
        raise HTTPException(422, "Berkas kosong.")
    # The parser runs outside the event loop so larger PDFs do not block requests.
    from starlette.concurrency import run_in_threadpool

    return await run_in_threadpool(extract_document, bytes(data), filename)

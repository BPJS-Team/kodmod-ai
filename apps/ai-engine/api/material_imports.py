"""Bounded document extraction for teacher review before material publication."""

import io
import zipfile
from pathlib import PurePosixPath

from defusedxml import ElementTree
from fastapi import HTTPException, UploadFile
from pypdf import PdfReader

from api.pdf_sections import suggest_sections
from config.settings import settings

ALLOWED_IMPORTS = {".pdf", ".docx", ".md", ".txt"}
MAX_CONTENT = 100000
MAX_PDF_PAGES = 500
MAX_SELECTED_PAGES = 150
MAX_DOCX_EXPANDED = 50 * 1024 * 1024
MAX_DOCX_XML = 10 * 1024 * 1024
WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def safe_filename(filename: str | None) -> str:
    return PurePosixPath((filename or "materi.txt").replace("\\", "/")).name[:300]


def extract_document(data: bytes, filename: str, *, first_page: int | None = None, last_page: int | None = None) -> dict:
    """Return editable text; images, scan OCR and page citations are not inferred."""
    suffix = PurePosixPath(filename).suffix.lower()
    warnings = []
    metadata = {"preview_type": "material", "sections": []}
    selected = first_page is not None or last_page is not None
    if selected and suffix != ".pdf":
        raise HTTPException(422, "Pilihan halaman hanya tersedia untuk PDF.")
    try:
        if suffix == ".pdf":
            reader = PdfReader(io.BytesIO(data))
            total = len(reader.pages)
            if reader.is_encrypted or not total or total > MAX_PDF_PAGES:
                raise ValueError("Gunakan PDF tanpa sandi, maksimal 500 halaman.")
            if selected and (first_page is None or last_page is None or not 1 <= first_page <= last_page <= total
                             or last_page - first_page + 1 > MAX_SELECTED_PAGES):
                raise ValueError("Pilih halaman awal dan akhir yang valid, maksimal 150 halaman per materi.")
            cache = {}

            def page_text(index):
                if index not in cache:
                    cache[index] = reader.pages[index].extract_text() or ""
                return cache[index]

            first, last = (first_page, last_page) if selected else (1, total)
            metadata.update(total_pages=total, page_range={"first": first, "last": last})
            pages, characters = [], 0
            if selected or total <= MAX_SELECTED_PAGES:
                for index in range(first - 1, last):
                    text = page_text(index)
                    characters += len(text) + (2 if pages else 0)
                    if characters > MAX_CONTENT:
                        if selected:
                            raise ValueError("Teks melebihi 100.000 karakter. Pilih rentang halaman yang lebih kecil.")
                        break
                    pages.append(text)
            if not selected and (total > MAX_SELECTED_PAGES or characters > MAX_CONTENT):
                return {
                    "filename": filename, "title": PurePosixPath(filename).stem[:200],
                    "content": "", "preview_type": "book", "total_pages": total,
                    "page_range": None, "sections": suggest_sections(reader, page_text),
                    "warnings": ["Pilih bab atau rentang halaman, lalu tinjau teksnya. Pembagian bab adalah saran dan belum menyimpan materi."],
                }
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
        **metadata,
    }


async def import_document(file: UploadFile, *, first_page: int | None = None, last_page: int | None = None) -> dict:
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

    return await run_in_threadpool(extract_document, bytes(data), filename, first_page=first_page, last_page=last_page)

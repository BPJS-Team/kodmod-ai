"""Real PDF parsing with isolated synthetic documents, without providers or DB."""
import io

import pytest
from fastapi import HTTPException
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from api.material_imports import extract_document

pytestmark = pytest.mark.unit


def pdf(texts, bookmarks=()):
    writer = PdfWriter()
    font = writer._add_object(DictionaryObject({
        NameObject("/Type"): NameObject("/Font"),
        NameObject("/Subtype"): NameObject("/Type1"),
        NameObject("/BaseFont"): NameObject("/Helvetica"),
    }))
    for text in texts:
        page = writer.add_blank_page(width=300, height=300)
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({NameObject("/F1"): font}),
        })
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 20 200 Td " + b" ".join(
            b"(" + line.encode() + b") Tj 0 -14 Td" for line in text.split("\n")) + b" ET")
        page[NameObject("/Contents")] = writer._add_object(stream)
    for title, page in bookmarks:
        writer.add_outline_item(title, page - 1)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_module_stays_one_editable_material():
    result = extract_document(pdf(["Bangun datar", "Persegi dan segitiga"]), "modul.pdf")
    assert result["preview_type"] == "material"
    assert result["total_pages"] == 2
    assert result["page_range"] == {"first": 1, "last": 2}
    assert "Persegi dan segitiga" in result["content"]
    assert result["sections"] == []


def test_large_book_returns_reviewable_outline_without_saving_or_truncating():
    data = pdf(["Isi halaman"] * 160, [("Bab 1 Pecahan", 5), ("Bab 2 Persamaan", 86)])
    result = extract_document(data, "buku.pdf")
    assert result["preview_type"] == "book"
    assert result["total_pages"] == 160
    assert result["content"] == ""
    chapters = [section for section in result["sections"] if section["kind"] == "chapter"]
    assert [(chapter["title"], chapter["first"], chapter["last"]) for chapter in chapters] == [
        ("Bab 1 Pecahan", 5, 85), ("Bab 2 Persamaan", 86, 160),
    ]


def test_headings_fallback_ignores_toc_and_repeated_running_headers():
    texts = ["Isi halaman"] * 160
    texts[1] = "Daftar Isi\nBab 1 Pecahan .... 1\nBab 2 Persamaan .... 80"
    texts[4] = "Bab 1 Pecahan\nMulai belajar"
    texts[5] = "Bab 1 Pecahan\nIsi berikutnya"
    texts[85] = "Bab 2 Persamaan\nMulai belajar"
    result = extract_document(pdf(texts), "buku.pdf")
    chapters = [section for section in result["sections"] if section["kind"] == "chapter"]
    assert [(chapter["first"], chapter["last"]) for chapter in chapters] == [(5, 85), (86, 160)]


def test_selected_pages_only_are_extracted_from_large_book():
    data = pdf(["Prakata", "Bab 1 Pecahan", "Isi pecahan", "Bab 2 Persamaan"] + ["Lainnya"] * 156)
    result = extract_document(data, "buku.pdf", first_page=2, last_page=3)
    assert result["preview_type"] == "material"
    assert result["page_range"] == {"first": 2, "last": 3}
    assert "Isi pecahan" in result["content"]
    assert "Prakata" not in result["content"] and "Persamaan" not in result["content"]


def test_multiline_chapter_covers_keep_the_title_and_first_page():
    texts = ["Isi"] * 160
    texts[4] = "1\nEksponen dan\nLogaritma\nBab\nPengalaman Belajar\nSetelah mempelajari..."
    texts[85] = "Bab 2\nMembangun Budaya\nTaat Hukum\nKEMENTERIAN PENDIDIKAN\nISBN: 123"
    result = extract_document(pdf(texts), "buku.pdf")
    assert [(section["first"], section["title"]) for section in result["sections"]] == [
        (5, "Bab 1 · Eksponen dan Logaritma"), (86, "Bab 2 · Membangun Budaya Taat Hukum"),
    ]


@pytest.mark.parametrize("first,last", [(0, 2), (2, 1), (1, 161), (1, None), (None, 2), (1, 160)])
def test_invalid_or_unbounded_selection_is_rejected(first, last):
    with pytest.raises(HTTPException) as error:
        extract_document(pdf(["Isi"] * 160), "buku.pdf", first_page=first, last_page=last)
    assert error.value.status_code == 422


def test_character_limit_is_a_selection_prompt_for_book_but_never_truncates_range():
    data = pdf(["A" * 60000, "B" * 60000])
    result = extract_document(data, "buku.pdf")
    assert result["preview_type"] == "book"
    with pytest.raises(HTTPException) as error:
        extract_document(data, "buku.pdf", first_page=1, last_page=2)
    assert error.value.status_code == 422
    assert "100.000" in error.value.detail


def test_selected_scan_requires_ocr_and_ranges_are_pdf_only():
    with pytest.raises(HTTPException) as error:
        extract_document(pdf([""]), "scan.pdf", first_page=1, last_page=1)
    assert "OCR" in error.value.detail
    with pytest.raises(HTTPException) as error:
        extract_document(b"Isi teks", "materi.txt", first_page=1, last_page=1)
    assert error.value.status_code == 422


def test_pdf_total_page_limit_remains_bounded():
    with pytest.raises(HTTPException) as error:
        extract_document(pdf(["Isi"] * 501), "buku.pdf")
    assert error.value.status_code == 422


def test_ocr_mixed_pdf_records_page_method_and_confidence_for_teacher_review(monkeypatch):
    from api import pdf_ocr
    seen = []
    def recognize(data, index):
        seen.append(index)
        return {"text": "Hasil scan pecahan", "confidence": 67.5}
    monkeypatch.setattr(pdf_ocr, "recognize_page", recognize)
    result = extract_document(pdf(["Teks asli pada halaman pertama", ""]), "campuran.pdf", allow_ocr=True)
    assert seen == [1]
    assert [(page["page"], page["method"], page["confidence"]) for page in result["pages"]] == [(1, "native", None), (2, "ocr", 67.5)]
    assert any("gambar" in warning for warning in result["warnings"])


def test_long_scan_offers_ranges_before_attempting_ocr(monkeypatch):
    from api import pdf_ocr
    def forbidden(*args):
        raise AssertionError("An entire scan book must not be OCRed automatically")
    monkeypatch.setattr(pdf_ocr, "recognize_page", forbidden)
    result = extract_document(pdf([""] * 40), "scan-book.pdf", allow_ocr=True)
    assert result["preview_type"] == "book" and result["sections"]

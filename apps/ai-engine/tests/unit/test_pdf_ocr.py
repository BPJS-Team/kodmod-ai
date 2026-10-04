"""Actual PDF rendering with an isolated OCR subprocess contract."""
from pathlib import Path
from types import SimpleNamespace

from PIL import Image

from api import pdf_ocr
from config.settings import settings
from tests.unit.test_book_import import pdf


def test_pdf_renderer_uses_bounded_private_image_and_fixed_tesseract_arguments(monkeypatch):
    seen = []
    monkeypatch.setattr(pdf_ocr.shutil, "which", lambda name: str(Path("/test/tesseract").resolve()))
    def recognize(arguments, **options):
        assert arguments[2:] == ["stdout", "-l", "ind+eng", "--oem", "1", "--psm", "3", "tsv"]
        with Image.open(arguments[1]) as image:
            assert image.width * image.height <= settings.OCR_MAX_PIXELS
        assert options["timeout"] == settings.OCR_PAGE_TIMEOUT
        assert options["check"] is True and options["capture_output"] is True
        assert "shell" not in options
        seen.append(arguments[1])
        return SimpleNamespace(stdout=b"level\tblock_num\tpar_num\tline_num\tconf\ttext\n5\t1\t1\t1\t90\tPecahan\n5\t1\t1\t1\t80\tsenilai\n")
    monkeypatch.setattr(pdf_ocr.subprocess, "run", recognize)
    result = pdf_ocr.recognize_page(pdf([""]), 0)
    assert result == {"text": "Pecahan senilai", "confidence": 85.0}
    assert seen and not Path(seen[0]).exists(), "Temporary rendered image must be removed"

"""Conservative chapter suggestions; teachers review ranges before publication."""
import re

CHAPTER = re.compile(r"(?im)^[ \t]*(?:bab|chapter)\s+([0-9]+|[ivxlcdm]+)\b[ \t]*([^\n]*)")
REVERSE_CHAPTER = re.compile(r"(?im)^\s*([1-9]|[12][0-9])\s*\n(?:[^\n]{1,70}\n){1,5}Bab[ \t]*\n")
BOOKMARK_CHAPTER = re.compile(r"(?i)(?:^|[_\s])(?:bab|chapter)[ _-]*([0-9]+|[ivxlcdm]+)\b")
TEXT_BUDGET = 2_000_000


def chapter_title(text, number, fallback=""):
    match = next((item for item in CHAPTER.finditer(text) if item[1].upper() == number.upper()), None)
    if fallback and not re.search(r"_", fallback):
        return fallback.strip()[:200]
    prefix = f"Bab {number}"
    if "Pengalaman Belajar" in text and len(text) < 2000:
        cover = text.split("Pengalaman Belajar", 1)[0].strip().splitlines()
        lines = [line.strip() for line in cover if line.strip()
                 and not re.match(r"(?i)^(?:\d+|bab|chapter|matematika untuk)\b", line.strip())]
        if lines:
            return (prefix + " · " + " ".join(lines))[:200]
    if not match:
        return prefix
    tail = match[2].strip(" |:.-–")
    if tail:
        return f"{prefix} · {tail}"[:200]
    after = text[match.end():].strip().splitlines()[:3]
    title_lines = []
    for line in after:
        line = line.strip()
        if not line or len(line) > 65 or re.search(r"(?i)kementerian|isbn|penulis|tujuan|kata kunci|republik|pendidikan", line):
            break
        title_lines.append(line)
    if not title_lines:
        before = text[:match.start()].strip().splitlines()[-4:]
        title_lines = [line.strip() for line in before if 0 < len(line.strip()) < 65
                       and line.strip()[0].isupper() and line.strip()[-1] not in ".!?;"]
    return (prefix + (" · " + " ".join(title_lines) if title_lines else ""))[:200]


def suggest_sections(reader, page_text):
    total = len(reader.pages)
    chapters, boundaries = {}, set()

    def visit(entries):
        for item in entries:
            if isinstance(item, list):
                visit(item)
                continue
            try:
                first = reader.get_destination_page_number(item) + 1
                if not 1 <= first <= total:
                    continue
                boundaries.add(first)
                match = BOOKMARK_CHAPTER.search(str(item.title))
                if match:
                    number = match[1].upper()
                    chapters.setdefault(number, (first, chapter_title(page_text(first - 1), number, str(item.title))))
            except (AttributeError, KeyError, TypeError, ValueError):
                continue

    visit(reader.outline)
    if not chapters:
        scanned = 0
        for index in range(total):
            text = page_text(index)
            scanned += len(text)
            if scanned > TEXT_BUDGET:
                break
            # TOCs repeat chapter names. Running headers repeat a chapter already seen.
            if re.search(r"(?i)daftar\s+isi|table\s+of\s+contents", text) or len(re.findall(r"\.{3,}", text)) >= 3:
                continue
            matches = list(CHAPTER.finditer(text[:1800]))
            if not matches and "Pengalaman Belajar" in text and len(text) < 2000:
                reverse = REVERSE_CHAPTER.search(text)
                if reverse:
                    number = reverse[1]
                    chapters.setdefault(number, (index + 1, chapter_title(text, number)))
                continue
            if len({match[1].upper() for match in matches}) != 1:
                continue
            match = matches[0]
            number = match[1].upper()
            chapters.setdefault(number, (index + 1, chapter_title(text[:1800], number)))
    starts = sorted(chapters.values())
    sections = []
    for index, (first, title) in enumerate(starts):
        next_chapter = starts[index + 1][0] if index + 1 < len(starts) else total + 1
        next_boundary = min((page for page in boundaries if first < page <= next_chapter), default=next_chapter)
        sections.append({"title": title, "first": first, "last": next_boundary - 1, "kind": "chapter"})
    if not sections:
        for first in range(1, total + 1, 30):
            last = min(total, first + 29)
            sections.append({"title": f"Halaman {first}–{last}", "first": first, "last": last, "kind": "range"})
    return sections[:100]

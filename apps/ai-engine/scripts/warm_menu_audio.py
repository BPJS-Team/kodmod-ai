"""Prepare the finite shared menu catalog in the persistent speech cache.

Run in the API container after configuring ElevenLabs. Repeating the command
reuses matching cached audio; it never generates private Tutor responses.
"""

import argparse
import asyncio
import json

from voice.menu_catalog import MENU_AUDIO
from voice.tts import synthesise_bytes


async def warm(languages, keys=None):
    selected = list(dict.fromkeys(keys or MENU_AUDIO))
    languages = list(dict.fromkeys(languages))
    if any(language not in {"id", "en"} for language in languages) or any(
        key not in MENU_AUDIO for key in selected
    ):
        raise ValueError("Only supported languages and catalog keys can be prepared.")
    prepared, failed = 0, []
    for language in languages:
        for key in selected:
            try:
                audio = await synthesise_bytes(
                    MENU_AUDIO[key][language == "en"], language=language, scope="public-menu"
                )
                if not audio:
                    raise ValueError("Empty audio")
                prepared += 1
            except Exception:
                # Provider exception text may contain request details. Keep output bounded.
                failed.append({"key": key, "language": language})
    return {"prepared": prepared, "failed": failed, "languages": languages, "scope": "public-menu"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", action="append", choices=["id", "en"])
    parser.add_argument("--key", action="append", choices=sorted(MENU_AUDIO))
    args = parser.parse_args()
    result = asyncio.run(warm(args.language or ["id", "en"], args.key))
    print(json.dumps(result))
    return 1 if result["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

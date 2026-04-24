from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path


UNSAFE_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
WHITESPACE = re.compile(r"\s+")


def safe_filename(name: str) -> str:
    cleaned = UNSAFE_FILENAME_CHARS.sub("_", name)
    cleaned = WHITESPACE.sub("_", cleaned.strip())
    cleaned = re.sub(r"_+", "_", cleaned).strip("._ ")
    return cleaned or "conversation"


def parse_timestamp(value: str | None = None) -> datetime:
    if not value:
        return datetime.now().astimezone()
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def build_archive_path(created_at: str | None, filename: str) -> Path:
    timestamp = parse_timestamp(created_at)
    safe_name = safe_filename(filename)
    return Path(timestamp.strftime("%Y-%m")) / f"{timestamp:%Y-%m-%d}_{safe_name}"


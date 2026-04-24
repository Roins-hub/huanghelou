from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

from .core import build_archive_path, safe_filename


ARCHIVE_ROOT = Path(os.environ.get("CONVERSATION_ARCHIVE_ROOT", "/data/conversations"))
ARCHIVE_TOKEN = os.environ.get("CONVERSATION_ARCHIVE_TOKEN", "change-me")

app = FastAPI(title="Conversation Archive Server")


def require_token(authorization: str | None) -> None:
    expected = f"Bearer {ARCHIVE_TOKEN}"
    if not authorization or authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/upload")
async def upload_conversation(
    title: str = Form(...),
    created_at: str | None = Form(None),
    file: UploadFile = File(...),
    authorization: str | None = Header(None),
) -> dict[str, str]:
    require_token(authorization)
    filename = safe_filename(file.filename or f"{title}.md")
    archive_path = ARCHIVE_ROOT / build_archive_path(created_at, filename)
    archive_path.parent.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    archive_path.write_bytes(content)

    index_path = ARCHIVE_ROOT / "index.tsv"
    index_line = f"{created_at or ''}\t{title}\t{archive_path.relative_to(ARCHIVE_ROOT).as_posix()}\n"
    with index_path.open("a", encoding="utf-8", newline="") as handle:
        handle.write(index_line)

    return {
        "status": "saved",
        "path": archive_path.relative_to(ARCHIVE_ROOT).as_posix(),
    }


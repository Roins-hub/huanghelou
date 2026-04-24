from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


SUPPORTED_SUFFIXES = {".md", ".markdown", ".json", ".txt"}
DEFAULT_MANIFEST_NAME = ".conversation-sync.json"


@dataclass(frozen=True)
class ConversationFile:
    path: Path
    title: str


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class SyncManifest:
    def __init__(self, path: Path, records: dict[str, str] | None = None):
        self.path = path
        self.records = records or {}

    @classmethod
    def load(cls, path: Path) -> "SyncManifest":
        if not path.exists():
            return cls(path)
        return cls(path, json.loads(path.read_text(encoding="utf-8")))

    def _key(self, source: Path) -> str:
        try:
            return source.relative_to(self.path.parent).as_posix()
        except ValueError:
            return source.name

    def should_upload(self, source: Path) -> bool:
        return self.records.get(self._key(source)) != file_digest(source)

    def record_uploaded(self, source: Path) -> None:
        self.records[self._key(source)] = file_digest(source)

    def save(self) -> None:
        self.path.write_text(
            json.dumps(self.records, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )


def collect_files(root: Path) -> list[ConversationFile]:
    files: list[ConversationFile] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.name == DEFAULT_MANIFEST_NAME:
            continue
        if path.suffix.lower() not in SUPPORTED_SUFFIXES:
            continue
        files.append(ConversationFile(path=path, title=path.stem))
    return files


def upload_file(url: str, token: str, item: ConversationFile) -> None:
    boundary = f"----conversationarchive{int(time.time() * 1000)}"
    content_type = mimetypes.guess_type(item.path.name)[0] or "application/octet-stream"
    file_bytes = item.path.read_bytes()
    created_at = time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime(item.path.stat().st_mtime))

    parts = [
        _form_field(boundary, "title", item.title),
        _form_field(boundary, "created_at", created_at),
        _file_field(boundary, "file", item.path.name, content_type, file_bytes),
        f"--{boundary}--\r\n".encode("utf-8"),
    ]
    body = b"".join(parts)
    request = urllib.request.Request(
        url.rstrip("/") + "/upload",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status >= 300:
            raise RuntimeError(f"Upload failed with HTTP {response.status}")


def _form_field(boundary: str, name: str, value: str) -> bytes:
    return (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
        f"{value}\r\n"
    ).encode("utf-8")


def _file_field(boundary: str, name: str, filename: str, content_type: str, data: bytes) -> bytes:
    headers = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    return headers + data + b"\r\n"


def sync_once(source_dir: Path, server_url: str, token: str) -> int:
    manifest = SyncManifest.load(source_dir / DEFAULT_MANIFEST_NAME)
    uploaded = 0
    for item in collect_files(source_dir):
        if not manifest.should_upload(item.path):
            continue
        upload_file(server_url, token, item)
        manifest.record_uploaded(item.path)
        uploaded += 1
    manifest.save()
    return uploaded


def run_watch(source_dir: Path, server_url: str, token: str, interval: int) -> None:
    while True:
        uploaded = sync_once(source_dir, server_url, token)
        if uploaded:
            print(f"Uploaded {uploaded} conversation file(s).")
        time.sleep(interval)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sync conversation files to archive server.")
    parser.add_argument("--source", default=os.environ.get("CONVERSATION_SOURCE", "."))
    parser.add_argument("--server", default=os.environ.get("CONVERSATION_SERVER_URL"))
    parser.add_argument("--token", default=os.environ.get("CONVERSATION_ARCHIVE_TOKEN"))
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--interval", type=int, default=60)
    args = parser.parse_args(list(argv) if argv is not None else None)

    if not args.server or not args.token:
        parser.error("--server and --token are required, or set environment variables")

    source_dir = Path(args.source).resolve()
    try:
        if args.watch:
            run_watch(source_dir, args.server, args.token, args.interval)
        else:
            uploaded = sync_once(source_dir, args.server, args.token)
            print(f"Uploaded {uploaded} conversation file(s).")
    except urllib.error.URLError as exc:
        print(f"Upload failed: {exc}", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


import json
import tempfile
import unittest
from pathlib import Path

from conversation_archive.client import SyncManifest, collect_files
from conversation_archive.core import build_archive_path, safe_filename


class CoreTests(unittest.TestCase):
    def test_safe_filename_removes_unsafe_characters(self):
        self.assertEqual(
            safe_filename("阿里云/会话:服务器?* test.md"),
            "阿里云_会话_服务器_test.md",
        )

    def test_build_archive_path_groups_by_month(self):
        path = build_archive_path("2026-04-24T10:30:00+08:00", "阿里云会话.md")

        self.assertEqual(path.as_posix(), "2026-04/2026-04-24_阿里云会话.md")


class ClientTests(unittest.TestCase):
    def test_collect_files_ignores_manifest_and_unsupported_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / ".conversation-sync.json").write_text("{}", encoding="utf-8")
            (root / "a.md").write_text("hello", encoding="utf-8")
            (root / "b.json").write_text("{}", encoding="utf-8")
            (root / "c.png").write_bytes(b"png")

            files = [item.path.name for item in collect_files(root)]

        self.assertEqual(files, ["a.md", "b.json"])

    def test_manifest_detects_changed_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest_path = root / ".conversation-sync.json"
            source = root / "talk.md"
            source.write_text("first", encoding="utf-8")

            manifest = SyncManifest.load(manifest_path)
            first = manifest.should_upload(source)
            manifest.record_uploaded(source)
            manifest.save()

            reloaded = SyncManifest.load(manifest_path)
            unchanged = reloaded.should_upload(source)
            source.write_text("second", encoding="utf-8")
            changed = reloaded.should_upload(source)
            saved_records = json.loads(manifest_path.read_text(encoding="utf-8"))

        self.assertTrue(first)
        self.assertFalse(unchanged)
        self.assertTrue(changed)
        self.assertIn("talk.md", saved_records)


if __name__ == "__main__":
    unittest.main()

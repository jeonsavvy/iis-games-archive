#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_GAME_EXTENSIONS = {
    ".html",
    ".css",
    ".js",
    ".json",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".avif",
    ".svg",
    ".gif",
    ".mp3",
    ".ogg",
    ".wav",
    ".woff2",
}
ALLOWED_TOP_LEVEL_FILES = {
    "README.md",
    ".env.example",
    ".github/workflows/archive-guard.yml",
    "manifest/games.json",
    "manifest/schema.json",
    "scripts/archive_guard.py",
    "scripts/.gitignore",
}
GAME_PATH_RE = re.compile(r"^games/[a-z0-9]+(?:-[a-z0-9]+)*/[a-zA-Z0-9][a-zA-Z0-9._/-]*\.[a-z0-9]+$")
GAME_INDEX_PATH_RE = re.compile(r"^games/[a-z0-9]+(?:-[a-z0-9]+)*/index\.html$")


def _git_ls_files() -> list[Path]:
    proc = subprocess.run(
        ["git", "ls-files"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [Path(line.strip()) for line in proc.stdout.splitlines() if line.strip()]


def _is_disallowed_path_pattern(path: str) -> bool:
    return "/." in path or ".." in path or "//" in path


def validate_allowlist() -> None:
    for file_path in _git_ls_files():
        normalized = file_path.as_posix()
        if normalized in ALLOWED_TOP_LEVEL_FILES:
            continue

        if GAME_PATH_RE.match(normalized):
            if _is_disallowed_path_pattern(normalized):
                raise SystemExit(f"Disallowed path pattern: {normalized}")

            extension = file_path.suffix.lower()
            if extension not in ALLOWED_GAME_EXTENSIONS:
                raise SystemExit(f"Disallowed game asset extension: {normalized}")

            if not file_path.is_file():
                raise SystemExit(f"Tracked path is not a regular file: {normalized}")

            size = file_path.stat().st_size
            if size > MAX_FILE_SIZE:
                raise SystemExit(f"File too large ({size} bytes): {normalized}")
            continue

        raise SystemExit(f"Disallowed file detected: {normalized}")

    print("Allowlist check passed.")


def _parse_iso8601(value: str) -> datetime:
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    return datetime.fromisoformat(normalized)


def validate_manifest_schema() -> None:
    schema = json.loads(Path("manifest/schema.json").read_text(encoding="utf-8"))
    manifest = json.loads(Path("manifest/games.json").read_text(encoding="utf-8"))

    required_root = schema.get("required", [])
    for key in required_root:
        if key not in manifest:
            raise SystemExit(f"manifest missing required root key: {key}")

    if manifest.get("schema_version") != 1:
        raise SystemExit("manifest.schema_version must be 1")

    generated_at = manifest.get("generated_at")
    if not isinstance(generated_at, str):
        raise SystemExit("manifest.generated_at must be string")
    try:
        _parse_iso8601(generated_at)
    except ValueError as exc:
        raise SystemExit(f"manifest.generated_at invalid ISO8601: {generated_at}") from exc

    games = manifest.get("games")
    if not isinstance(games, list):
        raise SystemExit("manifest.games must be an array")

    item_schema = schema["properties"]["games"]["items"]
    item_required = item_schema.get("required", [])
    slug_re = re.compile(item_schema["properties"]["slug"]["pattern"])
    path_re = re.compile(item_schema["properties"]["path"]["pattern"])
    seen_slugs: set[str] = set()
    seen_paths: set[str] = set()

    for idx, game in enumerate(games):
        if not isinstance(game, dict):
            raise SystemExit(f"manifest.games[{idx}] must be object")
        for key in item_required:
            if key not in game:
                raise SystemExit(f"manifest.games[{idx}] missing required key: {key}")
        if not slug_re.match(str(game["slug"])):
            raise SystemExit(f"manifest.games[{idx}].slug pattern mismatch")
        if not path_re.match(str(game["path"])):
            raise SystemExit(f"manifest.games[{idx}].path pattern mismatch")
        expected_path = f"games/{game['slug']}/index.html"
        if str(game["path"]) != expected_path:
            raise SystemExit(
                f"manifest.games[{idx}] path/slug mismatch: path={game['path']} expected={expected_path}"
            )
        if game["slug"] in seen_slugs:
            raise SystemExit(f"manifest.games[{idx}].slug duplicated: {game['slug']}")
        if game["path"] in seen_paths:
            raise SystemExit(f"manifest.games[{idx}].path duplicated: {game['path']}")
        seen_slugs.add(str(game["slug"]))
        seen_paths.add(str(game["path"]))

        path = Path(str(game["path"]))
        if not path.is_file():
            raise SystemExit(f"manifest.games[{idx}].path missing file: {path.as_posix()}")

        created_at = game.get("created_at")
        if not isinstance(created_at, str):
            raise SystemExit(f"manifest.games[{idx}].created_at must be string")
        try:
            _parse_iso8601(created_at)
        except ValueError as exc:
            raise SystemExit(
                f"manifest.games[{idx}].created_at invalid ISO8601: {created_at}"
            ) from exc

    tracked_index_paths = {
        path.as_posix() for path in _git_ls_files() if GAME_INDEX_PATH_RE.match(path.as_posix())
    }
    manifest_index_paths = {str(game["path"]) for game in games if isinstance(game, dict)}
    missing_manifest_rows = sorted(tracked_index_paths - manifest_index_paths)
    if missing_manifest_rows:
        raise SystemExit(
            "manifest missing game index rows: " + ", ".join(missing_manifest_rows[:20])
        )

    print("Manifest schema contract check passed.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate iis-games-archive allowlist/schema")
    parser.add_argument(
        "mode",
        choices=("allowlist", "manifest", "all"),
        default="all",
        nargs="?",
        help="Validation mode",
    )
    args = parser.parse_args()

    if args.mode in {"allowlist", "all"}:
        validate_allowlist()
    if args.mode in {"manifest", "all"}:
        validate_manifest_schema()


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        print(exc.stderr.strip() or str(exc), file=sys.stderr)
        raise

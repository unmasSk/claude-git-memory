"""Tests for context-writer.py — statusline wrapper that writes context metrics to disk."""
import json
import os
import subprocess
import sys
import tempfile

import pytest

SCRIPT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "bin", "context-writer.py",
)


def _run_writer(input_json: str, env_overrides: dict | None = None) -> subprocess.CompletedProcess:
    """Run context-writer.py with given stdin, return completed process."""
    env = os.environ.copy()
    if env_overrides:
        env.update(env_overrides)
    return subprocess.run(
        [sys.executable, SCRIPT],
        input=input_json,
        capture_output=True,
        text=True,
        timeout=10,
        env=env,
    )


def _make_input(project_dir: str, used: int = 42, remaining: int = 58, size: int = 1000000) -> str:
    """Build a JSON string mimicking Claude Code statusline input."""
    return json.dumps({
        "cwd": project_dir,
        "context_window": {
            "used_percentage": used,
            "remaining_percentage": remaining,
            "context_window_size": size,
        },
    })


class TestContextWriter:
    """Tests for the context-writer statusline wrapper."""

    def test_writes_context_status_json(self, tmp_path):
        """Should write .context-status.json with correct metrics."""
        claude_dir = tmp_path / ".claude"
        claude_dir.mkdir()

        result = _run_writer(_make_input(str(tmp_path), used=42, remaining=58))
        assert result.returncode == 0

        status_file = claude_dir / ".unmassk" / "context-status.json"
        assert status_file.exists()

        data = json.loads(status_file.read_text())
        assert data["used_percentage"] == 42
        assert data["remaining_percentage"] == 58
        assert data["context_window_size"] == 1000000
        assert "timestamp" in data
        assert isinstance(data["timestamp"], float)

    def test_workspace_project_dir_takes_priority(self, tmp_path):
        """Should use workspace.project_dir over cwd if present."""
        claude_dir = tmp_path / ".claude"
        claude_dir.mkdir()

        input_json = json.dumps({
            "cwd": "/some/other/path",
            "workspace": {"project_dir": str(tmp_path)},
            "context_window": {
                "used_percentage": 10,
                "remaining_percentage": 90,
                "context_window_size": 500000,
            },
        })

        result = _run_writer(input_json)
        assert result.returncode == 0

        status_file = claude_dir / ".unmassk" / "context-status.json"
        assert status_file.exists()
        data = json.loads(status_file.read_text())
        assert data["used_percentage"] == 10

    def test_no_claude_dir_no_write(self, tmp_path):
        """Should not create .claude/ if it doesn't exist."""
        result = _run_writer(_make_input(str(tmp_path)))
        assert result.returncode == 0

        claude_dir = tmp_path / ".claude"
        assert not claude_dir.exists()

    def test_empty_stdin_exits_cleanly(self):
        """Should exit 0 on empty stdin."""
        result = _run_writer("")
        assert result.returncode == 0
        assert result.stdout == ""

    def test_invalid_json_exits_cleanly(self):
        """Should exit 0 on malformed JSON."""
        result = _run_writer("not json {{{")
        assert result.returncode == 0
        assert result.stdout == ""

    def test_missing_context_window_writes_nulls(self, tmp_path):
        """Should write nulls if context_window is missing."""
        claude_dir = tmp_path / ".claude"
        claude_dir.mkdir()

        input_json = json.dumps({"cwd": str(tmp_path)})
        result = _run_writer(input_json)
        assert result.returncode == 0

        status_file = claude_dir / ".unmassk" / "context-status.json"
        assert status_file.exists()
        data = json.loads(status_file.read_text())
        assert data["used_percentage"] is None
        assert data["remaining_percentage"] is None

    def test_overwrites_existing_status(self, tmp_path):
        """Should overwrite previous status file."""
        claude_dir = tmp_path / ".claude"
        claude_dir.mkdir()

        # First write
        _run_writer(_make_input(str(tmp_path), used=10, remaining=90))
        # Second write
        _run_writer(_make_input(str(tmp_path), used=75, remaining=25))

        data = json.loads((claude_dir / ".unmassk" / "context-status.json").read_text())
        assert data["used_percentage"] == 75
        assert data["remaining_percentage"] == 25

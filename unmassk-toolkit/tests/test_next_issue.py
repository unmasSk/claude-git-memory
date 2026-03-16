"""Tests for Next->Issue auto-creation in git-memory-commit.py."""

import os
import subprocess
import sys
from unittest.mock import patch, MagicMock

import pytest

SOURCE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(SOURCE_ROOT, "bin"))


class TestNextToIssue:
    """Next->Issue auto-creation and gh availability."""

    def test_gh_unavailable_returns_none(self):
        """When gh CLI is not available, _auto_create_issue returns None."""
        with patch("subprocess.run", side_effect=FileNotFoundError):
            from importlib import import_module
            commit_mod = import_module("git-memory-commit")
            commit_mod._gh_available_cache = None  # reset cache
            result = commit_mod._auto_create_issue("implement auth flow")
            assert result is None

    def test_already_has_issue_ref_skips(self):
        """If the Next text already contains #N, skip issue creation."""
        from importlib import import_module
        commit_mod = import_module("git-memory-commit")
        result = commit_mod._auto_create_issue("implement auth flow #42")
        assert result is None

    def test_gh_available_creates_issue(self):
        """When gh is available, _auto_create_issue creates an issue and returns #N."""
        from importlib import import_module
        commit_mod = import_module("git-memory-commit")
        commit_mod._gh_available_cache = True  # skip auth check
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "https://github.com/owner/repo/issues/99\n"
        with patch("subprocess.run", return_value=mock_result):
            result = commit_mod._auto_create_issue("implement auth flow")
            assert result == "#99"

    def test_gh_available_cache_persists(self):
        """_gh_available() result is cached across calls."""
        from importlib import import_module
        commit_mod = import_module("git-memory-commit")
        commit_mod._gh_available_cache = None  # reset
        mock_result = MagicMock()
        mock_result.returncode = 0
        with patch("subprocess.run", return_value=mock_result) as mock_run:
            commit_mod._gh_available()
            commit_mod._gh_available()
            # Should only call subprocess.run once due to caching
            assert mock_run.call_count == 1

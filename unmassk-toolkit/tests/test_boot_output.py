"""
Tests for the structured boot briefing v2 output.

Validates section ordering, branch-awareness, scaling limits,
and the BOOT COMPLETE terminator.
"""

import json
import os
import re
import subprocess
import sys

import pytest

from conftest import (
    SOURCE_ROOT, HOOKS_DIR, INSTALL,
    run_cmd, git_cmd, write_file, run_script,
)

BOOT_HOOK = os.path.join(HOOKS_DIR, "session-start-boot.py")


def make_repo_with_memory(tmp_path, name="repo"):
    """Create a repo with install + some memory commits."""
    repo = str(tmp_path / name)
    os.makedirs(repo)
    git_cmd(["init"], repo)
    git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
    run_script(INSTALL, repo, ["--auto"])

    # Add memory commits
    git_cmd(["commit", "--allow-empty", "-m",
             "🧭 decision(auth): use JWT\n\nDecision: JWT over sessions\nWhy: stateless API"], repo)
    git_cmd(["commit", "--allow-empty", "-m",
             "📌 memo(api): preference - async/await\n\nMemo: preference - async/await everywhere"], repo)
    git_cmd(["commit", "--allow-empty", "-m",
             "🧠 remember(user): prefers Spanish\n\nRemember: user - prefiere respuestas en español"], repo)
    git_cmd(["commit", "--allow-empty", "-m",
             "💾 context(auth): pause JWT implementation\n\nWhy: switching to urgent bugfix\nNext: finish JWT refresh token flow"], repo)
    return repo


def run_boot(repo):
    """Run the session-start-boot hook and return stdout."""
    rc, stdout, stderr = run_cmd([sys.executable, BOOT_HOOK], repo)
    return stdout


class TestBootSections:
    """Boot output has all required sections in correct order."""

    def test_has_status_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "STATUS:" in output

    def test_has_branch_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "BRANCH:" in output

    def test_has_resume_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "RESUME:" in output

    def test_has_remember_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "REMEMBER:" in output

    def test_has_decisions_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "DECISIONS:" in output

    def test_has_timeline_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "TIMELINE" in output

    def test_has_boot_complete_terminator(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "BOOT COMPLETE" in output
        assert "Do NOT run doctor or git-memory-log" in output

    def test_has_script_paths_in_terminator(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "git-memory-commit.py" in output
        assert "git-memory-log.py" in output

    def test_section_order(self, tmp_path):
        """Sections appear in the designed order: STATUS, BRANCH, RESUME, REMEMBER, DECISIONS, TIMELINE, BOOT COMPLETE."""
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        positions = []
        for marker in ["STATUS:", "BRANCH:", "RESUME:", "REMEMBER:", "DECISIONS:", "TIMELINE", "BOOT COMPLETE"]:
            pos = output.find(marker)
            assert pos != -1, f"Missing section: {marker}"
            positions.append(pos)
        assert positions == sorted(positions), f"Sections out of order: {positions}"

    def test_header_has_version(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "[git-memory-boot]" in output
        # Version should be in the first line
        first_line = output.split("\n")[0]
        assert re.search(r"v\d+\.\d+\.\d+", first_line)

    def test_resume_shows_next(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "finish JWT refresh token flow" in output

    def test_resume_shows_last_context(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "pause JWT implementation" in output


class TestBootTimeAgo:
    """Boot shows time since last session."""

    def test_last_commit_has_time_ago(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        # The RESUME section should show a time-ago like "Xm ago" or "just now"
        assert re.search(r"\d+[mhdw] ago|just now", output)


class TestBootBranchAwareness:
    """Branch-scoped items appear first in their sections."""

    def test_branch_scoped_next_first(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        # Create a branch with auth keyword
        git_cmd(["checkout", "-b", "feat/issue-42-auth-refactor"], repo)
        git_cmd(["commit", "--allow-empty", "-m",
                 "💾 context(api): pause API work\n\nWhy: context switch\nNext: add rate limiting to API"], repo)
        output = run_boot(repo)
        # The auth-related Next should appear BEFORE the API Next
        # because branch name contains "auth"
        auth_pos = output.find("JWT refresh token")
        api_pos = output.find("rate limiting")
        # Both should exist
        assert auth_pos != -1, "Branch-matching 'JWT refresh token' item missing from output"
        assert api_pos != -1, "Non-matching 'rate limiting' item missing from output"
        # Branch-matching items must appear before non-matching items
        assert auth_pos < api_pos, (
            f"Branch-matching item should appear before non-matching item: "
            f"auth_pos={auth_pos}, api_pos={api_pos}"
        )


class TestBootEmpty:
    """Boot handles empty repos gracefully."""

    def test_empty_repo(self, tmp_path):
        repo = str(tmp_path / "empty")
        os.makedirs(repo)
        git_cmd(["init"], repo)
        git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
        output = run_boot(repo)
        assert "BOOT COMPLETE" in output
        assert "STATUS:" in output


class TestGlossaryCache:
    """Glossary caching creates, reads, and invalidates correctly."""

    def test_cache_created_on_first_boot(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        run_boot(repo)
        cache_path = os.path.join(repo, ".claude", ".unmassk", "glossary-cache.json")
        assert os.path.isfile(cache_path), "Glossary cache file should be created on first boot"
        with open(cache_path) as f:
            cache = json.load(f)
        assert "head_sha" in cache
        assert "generated_at" in cache

    def test_cache_invalidated_on_head_change(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        run_boot(repo)  # creates cache
        cache_path = os.path.join(repo, ".claude", ".unmassk", "glossary-cache.json")
        with open(cache_path) as f:
            cache_before = json.load(f)
        # Make a new commit to change HEAD
        git_cmd(["commit", "--allow-empty", "-m", "🧭 decision(db): use postgres\n\nDecision: postgres over mysql"], repo)
        run_boot(repo)  # should regenerate cache
        with open(cache_path) as f:
            cache_after = json.load(f)
        assert cache_before["head_sha"] != cache_after["head_sha"]

    def test_cache_invalidated_on_ttl_expiry(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        run_boot(repo)  # creates cache
        cache_path = os.path.join(repo, ".claude", ".unmassk", "glossary-cache.json")
        # Backdate the generated_at to simulate TTL expiry
        with open(cache_path) as f:
            cache = json.load(f)
        from datetime import timedelta
        from datetime import datetime, timezone
        old_time = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
        cache["generated_at"] = old_time
        with open(cache_path, "w") as f:
            json.dump(cache, f)
        run_boot(repo)  # should regenerate
        with open(cache_path) as f:
            refreshed = json.load(f)
        # generated_at should be recent, not the backdated time
        assert refreshed["generated_at"] != old_time


class TestVersionCheck:
    """Version mismatch detection works correctly."""

    def test_no_warning_when_versions_match(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        # STATUS should be ok with no version warning
        assert "Plugin v" not in output or "available" not in output

    def test_warning_when_versions_mismatch(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        # Tamper the manifest to have an old version
        manifest_path = os.path.join(repo, ".claude", ".unmassk", "manifest.json")
        with open(manifest_path) as f:
            manifest = json.load(f)
        manifest["version"] = "1.0.0"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f)
        output = run_boot(repo)
        assert "Plugin v" in output
        assert "installed: v1.0.0" in output


class TestMigrateUntrackedGeneratedJsons:
    """Boot should untrack generated JSONs left by older installs."""

    def test_untrack_previously_committed_jsons(self, tmp_path):
        """If generated JSONs are tracked, boot should git rm --cached them."""
        repo = str(tmp_path / "repo")
        os.makedirs(repo)
        git_cmd(["init"], repo)
        git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
        run_script(INSTALL, repo, ["--auto"])

        # Simulate old install: force-add the generated JSONs to the index
        claude_dir = os.path.join(repo, ".claude")
        for name in [".context-status.json", ".glossary-cache.json",
                      ".context-warn-state.json", ".unmassk", "manifest.json"]:
            fpath = os.path.join(claude_dir, name)
            with open(fpath, "w") as f:
                f.write("{}")
            git_cmd(["add", "-f", fpath], repo)
        git_cmd(["commit", "-m", "old install committed jsons"], repo)

        # Verify they are tracked
        rc, out, _ = run_cmd(["git", "ls-files", ".claude/.unmassk/context-status.json"], repo)
        assert ".context-status.json" in out

        # Run boot — should untrack them
        run_boot(repo)

        # Verify they are no longer tracked
        for name in [".context-status.json", ".glossary-cache.json",
                      ".context-warn-state.json", ".unmassk", "manifest.json"]:
            rc, out, _ = run_cmd(["git", "ls-files", f".claude/{name}"], repo)
            assert name not in out, f"{name} should be untracked after boot"

    def test_gitignore_entries_added(self, tmp_path):
        """Boot migration should also ensure .gitignore has the entries."""
        repo = str(tmp_path / "repo")
        os.makedirs(repo)
        git_cmd(["init"], repo)
        git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
        run_script(INSTALL, repo, ["--auto"])

        # Remove gitignore entries to simulate old install
        gitignore_path = os.path.join(repo, ".gitignore")
        with open(gitignore_path) as f:
            content = f.read()
        # Strip out the generated JSON lines
        lines = [l for l in content.splitlines()
                 if not any(j in l for j in [".context-status", ".glossary-cache",
                                              ".context-warn-state", "git-memory-manifest"])]
        with open(gitignore_path, "w") as f:
            f.write("\n".join(lines) + "\n")

        # Force-add a JSON so migration triggers
        fpath = os.path.join(repo, ".claude", ".unmassk", "context-status.json")
        with open(fpath, "w") as f:
            f.write("{}")
        git_cmd(["add", "-f", fpath], repo)
        git_cmd(["commit", "-m", "old tracked json"], repo)

        run_boot(repo)

        with open(gitignore_path) as f:
            gitignore = f.read()
        assert ".claude/.unmassk/context-status.json" in gitignore

    def test_no_error_when_already_clean(self, tmp_path):
        """Boot should not fail if JSONs are already untracked."""
        repo = make_repo_with_memory(tmp_path)
        # Just run boot — nothing to migrate, should not error
        output = run_boot(repo)
        assert "STATUS:" in output

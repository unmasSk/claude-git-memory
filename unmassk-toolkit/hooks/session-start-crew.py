#!/usr/bin/env python3
"""
SessionStart hook for unmassk-toolkit crew.
Ensures the orchestrator block exists in CLAUDE.md.
"""
import subprocess
import sys
from pathlib import Path

MARKER_BEGIN = "<!-- BEGIN unmassk-toolkit (managed block — do not edit) -->"
MARKER_END = "<!-- END unmassk-toolkit -->"

BLOCK = """
<!-- BEGIN unmassk-toolkit (managed block — do not edit) -->
## unmassk-toolkit Active

This project uses the **unmassk toolkit**. Memory, agents, workflows, and standards are loaded automatically on boot.

The boot hook injects all context — you do NOT need to load skills manually.
Never ask the user to run commands -- run them yourself.
<!-- END unmassk-toolkit -->
""".strip()


def find_git_root():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return Path(result.stdout.strip())
    except Exception:
        pass
    return None


def main():
    git_root = find_git_root()
    if not git_root:
        print("[crew] Not a git repo, skipping CLAUDE.md check")
        return

    claude_md = git_root / "CLAUDE.md"

    if claude_md.exists():
        import re
        content = claude_md.read_text(encoding="utf-8")

        # Remove legacy blocks (unmassk-gitmemory, unmassk-crew)
        legacy_blocks = [
            (r"<!-- BEGIN unmassk-gitmemory.*?<!-- END unmassk-gitmemory -->", "unmassk-gitmemory"),
            (r"<!-- BEGIN unmassk-crew.*?<!-- END unmassk-crew -->", "unmassk-crew"),
        ]
        for pattern_str, name in legacy_blocks:
            pattern = re.compile(pattern_str, re.DOTALL)
            if pattern.search(content):
                content = pattern.sub("", content)
                content = re.sub(r"\n{3,}", "\n\n", content).strip() + "\n"
                print(f"[crew] Removed legacy {name} block from CLAUDE.md")

        if MARKER_BEGIN in content:
            # Block already present — update it in case it changed
            pattern = re.compile(
                re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END),
                re.DOTALL
            )
            new_content = pattern.sub(BLOCK, content)
            if new_content != content:
                claude_md.write_text(new_content, encoding="utf-8")
                print("[crew] Updated toolkit block in CLAUDE.md")
            else:
                claude_md.write_text(content, encoding="utf-8")
                print("[crew] Toolkit block up to date")
            return

        # Block missing — append it
        content = content.rstrip() + "\n\n" + BLOCK + "\n"
        claude_md.write_text(content, encoding="utf-8")
        print("[crew] Injected toolkit block into CLAUDE.md")
    else:
        # No CLAUDE.md — create it
        claude_md.write_text(BLOCK + "\n", encoding="utf-8")
        print("[crew] Created CLAUDE.md with orchestrator block")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Statusline wrapper — saves context window data to disk for hooks to read.

Claude Code sends JSON session data to the statusline command via stdin.
This script:
  1. Reads the JSON
  2. Writes context_window data to <project>/.claude/.unmassk/context-status.json
  3. Passes the JSON through to the user's original statusline command (if any)

The original statusline command is stored in ~/.claude/.git-memory-original-statusline.
If that file doesn't exist or is empty, no visual output is produced.
"""

import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lib"))
from git_helpers import ensure_gitignore, ensure_runtime_dir


def main() -> None:
    raw = sys.stdin.read()
    if not raw.strip():
        return

    # Parse the JSON from Claude Code
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return

    # Write context status to the project's .claude/ directory
    project_dir = (
        data.get("workspace", {}).get("project_dir")
        or data.get("cwd")
    )
    ctx = data.get("context_window") or {}

    if project_dir and os.path.isdir(os.path.join(project_dir, ".claude")):
        status = {
            "used_percentage": ctx.get("used_percentage"),
            "remaining_percentage": ctx.get("remaining_percentage"),
            "context_window_size": ctx.get("context_window_size"),
            "timestamp": time.time(),
        }
        runtime_dir = ensure_runtime_dir(project_dir)
        status_path = os.path.join(runtime_dir, "context-status.json")
        try:
            with open(status_path, "w") as f:
                json.dump(status, f)
            ensure_gitignore(project_dir)
        except OSError:
            pass

    # Always show context percentage in status bar
    used = ctx.get("used_percentage")
    if used is not None:
        if used >= 75:
            sys.stdout.write(f"\033[31m⚠ ctx {used:.0f}%\033[0m")
        elif used >= 60:
            sys.stdout.write(f"\033[33mctx {used:.0f}%\033[0m")
        else:
            sys.stdout.write(f"ctx {used:.0f}%")

    # Pass through to the user's original statusline command
    orig_file = os.path.join(
        os.path.expanduser("~"), ".claude", ".git-memory-original-statusline"
    )
    try:
        with open(orig_file) as f:
            orig_cmd = f.read().strip()
    except (OSError, FileNotFoundError):
        orig_cmd = ""

    if orig_cmd:
        try:
            proc = subprocess.run(
                orig_cmd,
                shell=True,
                input=raw,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if proc.stdout:
                if used is not None:
                    sys.stdout.write(" | ")
                sys.stdout.write(proc.stdout)
        except (subprocess.TimeoutExpired, OSError):
            pass


if __name__ == "__main__":
    main()

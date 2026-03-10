#!/usr/bin/env python3
"""
Statusline wrapper — saves context window data to disk for hooks to read.

Claude Code sends JSON session data to the statusline command via stdin.
This script:
  1. Reads the JSON
  2. Writes context_window data to <project>/.claude/.context-status.json
  3. Passes the JSON through to the user's original statusline command (if any)

The original statusline command is stored in ~/.claude/.git-memory-original-statusline.
If that file doesn't exist or is empty, no visual output is produced.
"""

import json
import os
import subprocess
import sys
import time


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
        status_path = os.path.join(project_dir, ".claude", ".context-status.json")
        try:
            with open(status_path, "w") as f:
                json.dump(status, f)
        except OSError:
            pass

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
                sys.stdout.write(proc.stdout)
        except (subprocess.TimeoutExpired, OSError):
            pass


if __name__ == "__main__":
    main()

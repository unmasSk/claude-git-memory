# Dashboard (archived)

This directory contains the dashboard generator, which was part of claude-git-memory up to v3.0.0.

The dashboard generates a self-contained static HTML file (GitHub Primer dark theme) that visualizes project memory: pending tasks, active blockers, decisions by scope, memos by category, compliance health, GC status, and commit timeline.

## Status

**Deactivated** as of v3.1.0. The code is preserved here for potential future reuse but is no longer triggered by any plugin hook.

## Files

- `git-memory-dashboard.py` — Dashboard generator script (scans last 500 commits, outputs HTML)
- `dashboard-preview.html` — HTML template with GitHub Primer dark theme, auto-reload, interactive sections
- `dashboard-screenshot.png` — Screenshot for documentation

## How to run manually

```bash
python3 archived/dashboard/git-memory-dashboard.py
# Generates .claude/dashboard.html
```

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.7.0] - 2026-03-13

### Added
- Boot auto-detects missing `git-memory-scopes.json` and instructs Claude to generate it via Explore agent
- Next cleanup in boot: checks GitHub issue status for pending Next items — closed issues are filtered out, items older than 7 days without an issue ref are marked `[stale]`
- Cross-repo guard prevents false positives when Next items reference issues in other repositories
- GC tombstone support for `Resolved-Next:` trailers — resolved pending items are hidden from future boot output

### Changed
- Scout agent removed — scope scanning now handled by an Explore agent prompt during boot
- Context percentage is now always shown in the UserPromptSubmit hook output (previously only displayed at 60%+ usage)

### Fixed
- Boot and commit script hardening from code review feedback

## [3.6.0] - 2026-03-13

### Added
- Boot briefing v2: SessionStart hook produces structured output with zero redundant bash calls
- Automatic conversion of `Next:` trailers to GitHub issues during boot

### Changed
- Version is now centralized in `lib/version.py` as single source of truth, read from `plugin.json`
- CLAUDE.md boot instructions corrected and simplified

## [3.5.1] - 2026-03-13

### Added
- Context warnings now fire mid-session via UserPromptSubmit hook, not just at boot
- Slim hook output after boot — flag file prevents repeated instructions

### Fixed
- Quote all paths in hook output to prevent Windows path mangling
- UserPromptSubmit hook now uses wrapper scripts consistently

## [3.4.0] - 2026-03-12

### Added
- New `git-memory-issues` skill — GitHub issues and milestones as shared team memory
- Safety improvements: confirmation protocol, `--no-ff` merges, pre-merge checklist, immediate back-merge
- Scout agent onboarding integration
- Alexandria documentation agent design

### Fixed
- Belt regex now catches `git -C` and other flags before `log`/`commit` interception
- Narrowed issue skill trigger to avoid false activations on generic words

## [3.3.0] - 2026-03-12

### Added
- `remember()` commit type for explicit long-term memory capture
- Hierarchical scopes with scope-scout agent for automatic scope grouping in glossary
- Mandatory rule: agents always launch in background
- Hardened stop hook — `context()` commit is now mandatory when closing a session

### Changed
- Skill refactored to consolidate all rules (CLAUDE.md managed block minimized)
- Scope-scout agent renamed to "scout"

## [3.2.0] - 2026-03-12

### Added
- Pretty ANSI output for commit and log wrapper scripts
- PreToolUse hook blocks direct `git commit`/`git log` — forces wrapper scripts
- Boot glossary: session start extracts all decisions and memos from full git history

## [3.1.0] - 2026-03-12

### Added
- Frictionless capture: auto-detect decisions, memos, and context from conversation — commit without asking

### Changed
- CLAUDE.md managed block reduced to minimal pointer; all rules moved into the skill file

## [3.0.0] - 2026-03-11

### Changed
- Complete plugin audit: dead code removed, skills merged into single coherent file
- Dashboard archived (superseded by CLI tools)
- Boot now fetches latest git history before building snapshot
- All version references synced across plugin.json, marketplace.json, and code

### Fixed
- Restored `.claude-plugin/` files accidentally deleted during cleanup
- Install script no longer deletes source files when running inside the plugin's own repository

## [2.2.0] - 2026-03-11

### Added
- Context-aware stop hook with statusline wrapper showing session summary
- Gitto memory oracle agent for querying project memory conversationally
- Silent WIP strategy — WIP commits happen without noisy output

### Fixed
- Stale hooks cleaned during zero-copy migration
- Statusline backup hardened against missing files
- Doctor command now detects stale hook configurations

## [2.1.0] - 2026-03-08

### Added
- Automatic context checkpoint commits at natural pause points
- Auto-upgrade of outdated CLAUDE.md managed blocks on session start

### Changed
- Zero-copy install model: plugin runs directly from Claude Code cache, no files copied to project root
- Upgrade script rewritten for zero-copy model with full test coverage

## [2.0.0] - 2026-03-07

### Added
- SessionStart and UserPromptSubmit hooks for automatic memory boot
- Circuit breaker in Stop hook to prevent infinite loops
- Bootstrap detection in UserPromptSubmit hook for first-run guidance
- Incomplete install detection when `lib/` or `bin/` is missing
- Comprehensive type hints with mypy strict mode
- Monorepo detection refined with Rush/Moon support and scope mapping

### Changed
- Extracted shared `lib/` module: constants, git_helpers, parsing, colors (DRY refactor)
- All CLI scripts migrated from ad-hoc argument parsing to argparse
- Migrated 5 test suites to pytest with shared fixtures (old test files removed)
- Plugin aligned with official Claude Code plugin spec
- All code translated to English (docstrings, comments, headers)
- Marketplace.json added for self-hosting distribution
- Skills updated to use local paths instead of `$CLAUDE_PLUGIN_ROOT`

### Fixed
- Security audit round 2: complete manifest, symlink safety, MEMO_CATEGORIES validation, exit codes, imports
- Security audit round 3: XSS in dashboard, atomic writes, shell injection prevention, tombstone normalization
- Hook settings.json format corrected (flatten nesting, string matchers)
- Dashboard date parsing fixed (all dates were null)
- Stop hook now ignores git-memory runtime files

## [1.1.0] - 2026-03-06

### Added
- Static HTML dashboard for visualizing git memory (`git memory dashboard`)
- Lifecycle scripts: doctor, install, repair, uninstall
- Bootstrap scout: detects project stack, monorepos, and commitlint configuration
- Safe upgrade system with backup, diff review, and migrations
- Integration test matrix covering 10 end-to-end scenarios

### Changed
- Restructured project as Claude Code plugin (v2 architecture)

### Fixed
- Security audit: symlink traversal, uninstall orphans, exit code handling, manifest validation

## [1.0.0] - 2026-03-05

### Added
- Core git-memory system: persistent memory via git commit trailers
- Commit types: `context()`, `decision()`, `memo()` with emoji prefixes
- Memory search protocol with `git fetch` + deep grep before asking the user
- Conversational memory detection from natural language triggers
- Contradiction detection for conflicting decisions and memos
- Drift test validating search relevance and dedup under stress (200 commits, 6 scopes)
- CLI for manual memory queries (`git memory search`, `git memory log`)
- Garbage collector for pruning stale memory entries (`git memory gc`)
- Git hooks: pre-validate and post-validate commit trailers, precompact snapshot

### Changed
- Hooks hardened with restored drift test coverage

### Fixed
- Post-hook safety for delimiter collisions and nested prefix handling
- Partial date validation in form components

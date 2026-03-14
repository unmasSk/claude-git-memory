---
name: ops-scripting
description: >
  Use when the user asks to "generate bash script", "validate bash script",
  "create shell script", "generate Makefile", "validate Makefile",
  "lint shell script", "run shellcheck", "create CLI tool",
  "write automation script", "build targets",
  or mentions any of: bash, shell, sh, zsh, shellcheck, Makefile,
  make, GNU Make, script template, CLI helper, build targets,
  shell scripting, text processing, awk, sed, grep, regex,
  shebang, exit codes, signal handling, trap, getopts.
  Use this for generating production-ready bash scripts with proper
  error handling (set -euo pipefail, trap cleanup), creating CLI tools
  with argument parsing and help text, validating shell scripts with
  ShellCheck-oriented checks, generating Makefiles with standard targets
  and dependency management, validating Makefile correctness and
  anti-patterns, and text processing with awk/sed/grep patterns.
  Includes 11 scripts for template generation, validation, and CI checks.
  21 reference files cover bash scripting guide, shell reference,
  text processing (awk, sed, grep, regex), ShellCheck rules, Makefile
  structure, targets, variables, patterns, security, and optimization.
  Based on cc-devops-skills by akin-ozer (Apache-2.0).
version: 1.0.0
---

# Scripting -- Bash and Makefile Toolkit

## Routing Table

| Task | Tool |
|------|------|
| Generate bash script template | `generate_script_template.sh` |
| Generate Makefile template | `generate_makefile_template.sh` |
| Add standard Makefile targets | `add_standard_targets.sh` |
| Validate bash script (syntax + best practices) | `bash-validate.sh` |
| Validate bash script (CI mode) | `bash-validator-ci-checks.sh` |
| Run ShellCheck | `shellcheck_wrapper.sh` |
| Run bash CI checks | `bash-ci-checks.sh` |
| Generate bash tests | `bash-test-generator.sh` |
| Run bash tests | `bash-test-validate.sh` |
| Validate Makefile (syntax + best practices) | `validate_makefile.sh` |
| Validate Makefile (test mode) | `make-test-validate.sh` |

## Script Commands

All scripts are in `/Users/unmassk/Workspace/claude-toolkit/unmassk-ops/skills/ops-scripting/scripts/`.

```bash
# Generate a bash script template
bash /Users/unmassk/Workspace/claude-toolkit/unmassk-ops/skills/ops-scripting/scripts/generate_script_template.sh [OPTIONS] [SCRIPT_NAME]

# Generate a Makefile template
bash /Users/unmassk/Workspace/claude-toolkit/unmassk-ops/skills/ops-scripting/scripts/generate_makefile_template.sh [OPTIONS] [PROJECT_TYPE] [PROJECT_NAME] [OUTPUT_FILE]

# Add standard targets to an existing Makefile
bash /Users/unmassk/Workspace/claude-toolkit/unmassk-ops/skills/ops-scripting/scripts/add_standard_targets.sh [MAKEFILE]

# Validate a bash script
bash /Users/unmassk/Workspace/claude-toolkit/unmassk-ops/skills/ops-scripting/scripts/bash-validate.sh [SCRIPT]

# Run ShellCheck on a script
bash /Users/unmassk/Workspace/claude-toolkit/unmassk-ops/skills/ops-scripting/scripts/shellcheck_wrapper.sh [SCRIPT]

# Validate a Makefile
bash /Users/unmassk/Workspace/claude-toolkit/unmassk-ops/skills/ops-scripting/scripts/validate_makefile.sh [MAKEFILE]
```

## Script Reference

| Script | Purpose |
|--------|---------|
| `generate_script_template.sh` | Creates bash scripts with proper shebang, strict mode, trap, usage, main() |
| `generate_makefile_template.sh` | Creates Makefiles for C, C++, Go, Python, Docker project types |
| `add_standard_targets.sh` | Appends all/clean/install/test/help to existing Makefile |
| `bash-validate.sh` | Validates syntax, quoting, strict mode, trap, ShellCheck compliance |
| `bash-validator-ci-checks.sh` | CI-oriented bash validation with exit codes |
| `shellcheck_wrapper.sh` | Runs shellcheck via Python venv (isolates installation) |
| `bash-ci-checks.sh` | Batch CI checks for bash scripts |
| `bash-test-generator.sh` | Generates unit test stubs for bash functions |
| `bash-test-validate.sh` | Runs generated bash tests |
| `validate_makefile.sh` | Validates Makefile via mbake (Python venv, auto-cleaned) |
| `make-test-validate.sh` | Validates Makefile with dry-run and target checks |

## Mandatory Rules

### Bash Scripts

1. Every script starts with `#!/usr/bin/env bash` and `set -euo pipefail`.
2. All variables are quoted: `"${var}"`.
3. Trap cleanup on EXIT: `trap cleanup EXIT`.
4. Constants use `readonly`; local variables use `local`.
5. Functions defined before use; `main "$@"` at end.
6. No `eval` with external input. No unquoted `$@`.
7. Use `$()` not backticks. Use `[[` not `[` in bash scripts.
8. Validate all required arguments before use.
9. Write errors to stderr: `echo "error" >&2`.

### Makefiles

1. Start with `.DELETE_ON_ERROR:` to prevent corrupt builds.
2. Declare all non-file targets as `.PHONY`.
3. Use tabs, not spaces, for recipe indentation.
4. Use `:=` for computed variables, `?=` for user-overridable variables.
5. Use `$@`, `$<`, `$^` automatic variables in rules.
6. Generate dependencies automatically: `-MMD -MP` flags.
7. Never hardcode credentials. Load from environment.
8. `clean` removes build artifacts only; `distclean` removes configuration too.

## Done Criteria

A bash script is done when:
- `bash -n script.sh` exits 0 (syntax valid)
- `shellcheck script.sh` exits 0 (no warnings)
- Script has shebang, `set -euo pipefail`, trap, usage, and `main "$@"`
- All variables quoted, no backtick command substitution

A Makefile is done when:
- `make -n` (dry-run) exits 0 (syntax valid)
- Has `.DELETE_ON_ERROR:` and `.PHONY` declarations
- Standard targets present: `all`, `clean`, `help`
- No spaces in recipe indentation, no hardcoded paths
- `mbake format --check Makefile` exits 0

## Reference Files

| File | Topic |
|------|-------|
| `bash-scripting-guide.md` | Complete bash guide: strict mode, variables, functions, arrays, control flow |
| `bash-reference.md` | Bash vs POSIX sh, syntax quick reference, special variables |
| `bash-shell-reference.md` | POSIX sh reference: portability, missing features, alternatives |
| `bash-script-patterns.md` | Argument parsing, config, logging, parallel processing, retry, lock files |
| `bash-generation-best-practices.md` | Script generation checklist, structure template, naming conventions |
| `bash-common-mistakes.md` | 25 common mistakes with wrong/right examples and consequences |
| `bash-shellcheck-reference.md` | ShellCheck error codes, installation, CI integration, disable directives |
| `bash-text-processing.md` | Decision tree: grep vs awk vs sed, pipeline patterns, performance |
| `bash-awk-reference.md` | AWK syntax, built-in variables, arrays, functions, practical examples |
| `bash-sed-reference.md` | sed commands, address ranges, hold space, in-place editing |
| `bash-grep-reference.md` | grep options, BRE/ERE, character classes, log analysis |
| `bash-regex-reference.md` | BRE vs ERE table, POSIX character classes, common patterns |
| `make-structure.md` | Makefile layout, variable organization, dependency management, VPATH |
| `make-targets.md` | Standard GNU targets, .PHONY, pattern rules, static pattern rules |
| `make-variables.md` | Assignment operators (=, :=, ?=, +=), automatic variables, substitution functions |
| `make-patterns.md` | Pattern rules, static patterns, implicit rules, multi-directory projects |
| `make-best-practices.md` | Modern Makefile header, .ONESHELL, parallel builds, portability checklist |
| `make-common-mistakes.md` | 27 Makefile mistakes with impact statistics and fixes |
| `make-security.md` | Secrets management, shell injection, path traversal, CI/CD security |
| `make-optimization.md` | Parallel builds, .WAIT (Make 4.4+), ccache, incremental builds, benchmarks |
| `make-bake-tool.md` | mbake formatter/linter: install, format, validate, CI integration, config |

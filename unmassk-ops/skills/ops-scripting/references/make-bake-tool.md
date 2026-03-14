# mbake — Makefile Formatter and Linter

mbake is a Python-based tool that formats and validates Makefiles. Requires Python 3.9+.

**Known limitations**: Designed for GNU Make. Does not understand `.SUFFIXES`. Some discrepancies between `--check` warnings and what `format` fixes. For additional coverage, use [checkmake](https://github.com/checkmake/checkmake) alongside mbake.

## Installation

```bash
pip install mbake
mbake --version

# Isolated install
python3 -m venv mbake-env
source mbake-env/bin/activate
pip install mbake
```

## Commands

### mbake format

```bash
mbake format Makefile                  # apply formatting
mbake format --check Makefile          # check without modifying (exit 1 if needs formatting)
mbake format --diff Makefile           # show diff without applying
mbake format --backup Makefile         # create Makefile.bak first
mbake format --validate Makefile       # validate syntax after formatting
mbake format --config /path/.bake.toml Makefile
mbake format Makefile tests/*.mk       # multiple files
```

### mbake validate

```bash
mbake validate Makefile                # validate syntax with make --dry-run
mbake validate Makefile src/*.mk       # multiple files
```

Checks: syntax errors, target definitions, variable expansion, recipe format, dependency chains.
Exit codes: 0 = valid, 1 = invalid.

### mbake init / config

```bash
mbake init      # create ~/.bake.toml with defaults
mbake config    # show active configuration
mbake update    # upgrade via pip
```

## Configuration

`~/.bake.toml` (global) or `.bake.toml` in project root (overrides global):

```toml
space_around_assignment = true        # VAR = value
space_after_colon = true              # target : prereqs
normalize_line_continuations = true   # clean backslash continuations
remove_trailing_whitespace = true
fix_missing_recipe_tabs = true        # convert spaces to tabs in recipes
auto_insert_phony_declarations = true # detect and add .PHONY
group_phony_declarations = true       # combine multiple .PHONY lines
phony_at_top = false                  # if true, place .PHONY at file top
```

Priority: project `.bake.toml` > `~/.bake.toml` > built-in defaults.

## What mbake Fixes

**Tab enforcement**: converts spaces to tabs in recipe sections.

**Variable assignment spacing**:
```makefile
# Before: VAR1=value  VAR2 =value
# After:  VAR1 = value  VAR2 = value
```

**Target colon spacing**:
```makefile
# Before: target1:prerequisites  target2 :prerequisites
# After:  target1: prerequisites  target2: prerequisites
```

**Intelligent .PHONY detection**: analyzes recipes for commands like `rm`, `mkdir`, `npm`, `go test`, `docker`, `curl`, `ssh` → marks as phony. Targets producing actual files are not marked phony.

**Line continuation normalization**: removes trailing spaces before `\`.

**Trailing whitespace removal**.

## Format Disable Comments

```makefile
# Standard formatting applies here
VAR1=value

# bake-format off
VAR2   =    value     # preserved exactly
# bake-format on

# Standard formatting resumes
VAR3=value
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate Makefiles
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install mbake
      - run: mbake format --check Makefile
      - run: mbake validate Makefile
      - name: Check all .mk files
        run: |
          find . -name "*.mk" -o -name "Makefile" | while read file; do
            mbake format --check "$file"
            mbake validate "$file"
          done
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: mbake-format
        name: mbake format
        entry: mbake format --check
        language: system
        files: (Makefile|.*\.mk)$
      - id: mbake-validate
        name: mbake validate
        entry: mbake validate
        language: system
        files: (Makefile|.*\.mk)$
```

### Makefile Self-Validation Target

```makefile
.PHONY: format-check format-fix lint-make

format-check:
	mbake format --check $(MAKEFILE_LIST)

format-fix:
	mbake format $(MAKEFILE_LIST)

lint-make: format-check
	mbake validate $(MAKEFILE_LIST)
```

## Troubleshooting

**mbake not found**:
```bash
export PATH="$HOME/.local/bin:$PATH"
# or
python3 -m mbake format Makefile
```

**Syntax errors after formatting**: check for unclosed `# bake-format off`:
```bash
grep -n "bake-format" Makefile
# restore from backup
cp Makefile.bak Makefile
```

**Config not applied**:
```bash
mbake config                              # show active config
mbake format --config .bake.toml Makefile # explicit config path
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success / no changes needed |
| 1 | Formatting needed / validation failed |
| 2 | Error occurred |

```bash
mbake format --check Makefile || { echo "Needs formatting"; exit 1; }
mbake validate Makefile || { echo "Syntax invalid"; exit 1; }
```

## checkmake (Complementary Linter)

```bash
# Install
go install github.com/checkmake/checkmake/cmd/checkmake@latest
# or
docker run --rm -v $(pwd):/data checkmake/checkmake Makefile

# Usage
checkmake Makefile
checkmake --output json Makefile
checkmake list-rules
```

checkmake checks: missing required phony targets (all, test), targets that should be phony.

### Using Both Together

```makefile
.PHONY: lint-make
lint-make:
	mbake format --check Makefile
	mbake validate Makefile
	checkmake Makefile || true    # informational only
```

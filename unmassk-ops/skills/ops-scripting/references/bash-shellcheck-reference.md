# ShellCheck Reference

ShellCheck is a static analysis tool for shell scripts. It catches syntax issues, semantic bugs, and portability problems.

## Installation

```bash
brew install shellcheck          # macOS
apt-get install shellcheck       # Ubuntu/Debian
dnf install shellcheck           # Fedora
```

## Basic Usage

```bash
shellcheck script.sh                    # check with defaults
shellcheck -s bash script.sh            # specify shell dialect
shellcheck -s sh script.sh              # validate as POSIX sh
shellcheck -e SC2086,SC2046 script.sh   # exclude specific codes
shellcheck -S warning script.sh         # minimum severity: warning
shellcheck -S error script.sh           # only errors

# Output formats
shellcheck -f gcc script.sh             # GCC-style (for editors)
shellcheck -f json script.sh            # JSON
shellcheck -f checkstyle script.sh      # Checkstyle XML
```

## Severity Levels

1. **error** — causes failures
2. **warning** — potential bugs
3. **info** — improvement suggestions
4. **style** — stylistic issues

## Critical Error Codes

### SC2086: Quote Variables to Prevent Word Splitting

```bash
# Wrong
cp $file $destination
# Fixed
cp "$file" "$destination"
```

### SC2046: Quote Command Substitutions

```bash
# Wrong
for file in $(ls *.txt); do
# Fixed
for file in *.txt; do
```

### SC2006: Use $() Instead of Backticks

```bash
# Wrong
result=`command`
# Fixed
result=$(command)
```

### SC2155: Declare and Assign Separately

```bash
# Wrong — masks return value of command
local result=$(command)
# Fixed
local result
result=$(command)
```

### SC2164: Use || exit After cd

```bash
# Wrong — rm runs even if cd fails
cd /some/directory
rm -rf *
# Fixed
cd /some/directory || exit
rm -rf *
```

### SC2181: Check Exit Code Directly

```bash
# Wrong
command
if [ $? -eq 0 ]; then
# Fixed
if command; then
```

### SC2068: Quote Array Expansions

```bash
# Wrong
command $@
# Fixed
command "$@"
```

### SC2162: read Without -r

```bash
# Wrong
while read line; do
# Fixed
while IFS= read -r line; do
```

### SC2116: Useless echo with $()

```bash
# Wrong
var=$(echo $value)
# Fixed
var=$value
```

### SC3001–SC3xxx: Bashisms in sh Scripts

```bash
# SC3001: [[ in #!/bin/sh script
if [[ condition ]]; then   # wrong for sh
if [ condition ]; then     # correct for sh

# SC3037: arrays in sh script
array=(one two)   # not in POSIX sh
```

## Disabling Checks

```bash
# Disable for next line
# shellcheck disable=SC2086
variable=$unquoted

# Disable for entire file (place at top)
# shellcheck disable=SC2086,SC2046

# Disable for block
# shellcheck disable=SC2086
{
    var1=$unquoted1
    var2=$unquoted2
}
# shellcheck enable=SC2086
```

## Directives

```bash
# Specify shell (overrides shebang)
# shellcheck shell=bash

# Tell ShellCheck where sourced file is
# shellcheck source=./lib/common.sh
. ./lib/common.sh

# For dynamically sourced files
# shellcheck source=/dev/null
. "$config_file"
```

## Configuration File

Create `.shellcheckrc` in project root or `~/.shellcheckrc`:

```bash
disable=SC2086,SC2046
enable=all
shell=bash
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run ShellCheck
  uses: ludeeus/action-shellcheck@master
  with:
    severity: warning
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/shellcheck-py/shellcheck-py
  rev: v0.9.0.2
  hooks:
    - id: shellcheck
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No issues found |
| 1 | Issues found |
| 2 | Syntax errors preventing parse |
| 3 | ShellCheck error (bad options, missing files) |

## Quick Reference

| Code | Issue | Fix |
|------|-------|-----|
| SC2086 | Unquoted variable | `"$var"` |
| SC2046 | Unquoted `$()` | Quote command substitution |
| SC2006 | Backticks | Use `$()` |
| SC2155 | Declare and assign together | Separate into two lines |
| SC2164 | cd without error check | `|| exit` |
| SC2181 | Checking `$?` | Check command directly |
| SC2068 | Unquoted `$@` | `"$@"` |
| SC2162 | read without `-r` | Add `-r` flag |
| SC3001 | `[[` in sh script | Use `[ ]` |
| SC3037 | Arrays in sh script | POSIX alternatives |

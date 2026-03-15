---
name: ops-iac shell script patterns
description: Safe shell scripting patterns used across the ops-iac skill scripts
type: project
---

## Shell Script Safety Patterns (ops-iac)

All scripts use `set -euo pipefail` (not bare `set -e`).

### Array-based config args (avoids word-splitting)
```bash
YAMLLINT_ARGS=()
if [ -f "$SKILL_DIR/assets/.yamllint" ]; then
    YAMLLINT_ARGS=(-c "$SKILL_DIR/assets/.yamllint")
fi
"$YAMLLINT_CMD" "${YAMLLINT_ARGS[@]}" "$file"
```
Same pattern for ANSIBLE_LINT_ARGS.

### mapfile for find output (avoids word-splitting on filenames)
```bash
mapfile -t YAML_FILES < <(find "$DIR" -type f \( -name "*.yml" -o -name "*.yaml" \) ...)
for file in "${YAML_FILES[@]}"; do ...
```

### Trap with single quotes (prevents early expansion)
```bash
trap 'rm -rf "$TEMP_VENV"' EXIT INT TERM
```

### ANSI sanitization for grep output
```bash
clean_line=$(echo "$line" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g')
echo "  $clean_line"
```

## Shell Path Traversal Validation (wrapper scripts)
```bash
# Validate that the target script is within SCRIPT_DIR before executing
if [[ "$(realpath "$PYTHON_SCRIPT")" != "$SCRIPT_DIR"/* ]]; then
    echo "ERROR: script must be within skill directory" >&2
    exit 1
fi
```
Apply in python wrapper scripts immediately after reading $1, before any execution.

## Array-based act/tool execution (replaces eval + string concat)
```bash
local cmd_args=("${tool_path}" --flag)
if [[ -n "${optional_flag}" ]]; then cmd_args+=(-W "${optional_flag#-W }"); fi
cmd_args+=("${extra_args[@]}")
output=$("${cmd_args[@]}" 2>&1)
```
Pattern for gha-validate-workflow.sh act --list and --dryrun commands.

## Python Path Traversal Pattern (ops-iac)
```python
import os
resolved = Path(args.directory).resolve()
cwd = Path(os.getcwd()).resolve()
if not str(resolved).startswith(str(cwd)):
    print(json.dumps({"error": "Path traversal detected: target must be within working directory"}))
    sys.exit(1)
```
Apply in `main()` after parsing args, before any file access.

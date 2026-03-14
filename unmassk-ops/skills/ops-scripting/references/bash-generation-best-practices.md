# Script Generation Best Practices

## Core Principles

1. **Security first** — validate inputs, quote variables, no injection
2. **Fail fast** — strict mode (`set -euo pipefail`), check errors immediately
3. **Self-documenting** — clear names, usage text, comments for non-obvious logic
4. **Testable** — modular functions, predictable behavior
5. **Maintainable** — consistent style, organized structure

## Script Structure Template

```bash
#!/usr/bin/env bash
#
# Script Name: descriptive-name.sh
# Description: What it does in one line
# Usage: script.sh [OPTIONS] ARGUMENTS
#

set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# Global variables (lowercase)
verbose=false
dry_run=false

usage() { }
cleanup() { }
main() { }

trap cleanup EXIT ERR INT TERM
main "$@"
```

## Naming Conventions

```bash
# Constants — UPPERCASE, readonly
readonly MAX_RETRIES=3
readonly CONFIG_FILE="/etc/app.conf"

# Environment variables — UPPERCASE
export LOG_LEVEL="INFO"

# Global script variables — lowercase
script_version="1.0.0"
temp_directory=""

# Functions — lowercase_with_underscores
process_file() { }
send_notification() { }

# Local variables — lowercase
local count=0
local file_path=""
```

## Security Rules

```bash
# Always quote variables
rm "${file}"                    # correct
rm $file                        # wrong

# Validate inputs before use
[[ "${input}" =~ ^[a-zA-Z0-9_-]+$ ]] || die "Invalid input"

# Never eval with external input
eval "${user_command}"          # dangerous

# Validate file paths
[[ -f "${file}" ]] || die "File not found"

# Use $() not backticks
output=$(command)               # correct
output=`command`                # wrong

# Safe IFS
IFS=$'\n\t'
```

## Error Handling

```bash
die() { echo "ERROR: $*" >&2; exit 1; }

check_command() {
    command -v "$1" &>/dev/null || die "Required: $1"
}

# Validate argument count
[[ $# -ge 1 ]] || die "Usage: $0 FILE"
[[ -f "$1" ]] || die "File not found: $1"

# Cleanup on exit
cleanup() {
    [[ -n "${temp_dir:-}" ]] && rm -rf "${temp_dir}"
}
trap cleanup EXIT
```

## Function Documentation

```bash
#######################################
# Process a log file and extract errors
# Globals:
#   LOG_LEVEL
# Arguments:
#   $1 - Path to log file
#   $2 - Output file (optional)
# Outputs:
#   Writes errors to stdout or file
# Returns:
#   0 on success, 1 on error
#######################################
process_log_file() {
    local log_file="$1"
    local output_file="${2:-}"

    [[ -f "${log_file}" ]] || return 1

    local errors
    errors=$(grep "ERROR" "${log_file}")

    if [[ -n "${output_file}" ]]; then
        echo "${errors}" > "${output_file}"
    else
        echo "${errors}"
    fi
}
```

## Code Organization Order

1. Shebang and header comments
2. Strict mode settings
3. Constants (`readonly`)
4. Global variables
5. Helper functions (general first, then specific)
6. Main logic functions
7. `main()` function
8. `trap` declarations
9. `main "$@"`

## Quality Checklist

Before delivering a generated script, verify:

- [ ] `#!/usr/bin/env bash` shebang
- [ ] `set -euo pipefail` strict mode
- [ ] All variables quoted: `"${var}"`
- [ ] Constants marked `readonly`
- [ ] Functions documented with purpose and params
- [ ] Error handling for all critical paths
- [ ] `usage()` / help text included
- [ ] Input validation present
- [ ] `trap cleanup EXIT` with cleanup function
- [ ] No ShellCheck warnings (`shellcheck -S warning script.sh`)
- [ ] Comments for non-obvious logic
- [ ] `main "$@"` at end, not inline code

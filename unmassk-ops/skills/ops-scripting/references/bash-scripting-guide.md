# Bash Scripting Guide

## Bash vs POSIX sh

**Use bash when**: script runs on modern Linux/macOS, needs arrays, associative arrays, or `[[` conditionals.
**Use POSIX sh when**: maximum portability required (embedded, minimal containers, multiple Unix variants).

Bash-specific (not in POSIX sh): arrays, `[[`, process substitution `<()`, brace expansion `{1..10}`, `${var//pattern/replacement}`, `select`, `**` globbing, `local`, `source`.

## Strict Mode

Every production bash script must start with:

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

- `-e` (errexit): exit immediately on non-zero status
- `-u` (nounset): treat unset variables as errors
- `-o pipefail`: pipeline fails if any command fails
- `IFS=$'\n\t'`: prevents word splitting on spaces

Temporarily disable errexit:

```bash
set +e
command_that_might_fail
exit_code=$?
set -e
# or: command_that_might_fail || true
```

## Signal Handling

```bash
cleanup() {
    local exit_code=$?
    rm -f "${temp_file}"
    exit "${exit_code}"
}
trap cleanup EXIT ERR INT TERM

temp_file=$(mktemp)
```

## Error Handling Patterns

```bash
# Die function
die() { echo "ERROR: $*" >&2; exit 1; }
[[ -f "${file}" ]] || die "File not found: ${file}"

# Check prerequisites
check_command() {
    command -v "$1" &>/dev/null || die "Required command not found: $1"
}

# Command substitution with error handling
output=$(command 2>&1) || { echo "Command failed: ${output}" >&2; exit 1; }
```

## Variables

```bash
# Constants
readonly MAX_RETRIES=3
readonly CONFIG_FILE="/etc/myapp/config.conf"

# Exported
export LOG_LEVEL="INFO"

# Local (inside functions)
local counter=0

# Always quote variables
rm "${file}"           # correct
rm $file               # wrong — breaks on spaces
```

## Parameter Expansion

```bash
${var:-default}          # use default if unset or empty
${var:=default}          # set var to default if unset or empty
${var:?error message}    # exit with error if unset or empty
${var:+alternative}      # use alternative if var is set

${var#pattern}           # remove shortest prefix match
${var##pattern}          # remove longest prefix match
${var%pattern}           # remove shortest suffix match
${var%%pattern}          # remove longest suffix match
${var/pattern/repl}      # replace first match
${var//pattern/repl}     # replace all matches
${var^^}                 # uppercase all
${var,,}                 # lowercase all
${#var}                  # length
${var:offset:length}     # substring

# Basename / dirname without fork
file="/path/to/file.txt"
${file##*/}              # file.txt
${file%.*}               # /path/to/file
${file##*.}              # txt
${file%/*}               # /path/to
```

## Functions

```bash
# POSIX style (preferred)
process_file() {
    local input_file="$1"
    local output_file="$2"
    grep "pattern" "${input_file}" > "${output_file}"
}

# Return data via stdout
get_value() { echo "computed value"; }
result=$(get_value)

# Return data via nameref (bash 4.3+)
get_data() {
    local -n result_var=$1
    result_var="computed value"
}
get_data my_result
```

## Arrays

```bash
arr=(one two three)
arr+=("four")
${arr[0]}                # access element
${arr[@]}                # all elements (separate words)
${#arr[@]}               # count
${!arr[@]}               # indices

for item in "${arr[@]}"; do echo "${item}"; done

# Associative arrays (bash 4.0+)
declare -A map
map[key1]="value1"
[[ -v map[key1] ]] && echo "exists"
for key in "${!map[@]}"; do echo "${key}: ${map[${key}]}"; done
```

## Control Structures

```bash
# Conditionals
[[ -f "${file}" ]]        # regular file exists
[[ -d "${dir}" ]]         # directory exists
[[ -z "${var}" ]]         # empty string
[[ -n "${var}" ]]         # non-empty string
[[ "${a}" == "${b}" ]]    # equal
[[ "${a}" =~ ^[0-9]+$ ]] # regex match
[[ "${a}" -lt "${b}" ]]   # numeric less than

# Loops
for file in *.txt; do echo "${file}"; done
while IFS= read -r line; do echo "${line}"; done < file.txt
find . -name "*.txt" -print0 | while IFS= read -r -d '' file; do
    process "${file}"
done
```

## Script Structure Template

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

VERBOSE=false
DRY_RUN=false

usage() {
    cat <<EOF
Usage: ${SCRIPT_NAME} [OPTIONS] FILE
Options:
  -v    Verbose output
  -n    Dry run
  -h    Show this help
EOF
}

cleanup() {
    local exit_code=$?
    [[ -n "${temp_dir:-}" ]] && rm -rf "${temp_dir}"
    exit "${exit_code}"
}

main() {
    # parse args, validate, execute
}

trap cleanup EXIT ERR INT TERM
main "$@"
```

## Common Pitfalls

**Word splitting with spaces in filenames**: use `"${file}"`, not `$file`.

**Globbing into loop**: use `for file in *.txt` directly, not `for file in $(ls *.txt)`.

**Useless use of cat**: `grep pattern file` not `cat file | grep pattern`.

**Not checking exit status after cd**: `cd /some/dir || exit 1; rm -rf *`.

**read without -r**: always `while IFS= read -r line`.

**Backticks**: use `$(command)` not `` `command` ``.

# Bash Script Patterns

## Argument Parsing

### getopts (POSIX-compatible)

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<EOF
Usage: ${0##*/} [OPTIONS] FILE
Options:
  -h          Show this help
  -v          Verbose output
  -f FILE     Input file
  -o FILE     Output file
EOF
}

main() {
    local verbose=false
    local input_file=""
    local output_file=""

    while getopts ":hvf:o:" opt; do
        case ${opt} in
            h) usage; exit 0 ;;
            v) verbose=true ;;
            f) input_file="${OPTARG}" ;;
            o) output_file="${OPTARG}" ;;
            :) echo "Option -${OPTARG} requires an argument" >&2; exit 1 ;;
            \?) echo "Invalid option: -${OPTARG}" >&2; exit 1 ;;
        esac
    done
    shift $((OPTIND - 1))

    [[ -n "${input_file}" ]] || { echo "Error: -f required" >&2; exit 1; }
}

main "$@"
```

### Long Options (bash case)

```bash
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)    usage; exit 0 ;;
            -v|--verbose) VERBOSE=true; shift ;;
            -f|--file)    INPUT_FILE="$2"; shift 2 ;;
            -o|--output)  OUTPUT_FILE="$2"; shift 2 ;;
            --)           shift; break ;;
            -*)           echo "Unknown option: $1" >&2; exit 1 ;;
            *)            break ;;
        esac
    done
    REMAINING_ARGS=("$@")
}
```

### Subcommand Pattern

```bash
cmd_start() { echo "Starting..."; }
cmd_stop()  { echo "Stopping..."; }

main() {
    [[ $# -lt 1 ]] && { usage; exit 1; }
    local command="$1"; shift
    case "${command}" in
        start)     cmd_start "$@" ;;
        stop)      cmd_stop "$@" ;;
        -h|--help) usage; exit 0 ;;
        *)         echo "Unknown command: ${command}" >&2; usage; exit 1 ;;
    esac
}
```

## Configuration File Handling

### Source-based Config

```bash
load_config() {
    local config_file="${1:-config.conf}"
    if [[ -f "${config_file}" ]]; then
        # shellcheck source=/dev/null
        source "${config_file}"
    fi
}
```

### Key=Value Parser

```bash
load_config() {
    local config_file="$1"
    while IFS='=' read -r key value; do
        [[ -z "${key}" || "${key}" =~ ^[[:space:]]*# ]] && continue
        key=$(echo "${key}" | tr -d '[:space:]')
        value=$(echo "${value}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        declare -g "${key}=${value}"
    done < "${config_file}"
}
```

## Logging

```bash
# LOG_LEVEL: 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
LOG_LEVEL=${LOG_LEVEL:-1}

# Use if-form guards — the && short-circuit returns 1 when check fails,
# which triggers set -e at the call site.
log_debug() { if [[ ${LOG_LEVEL} -le 0 ]]; then echo "[DEBUG] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2; fi; }
log_info()  { if [[ ${LOG_LEVEL} -le 1 ]]; then echo "[INFO]  $(date '+%Y-%m-%d %H:%M:%S') $*" >&2; fi; }
log_warn()  { if [[ ${LOG_LEVEL} -le 2 ]]; then echo "[WARN]  $(date '+%Y-%m-%d %H:%M:%S') $*" >&2; fi; }
log_error() { echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2; }
```

## Parallel Processing

### Background Jobs

```bash
pids=()
for file in *.txt; do
    process_file "${file}" &
    pids+=($!)
done

for pid in "${pids[@]}"; do
    wait "${pid}" || echo "Job ${pid} failed" >&2
done
```

### xargs Parallel

```bash
export -f process_file
find . -name "*.txt" -print0 | xargs -0 -P 4 -I {} bash -c 'process_file "$@"' _ {}
```

## Lock Files

### PID-based Lock with Stale Detection

```bash
acquire_lock() {
    local lock_file="/var/lock/myscript.lock"
    if [[ -f "${lock_file}" ]]; then
        local old_pid
        old_pid=$(cat "${lock_file}")
        if kill -0 "${old_pid}" 2>/dev/null; then
            echo "Another instance (PID ${old_pid}) is running" >&2
            return 1
        fi
        rm -f "${lock_file}"
    fi
    echo $$ > "${lock_file}"
    trap 'rm -f "${lock_file}"' EXIT
}
```

### flock (Atomic)

```bash
exec 200>/var/lock/myscript.lock
flock -n 200 || { echo "Another instance is running" >&2; exit 1; }
```

## Signal Handling

### Cleanup on Exit

```bash
cleanup() {
    local exit_code=$?
    [[ -n "${temp_dir:-}" ]] && rm -rf "${temp_dir}"
    [[ -f "${lock_file:-}" ]] && rm -f "${lock_file}"
    exit "${exit_code}"
}
trap cleanup EXIT
```

### Graceful Shutdown

```bash
SHUTDOWN=false
handle_signal() { SHUTDOWN=true; }
trap handle_signal INT TERM

while [[ "${SHUTDOWN}" == "false" ]]; do
    process_next_item || break
done
```

## Retry Logic

```bash
retry() {
    local max_attempts=3
    local delay=1
    local attempt=1

    while [[ ${attempt} -le ${max_attempts} ]]; do
        if "$@"; then return 0; fi
        echo "Attempt ${attempt} failed, retrying in ${delay}s..." >&2
        sleep "${delay}"
        ((attempt++))
        ((delay*=2))   # exponential backoff
    done

    echo "All ${max_attempts} attempts failed" >&2
    return 1
}

retry curl -f https://api.example.com/data
```

### Retry with Jitter

```bash
retry_with_jitter() {
    local max_attempts="$1"
    local base_delay="$2"
    shift 2
    local attempt=1

    while [[ ${attempt} -le ${max_attempts} ]]; do
        if "$@"; then return 0; fi
        if [[ ${attempt} -lt ${max_attempts} ]]; then
            local jitter=$((RANDOM % base_delay))
            local delay=$((base_delay + jitter))
            echo "Attempt ${attempt} failed, retrying in ${delay}s..." >&2
            sleep "${delay}"
            ((base_delay*=2))
        fi
        ((attempt++))
    done
    return 1
}
```

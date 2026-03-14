# Bash Reference

## Bash-Specific Features (not in POSIX sh)

| Feature | Example |
|---------|---------|
| Indexed arrays | `arr=(one two); echo "${arr[0]}"` |
| Associative arrays | `declare -A map; map[key]=val` |
| `[[ ]]` test construct | `[[ "$var" == pattern* ]]` |
| Process substitution | `diff <(ls dir1) <(ls dir2)` |
| Brace expansion | `echo {1..10}; mv file.{txt,bak}` |
| `local` keyword | `local var="value"` |
| Extended glob | `shopt -s extglob; ?(p) *(p) +(p) @(p) !(p)` |
| Advanced parameter expansion | `${var,,} ${var^^} ${var:0:5} ${var//pat/rep}` |
| `source` command | `source script.sh` (sh uses `. script.sh`) |
| Built-in variables | `$RANDOM $SECONDS $BASH_VERSION $BASH_SOURCE $FUNCNAME` |

## Variables

```bash
var="value"
readonly CONST="constant"
declare -i integer=42
declare -r readonly_var="const"
declare -x export_var="exported"

echo "${var}"          # preferred
result=$(command)      # command substitution
result=$((5 + 3))      # arithmetic
((var++))
((var += 5))
```

## Quoting Rules

```bash
"Value: $var"    # double quotes: expands $, `, \, !
'Value: $var'    # single quotes: literal (no expansion)
cp "$file" "$destination"   # always quote variable expansions
```

## Control Structures

```bash
if [[ condition ]]; then
    # commands
elif [[ condition ]]; then
    # commands
else
    # commands
fi

case "$var" in
    pattern1) ;;
    pat2|pat3) ;;
    *) ;;
esac

for item in list; do echo "$item"; done
for ((i=0; i<10; i++)); do echo "$i"; done
while [[ condition ]]; do; done
until [[ condition ]]; do; done
```

## Functions

```bash
function_name() {
    local local_var="value"
    echo "$1"
    return 0
}

get_value() { echo "returned value"; }
result=$(get_value)
```

## Error Handling

```bash
set -euo pipefail

trap 'echo "Error on line $LINENO"' ERR
trap cleanup EXIT

cleanup() { rm -f "$temp_file"; }
```

## I/O Redirection

```bash
command > file          # redirect stdout
command 2> errors.txt   # redirect stderr
command &> output.txt   # redirect both
command > out.txt 2>&1  # redirect both (POSIX compatible)
command >> file         # append

cat <<EOF
multiple lines
EOF

grep pattern <<< "$variable"  # here-string
```

## Parameter Expansion Reference

```bash
${var}               # value of var
${var:-default}      # use default if unset
${var:=default}      # assign default if unset
${var:?error}        # error if unset
${var:+alternate}    # use alternate if set
${#var}              # length
${var:offset:length} # substring
${var#pattern}       # remove shortest prefix match
${var##pattern}      # remove longest prefix match
${var%pattern}       # remove shortest suffix match
${var%%pattern}      # remove longest suffix match
${var/pat/repl}      # replace first match
${var//pat/repl}     # replace all matches
${var^}              # uppercase first character
${var^^}             # uppercase all
${var,}              # lowercase first character
${var,,}             # lowercase all
```

## Special Variables

```bash
$0      # script name
$1-$9   # positional parameters
${10}   # 10th parameter (braces required)
$#      # number of positional parameters
$*      # all parameters as single word
$@      # all parameters as separate words (use "$@")
$$      # PID of shell
$!      # PID of last background command
$?      # exit status of last command
$_      # last argument of previous command
```

## Best Practices Summary

1. `#!/usr/bin/env bash` — portable shebang
2. `set -euo pipefail` — strict mode
3. Quote variables: `"$var"` — prevents word splitting
4. Use `$()` not backticks
5. Check command existence: `command -v cmd &>/dev/null`
6. Use `[[` for tests in bash, `[` only for POSIX
7. Handle errors: `command || { echo "Failed" >&2; exit 1; }`

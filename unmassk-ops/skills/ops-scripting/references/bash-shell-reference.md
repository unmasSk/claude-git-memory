# POSIX Shell Reference

POSIX sh is the portable shell specification. Scripts written for POSIX sh run across bash, dash, ksh, and ash. `/bin/sh` is dash on Ubuntu/Debian — not bash.

## Features NOT Available in POSIX sh

| Feature | Bash syntax | POSIX alternative |
|---------|------------|-------------------|
| Arrays | `array=(one two)` | Positional params: `set -- one two` |
| `[[` test | `[[ "$a" == "$b" ]]` | `[ "$a" = "$b" ]` |
| `==` operator | `[ "$a" == "$b" ]` | `[ "$a" = "$b" ]` |
| Process substitution | `diff <(ls d1) <(ls d2)` | Temp files |
| Brace expansion | `echo {1..10}` | No equivalent |
| `function` keyword | `function f { }` | `f() { }` |
| `local` keyword | `local var="val"` | Naming convention |
| `source` command | `source file.sh` | `. file.sh` |
| `$RANDOM` | `$RANDOM` | No equivalent |
| `read -p` prompt | `read -p "msg" var` | `printf 'msg'; read var` |
| `read -a` array | `read -a arr` | Not available |

## POSIX Syntax

```sh
#!/bin/sh

# Variables
var="value"
readonly CONST="constant"
echo "$var"
echo "${var}"
result=$(command)
result=$((5 + 3))

# Quoting — same rules as bash
cp "$file" "$destination"
```

## Control Structures

```sh
if [ condition ]; then
    # commands
elif [ condition ]; then
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
while [ condition ]; do; done
until [ condition ]; do; done
```

## Test Constructs: `[ ]`

```sh
[ "$a" = "$b" ]       # equal (use = not ==)
[ "$a" != "$b" ]      # not equal
[ -z "$a" ]           # empty string
[ -n "$a" ]           # non-empty string
[ "$a" -eq "$b" ]     # numeric equal
[ "$a" -ne "$b" ]     # numeric not equal
[ "$a" -lt "$b" ]     # numeric less than
[ -e "$file" ]        # exists (any type)
[ -f "$file" ]        # regular file
[ -d "$file" ]        # directory
[ -r "$file" ]        # readable
[ -w "$file" ]        # writable
[ -x "$file" ]        # executable

# Logical operators — use separate brackets
[ cond1 ] && [ cond2 ]   # AND
[ cond1 ] || [ cond2 ]   # OR
[ ! cond ]                # NOT
# avoid -a and -o inside [ ] — deprecated
```

## Functions

```sh
function_name() {
    # no 'local' in strict POSIX
    echo "$1"
    return 0
}
function_name arg1 arg2
```

## I/O Redirection

```sh
command > file
command 2> errors.txt
command > output.txt 2>&1   # redirect both (not &>)
command >> file
while IFS= read -r line; do
    echo "$line"
done < file.txt
```

## POSIX Best Practices

```sh
#!/bin/sh                        # not /bin/bash

# Quote everything
cp "$source" "$destination"

# Use = not ==
if [ "$var" = "value" ]; then

# Use $() not backticks
result=$(command)

# Check command existence
if command -v shellcheck >/dev/null 2>&1; then
    echo "found"
fi

# Error handling
set -e
cd /some/directory || exit 1
```

## Portability Pitfalls

**echo**: use `printf` for reliable output — `echo -n` and `echo -e` are not portable.

```sh
printf '%s\n' "text"           # portable newline
printf '%s' "no newline"       # portable no-newline
```

**String manipulation**: POSIX only has `#`, `##`, `%`, `%%` — no `//` replacement, no `^^` case change. Use `sed` or `tr` instead.

**Arithmetic**: `$((a + b))` is POSIX. `((a++))` and `let` are not.

**read**: `IFS= read -r line` is POSIX. `-p`, `-a`, `-t` are not.

## Array Alternatives in POSIX sh

```sh
# Positional parameters as array
set -- one two three
echo "$1"   # one
echo "$#"   # 3
for item in "$@"; do echo "${item}"; done
set -- "$@" "four"   # append
shift                # remove first

# Delimited string
items="one:two:three"
IFS=:
for item in $items; do echo "$item"; done
IFS=' '
```

## Testing for POSIX Compliance

```sh
# checkbashisms (Debian/Ubuntu)
apt-get install devscripts
checkbashisms script.sh

# ShellCheck targeting sh
shellcheck -s sh script.sh

# Test with dash
dash script.sh
```

## Standard POSIX Utilities Safe in sh Scripts

`cat`, `echo`, `printf`, `grep`, `sed`, `awk`, `cut`, `sort`, `uniq`, `tr`, `head`, `tail`, `wc`, `find`, `xargs`, `test`, `cd`, `pwd`, `ls`, `cp`, `mv`, `rm`, `mkdir`, `chmod`, `chown`, `read`, `shift`, `set`, `export`

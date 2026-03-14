# Common Shell Scripting Mistakes

## Critical Mistakes

### 1. Unquoted Variables

```bash
# Wrong — breaks on spaces
file="/path/with spaces/file.txt"
cat $file

# Correct
cat "$file"
```

Rule: always quote variable expansions unless word splitting is explicitly needed.

### 2. Not Checking cd Exit Status

```bash
# Wrong — DANGEROUS: rm runs even if cd fails
cd /some/directory
rm -rf *

# Correct
cd /some/directory || exit 1
rm -rf *
```

### 3. Parsing ls Output

```bash
# Wrong — breaks on spaces, newlines, glob chars
for file in $(ls *.txt); do process "$file"; done

# Correct
for file in *.txt; do process "$file"; done
# Or with find:
find . -name "*.txt" -exec process {} \;
```

### 4. Not Using -r with read

```bash
# Wrong — backslashes interpreted
while read line; do echo "$line"; done < file

# Correct
while IFS= read -r line; do echo "$line"; done < file
```

`-r` prevents backslash interpretation. `IFS=` prevents trimming leading/trailing whitespace.

### 5. Not Setting Strict Mode

```bash
# Wrong — typo goes unnoticed
nmae="John"
echo "Hello, $name"   # prints "Hello, "

# Correct — set -u catches it
set -u
nmae="John"
echo "Hello, $name"   # error: name: unbound variable
```

### 6. Ignoring Command Exit Status

```bash
# Wrong — continues after failure
command_that_might_fail
next_command

# Correct
if command_that_might_fail; then
    next_command
else
    echo "Failed" >&2; exit 1
fi
# or: command_that_might_fail || { echo "Failed" >&2; exit 1; }
```

### 7. Testing $? After Multiple Commands

```bash
# Wrong — tests command2's status
command1
command2
if [ $? -eq 0 ]; then  # only tests command2!

# Correct
if command1; then
    echo "command1 succeeded"
fi
```

### 8. Unsafe eval

```bash
# DANGEROUS — arbitrary code execution
eval "$user_input"

# Safe alternative: indirect expansion
var_name="my_var"
echo "${!var_name}"    # bash indirect expansion
```

### 9. Arrays in POSIX sh Scripts

```bash
#!/bin/sh
# Wrong
array=(one two three)   # arrays not in POSIX sh

# Correct — use bash
#!/usr/bin/env bash
array=(one two three)

# Or POSIX alternative
set -- one two three
echo "$1"
```

### 10. Functions Called Before Definition

```bash
# Wrong
my_function    # not defined yet

my_function() { echo "Hello"; }

# Correct — define before use
my_function() { echo "Hello"; }
my_function
```

### 11. [ ] with Bash Features

```bash
# Wrong — == not POSIX
if [ "$var" == "value" ]; then

# Correct (POSIX)
if [ "$var" = "value" ]; then

# Correct (bash)
if [[ "$var" == "value" ]]; then
```

### 12. Useless Use of cat (UUOC)

```bash
# Wrong
cat file.txt | grep pattern
cat file.txt | awk '{print $1}'

# Correct
grep pattern file.txt
awk '{print $1}' file.txt
```

### 13. Using -a and -o Inside [ ]

```bash
# Deprecated and error-prone
[ "$a" = "x" -a "$b" = "y" ]

# Correct
[ "$a" = "x" ] && [ "$b" = "y" ]
# Or in bash:
[[ "$a" = "x" && "$b" = "y" ]]
```

### 14. Not Handling Empty Globs

```bash
# Wrong — processes literal "*.txt" if no match
for file in *.txt; do process "$file"; done

# Correct (bash)
shopt -s nullglob
for file in *.txt; do process "$file"; done
shopt -u nullglob

# Correct (POSIX)
for file in *.txt; do
    [ -e "$file" ] || continue
    process "$file"
done
```

### 15. Not Sanitizing Inputs in Dangerous Commands

```bash
# DANGEROUS — empty $1 causes rm -rf /
rm -rf "/$1"

# Correct
if [[ -z "$1" || "$1" == /* ]]; then
    echo "Error: invalid argument" >&2; exit 1
fi
rm -rf "$1"
```

### 16. Incorrect Exit Codes

```bash
# Wrong — 0 should mean success
check_file() {
    if [ -f "$1" ]; then return 1; fi   # wrong!
}

# Correct — 0 = success, non-zero = failure
check_file() {
    [ -f "$1" ] && return 0 || return 1
}
```

### 17. Not Quoting $@

```bash
# Wrong — breaks arguments with spaces
command $@

# Correct
command "$@"
```

### 18. Backticks Instead of $()

```bash
# Deprecated — hard to read, hard to nest
result=`command`

# Correct
result=$(command)
result=$(outer $(inner))   # nesting is clear
```

### 19. Incorrect Glob Pattern for Hidden Files

```bash
# Wrong — misses dotfiles
for file in *; do process "$file"; done

# Correct (bash)
shopt -s dotglob
for file in *; do process "$file"; done
shopt -u dotglob
```

### 20. Not Making Scripts Executable

```bash
# Always include shebang and set executable bit
#!/usr/bin/env bash
chmod +x script.sh
./script.sh
```

## Quick Checklist

Before running a script:

- [ ] Proper shebang (`#!/usr/bin/env bash`)
- [ ] `set -euo pipefail`
- [ ] All variables quoted
- [ ] Error handling for critical commands
- [ ] `$()` not backticks
- [ ] No `ls` for file processing — use globs or `find`
- [ ] Functions defined before use
- [ ] Exit codes: 0 = success
- [ ] Input validation
- [ ] ShellCheck passes

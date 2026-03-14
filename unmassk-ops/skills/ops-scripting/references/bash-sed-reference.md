# sed Reference

sed (Stream Editor) performs text transformations on input streams (files or pipelines). It processes line by line.

## Syntax

```bash
sed [OPTIONS] 'command' file
sed [OPTIONS] -e 'cmd1' -e 'cmd2' file
sed [OPTIONS] -f script.sed file
```

## Common Options

```bash
-n, --quiet        # suppress automatic print
-e SCRIPT          # add script to commands
-f FILE            # read commands from file
-i[SUFFIX]         # in-place edit (creates backup if SUFFIX given)
-E, -r             # use extended regular expressions (ERE)
```

## Substitution (s)

```bash
sed 's/old/new/' file              # replace first occurrence per line
sed 's/old/new/g' file             # replace all occurrences
sed 's/old/new/2' file             # replace second occurrence
sed 's/old/new/gi' file            # case-insensitive, all
sed 's|/old/path|/new/path|g' file # different delimiter
sed 's#old#new#g' file             # another delimiter

# Flags: g (global), i (case-insensitive), p (print if changed), w file (write)
```

## Address Ranges

```bash
sed '5s/old/new/' file             # line 5 only
sed '5,10s/old/new/' file          # lines 5-10
sed '5,$s/old/new/' file           # line 5 to end
sed '/pattern/s/old/new/' file     # matching lines only
sed '/start/,/end/d' file          # from start pattern to end pattern
sed '$d' file                      # delete last line
sed '1d' file                      # delete first line
```

## Deletion (d), Print (p), Insert (a/i/c)

```bash
sed '5d' file                      # delete line 5
sed '5,10d' file                   # delete lines 5-10
sed '/pattern/d' file              # delete matching lines
sed '/^$/d' file                   # delete empty lines
sed '/^#/d; /^$/d' file            # delete comments and blanks

sed -n '5p' file                   # print only line 5
sed -n '5,10p' file                # print lines 5-10
sed -n '/ERROR/p' file             # print matching lines

sed '/pattern/a\New line after' file
sed '/pattern/i\New line before' file
sed '/pattern/c\Replacement line' file
```

## Multiple Commands

```bash
sed -e 's/old/new/g' -e 's/foo/bar/g' file
sed 's/old/new/g; s/foo/bar/g' file       # semicolon separator
sed '
s/old/new/g
s/foo/bar/g
/pattern/d
' file
```

## In-place Editing

```bash
sed -i 's/old/new/g' file          # edit in place
sed -i.bak 's/old/new/g' file      # create backup first
sed -i 's/old/new/g' *.txt         # multiple files
```

**Always test before in-place edit**: `sed 's/old/new/g' file | head`

## Backreferences

```bash
# BRE (default) — groups need backslashes
sed 's/\([0-9]\+\)/Number: \1/' file
sed 's/\([a-z]\+\) \([0-9]\+\)/\2 \1/' file   # swap

# ERE (-E flag) — no backslashes needed
sed -E 's/([0-9]+)/Number: \1/' file
sed -E 's/([a-z]+) ([0-9]+)/\2 \1/' file
```

Special characters in replacement: `&` (matched string), `\1`-`\9` (groups), `\n` (newline), `\\` (literal backslash).

## Practical Examples

### Config File Editing

```bash
sed -i 's/^Port .*/Port 2222/' /etc/ssh/sshd_config
sed -i 's/^#\(.*option.*\)/\1/' config.file     # uncomment line
sed -i 's/^\(.*dangerous.*\)/#\1/' config.file  # comment out line
sed -i '/\[section\]/a new_setting = value' config.ini
```

### Text Cleanup

```bash
sed 's/[[:space:]]*$//' file        # remove trailing whitespace
sed 's/^[[:space:]]*//' file        # remove leading whitespace
sed '/^$/d' file                    # remove empty lines
sed 's/<[^>]*>//g' file.html        # remove HTML tags
sed -E 's/\s+/ /g' file            # collapse multiple spaces
```

### Path Manipulation

```bash
sed 's|/old/path|/new/path|g' file
echo "/path/to/file.txt" | sed 's|.*/||'     # extract filename
echo "/path/to/file.txt" | sed 's|/[^/]*$||' # extract directory
```

### Log Processing

```bash
# Remove timestamp from log lines
sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\} //' log
# ERE version
sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2} //' log
```

### Code Refactoring

```bash
sed -i 's/\boldFunctionName\b/newFunctionName/g' *.sh
sed -i '1s|^#!/bin/sh|#!/usr/bin/env bash|' *.sh
```

## Hold Space (Advanced)

```bash
h   # copy pattern space to hold space
H   # append pattern space to hold space
g   # copy hold space to pattern space
G   # append hold space to pattern space
x   # exchange pattern and hold spaces

# Reverse file
sed '1!G;h;$!d' file

# Join next line to current
sed 'N;s/\n/ /' file
```

## Common Pitfalls

**Dots match any character**: escape them. `sed 's/192.168.1.1/new/'` matches `192X168Y1Z1`. Use `sed 's/192\.168\.1\.1/new/'`.

**BRE vs ERE escaping**: in BRE (default), `+` is literal — use `\+`. With `-E`, `+` works directly.

**In-place without backup**: dangerous for important files. Use `-i.bak` or test first.

**Variables with `/` in sed**: use different delimiter: `sed "s|$old|$new|g" file`.

**Performance**: combine multiple substitutions: `sed -e 's/a/b/g' -e 's/c/d/g' file` is faster than piping two sed commands.

# grep Reference

grep (Global Regular Expression Print) searches for patterns in text.

## Syntax

```bash
grep [OPTIONS] PATTERN [FILE...]
grep [OPTIONS] -e PATTERN ... [FILE...]
grep [OPTIONS] -f PATTERN_FILE ... [FILE...]
```

## Options

### Matching Control

```bash
-i, --ignore-case           # case-insensitive
-v, --invert-match          # lines NOT matching
-w, --word-regexp           # whole words only
-x, --line-regexp           # whole lines only
-F, --fixed-strings         # literal string (no regex)
-E, --extended-regexp       # use ERE (no escaping of +, ?, |, etc.)
-G, --basic-regexp          # use BRE (default)
-P, --perl-regexp           # PCRE (lookahead, lookbehind)
```

### Output Control

```bash
-c, --count                 # print count of matching lines
-n, --line-number           # show line numbers
-l, --files-with-matches    # print filenames only
-L, --files-without-match   # print filenames without match
-o, --only-matching         # print only matched parts
-q, --quiet                 # no output, exit code only
-H, --with-filename         # print filename (default for multiple files)
-h, --no-filename           # suppress filename
-s, --no-messages           # suppress error messages
--color[=WHEN]              # colorize output
```

### Context

```bash
-A NUM   # NUM lines after match
-B NUM   # NUM lines before match
-C NUM   # NUM lines before and after
```

### File Selection

```bash
-r, --recursive             # recursive search
-R                          # recursive, following symlinks
--include=PATTERN           # search only files matching pattern
--exclude=PATTERN           # skip files matching pattern
--exclude-dir=PATTERN       # skip directories matching pattern
-m NUM                      # stop after NUM matches
```

## Common Usage

```bash
grep "error" logfile.txt
grep -i "error" logfile.txt
grep -n "TODO" *.sh                       # with line numbers
grep -c "ERROR" logfile.txt               # count
grep -l "pattern" *.txt                   # filenames only
grep -r "pattern" /path/to/dir            # recursive
grep -r --include="*.log" "error" /var/log

grep -A 3 "error" log.txt                 # 3 lines after
grep -B 3 "error" log.txt                 # 3 lines before
grep -C 3 "error" log.txt                 # 3 lines both sides

grep -v "debug" logfile.txt               # exclude
grep -e "error" -e "warning" file.txt     # OR (multiple patterns)
grep "error" file.txt | grep "critical"   # AND (pipeline)

grep -r --exclude-dir=".git" "pattern" .
grep -r --exclude-dir={.git,.svn,node_modules} "pattern" .
```

## Regular Expressions in grep

### BRE (default)

```bash
.       # any character
^       # start of line
$       # end of line
[...]   # character class
[^...]  # negated class
*       # zero or more
\+      # one or more (needs backslash in BRE)
\?      # zero or one (needs backslash in BRE)
\{m,n\} # m to n occurrences (needs backslashes in BRE)
\(.\)   # group (needs backslashes in BRE)
\|      # alternation (needs backslash in BRE)
```

### ERE (`grep -E`)

```bash
+       # one or more (no backslash needed)
?       # zero or one
{m,n}   # m to n occurrences
(...)   # group
|       # alternation
```

### POSIX Character Classes

```bash
[[:alnum:]]   # alphanumeric [A-Za-z0-9]
[[:alpha:]]   # alphabetic [A-Za-z]
[[:digit:]]   # digits [0-9]
[[:lower:]]   # lowercase [a-z]
[[:upper:]]   # uppercase [A-Z]
[[:space:]]   # whitespace
[[:blank:]]   # space and tab
[[:punct:]]   # punctuation
[[:xdigit:]]  # hex digits [0-9A-Fa-f]
[[:word:]]    # word characters [A-Za-z0-9_]
```

## Practical Patterns

```bash
# Extract IP addresses
grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' file

# Find URLs
grep -oE 'https?://[^ ]+' file

# Non-comment, non-blank lines
grep -v "^#" config.file | grep -v "^$"

# Check if setting is enabled
grep -q "debug = true" config.ini && echo "Debug enabled"

# Find function definitions
grep -n "^function " script.sh

# Find TODO comments
grep -rn "TODO" --include="*.sh" .

# Count error types
grep -i "error" log.log | cut -d: -f2 | sort | uniq -c | sort -rn
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Match found |
| 1 | No match |
| 2 | Error |

**Important with `set -e`**: `grep` returns 1 when no match is found. Use `grep pattern file || true` or `if grep -q pattern file; then` to avoid unintended script exits.

## Performance Tips

1. **`-F`** for literal strings — faster than regex: `grep -F "literal.string" large_file`
2. **`-q`** when only checking existence — exits on first match
3. **`-m N`** to stop after N matches
4. **`--exclude-dir`** to skip unnecessary directories
5. **Limit recursion depth**: `grep -r --max-depth=2 "pattern" /path`

## Common Pitfalls

**Unquoted patterns with spaces**: `grep "$pattern" file` not `grep $pattern file`.

**grep in tests**: use `grep -q`, not `[ "$(grep ...)" ]`.

**Useless cat**: `grep pattern file` not `cat file | grep pattern`.

**No match with set -e**: `grep "pattern" file || true` prevents script exit when no match.

**Literal dots**: `grep "192\.168\.1\.1" file` not `grep "192.168.1.1" file`.

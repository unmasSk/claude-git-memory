# Regular Expressions Reference

POSIX defines two flavors: Basic Regular Expressions (BRE) and Extended Regular Expressions (ERE).

## BRE vs ERE

| Feature | BRE | ERE |
|---------|-----|-----|
| One or more | `\+` | `+` |
| Zero or one | `\?` | `?` |
| Alternation | `\|` | `|` |
| Grouping | `\(...\)` | `(...)` |
| Quantifiers | `\{m,n\}` | `{m,n}` |

### Which Tool Uses Which

```bash
grep 'pattern' file       # BRE by default
grep -E 'pattern' file    # ERE
sed 's/pattern/repl/' file  # BRE by default
sed -E 's/pattern/repl/' file  # ERE
awk '/pattern/' file      # ERE by default
```

## Metacharacters (Both BRE and ERE)

```regex
.           # any single character except newline
[abc]       # any character in set
[^abc]      # any character NOT in set
[a-z]       # range
^           # start of line
$           # end of line
*           # zero or more of previous
\           # escape next character
```

## Quantifiers

```regex
# ERE (no escaping)          # BRE (escaping required)
+           one or more      \+
?           zero or one      \?
{n}         exactly n        \{n\}
{n,}        n or more        \{n,\}
{n,m}       n to m           \{n,m\}
```

## Grouping and Alternation

```regex
# ERE
(pattern)          # group (also creates backreference \1)
pattern1|pattern2  # OR

# BRE
\(pattern\)        # group
pattern1\|pattern2 # OR
```

## POSIX Character Classes (inside `[...]`)

```regex
[[:alnum:]]   # alphanumeric [A-Za-z0-9]
[[:alpha:]]   # alphabetic [A-Za-z]
[[:digit:]]   # digits [0-9]
[[:lower:]]   # lowercase [a-z]
[[:upper:]]   # uppercase [A-Z]
[[:space:]]   # whitespace [ \t\n\r\f\v]
[[:blank:]]   # space and tab
[[:punct:]]   # punctuation
[[:xdigit:]]  # hex digits [0-9A-Fa-f]
[[:word:]]    # word chars [A-Za-z0-9_] (GNU extension)
[[:graph:]]   # visible characters (not space)
[[:print:]]   # printable characters (including space)
```

Usage: `grep '[[:digit:]]' file` — note the double brackets, outer `[]` is the character class syntax, inner `[:digit:]` is the POSIX class name.

## Anchors

```regex
^           # start of line
$           # end of line
\<          # start of word (GNU extension)
\>          # end of word (GNU extension)
\b          # word boundary (some tools, not all POSIX)
```

## Common Patterns

### Numbers

```bash
# ERE
[0-9]+              # one or more digits
[0-9]{3}            # exactly 3 digits
[0-9]{3,5}          # 3 to 5 digits
-?[0-9]+            # optional negative sign
[0-9]+\.[0-9]+      # decimal number
```

### IP Addresses

```bash
# ERE
grep -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' file
grep -E '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' file   # with word boundaries
```

### Email

```bash
grep -E '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' file
```

### URLs

```bash
grep -E 'https?://[a-zA-Z0-9./?=_-]+' file
```

### Dates

```bash
grep -E '[0-9]{4}-[0-9]{2}-[0-9]{2}' file   # YYYY-MM-DD
```

### Shell Patterns

```bash
# Variable definitions
grep -E '^[a-zA-Z_][a-zA-Z0-9_]*=' file

# Variable usage
grep -E '\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?' file

# Function definitions
grep -E '^[a-zA-Z_][a-zA-Z0-9_]*\s*\(\)' file

# Comments
grep '^[[:space:]]*#' file
```

## Backreferences

```bash
# BRE — capture with \(...\), reference with \1, \2
sed 's/\([0-9]\+\)-\([0-9]\+\)/\2-\1/' file   # swap two numbers

# ERE — capture with (...), reference with \1, \2
sed -E 's/([0-9]+)-([0-9]+)/\2-\1/' file

# Find duplicate words
grep -E '\b([a-z]+) \1\b' file
```

## Greedy Matching

POSIX regex is always greedy (matches longest possible string). To match minimally, exclude the delimiter from the pattern:

```bash
# Greedy — matches "foo bar b"
echo "foo bar baz" | grep -o 'f.*b'

# Minimal — matches "foo b"
echo "foo bar baz" | grep -o 'f[^b]*b'

# Greedy — removes ALL between tags
echo '<tag>content</tag>' | sed 's/<.*>//'     # empty!

# Fixed — remove only tag content
echo '<tag>content</tag>' | sed 's/<[^>]*>//'  # correct
```

## Lookahead/Lookbehind

Not available in POSIX BRE/ERE. Requires PCRE (`grep -P`):

```bash
grep -P '(?<=foo)bar' file   # lookbehind: bar preceded by foo
grep -P 'foo(?=bar)' file    # lookahead: foo followed by bar
```

## Quick Reference Table

| Pattern | BRE | ERE | Matches |
|---------|-----|-----|---------|
| Literal | `abc` | `abc` | abc |
| Any char | `.` | `.` | any single char |
| Start | `^` | `^` | start of line |
| End | `$` | `$` | end of line |
| Zero or more | `*` | `*` | 0+ of previous |
| One or more | `\+` | `+` | 1+ of previous |
| Zero or one | `\?` | `?` | 0 or 1 |
| Exactly n | `\{n\}` | `{n}` | exactly n |
| n or more | `\{n,\}` | `{n,}` | n or more |
| n to m | `\{n,m\}` | `{n,m}` | n to m |
| Group | `\(...\)` | `(...)` | capture group |
| Alternation | `\|` | `|` | OR |
| Character class | `[abc]` | `[abc]` | a, b, or c |
| Negated class | `[^abc]` | `[^abc]` | not a, b, or c |

## Common Mistakes

**Forgetting BRE escaping**: in BRE, `(foo|bar)` is literal — use `\(foo\|bar\)` or switch to ERE with `-E`.

**Using `+` without `-E`**: `grep '[0-9]+'` in BRE matches the literal `+`. Use `grep -E '[0-9]+'` or `grep '[0-9]\+'`.

**Literal dots unescaped**: `grep '192.168.1.1'` matches `192X168Y1Z1`. Use `grep '192\.168\.1\.1'` or `-F`.

**Wrong character class range**: `[a-Z]` is undefined behavior. Use `[a-zA-Z]` or `[[:alpha:]]`.

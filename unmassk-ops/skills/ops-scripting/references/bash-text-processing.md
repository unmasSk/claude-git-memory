# Text Processing: grep, awk, sed

## Decision Tree

```
Is it a simple pattern match or filter?
    YES → grep
    NO
        Is it field/column-based data (CSV, logs, tables)?
            YES → awk
            NO
                Is it find-and-replace or line deletion?
                    YES → sed
                    NO → awk, or Python/Perl for complex logic
```

## grep: Pattern Matching and Filtering

When to use: searching patterns, filtering lines, counting matches, finding files.

```bash
grep "error" file.txt                    # basic search
grep -i "error" file.txt                 # case-insensitive
grep -v "debug" file.txt                 # invert match
grep -c "ERROR" file.txt                 # count matches
grep -n "TODO" *.sh                      # line numbers
grep -l "pattern" *.txt                  # files with matches only
grep -L "pattern" *.txt                  # files without match
grep -r --include="*.log" "error" /var/log  # recursive with file filter
grep -E "(error|fail|critical)" log.txt  # extended regex
grep -A 2 -B 2 "ERROR" log.txt           # context lines
grep -e "error" -e "fail" log.txt        # multiple patterns
grep -w "test" file.txt                  # whole word only
grep -F "a.b" file.txt                   # fixed string (no regex)
grep -q "pattern" file && echo "found"   # silent: exit code only
grep -m 10 "pattern" file               # stop after 10 matches
```

**Always use `-q` when only checking existence** — exits on first match, faster.

## awk: Field-Based Processing

When to use: structured data (CSV, logs), extracting columns, calculations, reports.

```bash
awk '{print $1}' file.txt               # first field
awk '{print $1, $3}' file.txt           # first and third
awk '{print $NF}' file.txt              # last field
awk -F',' '{print $1}' file.csv         # CSV separator
awk -F':' '{print $1}' /etc/passwd      # colon separator
awk -F'[,:]' '{print $1}' file          # multiple separators
awk -v OFS='\t' '{print $1, $2}' file   # custom output separator

# Pattern matching
awk '/error/ {print}' file              # lines matching pattern
awk '$2 ~ /error/' log.txt              # field matches
awk '$2 !~ /DEBUG/' log.txt             # field doesn't match
awk '$3 > 100' data.txt                 # numeric comparison
awk '$1 > 100 && $2 == "active"' file   # multiple conditions

# Calculations
awk '{sum += $1} END {print sum}' file               # sum column
awk '{sum += $1; count++} END {print sum/count}' f   # average
awk '{count[$1]++} END {for (k in count) print k, count[k]}' f  # frequency

# BEGIN/END blocks
awk 'BEGIN {FS=","} NR > 1 {print $1, $2} END {print "done"}' file.csv

# Printf formatting
awk '{printf "%-20s %10.2f\n", $1, $2}' data.txt

# Deduplication (keep first occurrence)
awk '!seen[$0]++' file
```

**Built-in variables**: `NF` (field count), `NR` (line number), `FNR` (line in current file), `FS` (input separator), `OFS` (output separator), `FILENAME`.

## sed: Stream Editing

When to use: find-and-replace, line deletion, in-place file editing.

```bash
sed 's/old/new/' file                   # replace first occurrence per line
sed 's/old/new/g' file                  # replace all occurrences
sed 's/old/new/gi' file                 # case-insensitive, all
sed 's|/old/path|/new/path|g' file      # different delimiter
sed -i 's/old/new/g' file               # in-place edit
sed -i.bak 's/old/new/g' file           # in-place with backup

# Deletion
sed '5d' file                           # delete line 5
sed '5,10d' file                        # delete lines 5-10
sed '/pattern/d' file                   # delete matching lines
sed '/^$/d' file                        # delete empty lines
sed '/^#/d; /^$/d' file                 # delete comments and blanks

# Line selection
sed -n '5p' file                        # print only line 5
sed -n '5,10p' file                     # print lines 5-10
sed -n '/ERROR/p' file                  # print matching lines

# Insertion
sed '/pattern/a\New line after' file    # append after match
sed '/pattern/i\New line before' file   # insert before match

# ERE mode (more readable)
sed -E 's/([0-9]+)/Number: \1/' file
sed -E 's/\s+/ /g' file                # collapse whitespace

# Common text operations
sed 's/[[:space:]]*$//' file            # remove trailing whitespace
sed 's/^[[:space:]]*//' file            # remove leading whitespace
sed 's/<[^>]*>//g' file.html            # remove HTML tags
```

**Always test before in-place edit**: `sed 's/old/new/g' file | head`

## Pipeline Patterns

```bash
# grep + awk: filter then extract
grep "ERROR" log.txt | awk '{print $1, $5}'

# sed + awk: clean then process
sed '/^#/d' config.txt | awk -F'=' '{print $1}'

# Complete log analysis pipeline
cat access.log \
    | grep "GET" \
    | grep -v "robot" \
    | awk '$9 >= 400 {count++} END {print "Errors:", count}'
```

## Performance

- Use `-F` with grep for literal strings — faster than regex
- Use `awk '!seen[$0]++'` for deduplication — avoids sort+uniq
- Combine multiple sed commands in one call: `sed -e 's/a/b/' -e 's/c/d/'`
- Avoid useless `cat file | tool` — use `tool file` or `< file tool`
- Use `awk` for multiple passes over the same data; it processes once

## Log Analysis Patterns

```bash
# Count HTTP status codes
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# Top 10 IPs
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10

# Errors by type
grep "ERROR" app.log | sed 's/.*ERROR: //' | sort | uniq -c | sort -rn | head -10

# Non-comment, non-blank config lines
sed -e 's/#.*//' -e '/^$/d' config.txt

# Convert KEY=VALUE to JSON
awk -F'=' 'BEGIN {print "{"} {printf "  \"%s\": \"%s\",\n", $1, $2} END {print "}"}' config.txt
```

# AWK Reference

AWK is a text processing language for field-based data manipulation. It processes input line by line, splitting each line into fields.

## Syntax

```bash
awk 'pattern { action }' file
awk -F delimiter 'pattern { action }' file
awk -f script.awk file
```

## Program Structure

```awk
BEGIN { # executed before first line }
/pattern/ { # executed for each matching line }
{ # executed for every line (no pattern = match all) }
END { # executed after last line }
```

## Built-in Variables

| Variable | Meaning |
|----------|---------|
| `$0` | entire current line |
| `$1`, `$2`, ... | fields 1, 2, ... |
| `$NF` | last field |
| `$(NF-1)` | second to last field |
| `NF` | number of fields in current record |
| `NR` | current record (line) number |
| `FNR` | record number in current file |
| `FS` | input field separator (default: whitespace) |
| `OFS` | output field separator (default: space) |
| `RS` | input record separator (default: newline) |
| `ORS` | output record separator (default: newline) |
| `FILENAME` | current filename |

## Field Processing

```bash
awk '{print $1}' file                    # first field
awk '{print $1, $3}' file                # first and third
awk '{print $NF}' file                   # last field
awk '{print NR, $0}' file                # line number + line
awk '{print $1 ":" $2}' file             # custom separator in output
awk -v OFS='\t' '{print $1, $2}' file    # tab-separated output

awk -F',' '{print $1}' file.csv          # comma separator
awk -F':' '{print $1}' /etc/passwd       # colon separator
awk -F'[,:]' '{print $1}' file           # regex separator
awk 'BEGIN {FS=","} {print $1}' file     # separator in BEGIN
```

## Pattern Matching

```bash
awk '/pattern/ {print}' file             # lines matching regex
awk '$2 ~ /error/' log.txt               # field 2 matches
awk '$2 !~ /DEBUG/' log.txt              # field 2 doesn't match
awk '$1 == "value"' file                 # exact field match
awk 'tolower($0) ~ /pattern/' file       # case-insensitive
awk '$3 > 100' data.txt                  # numeric comparison
awk '$1 >= 10 && $1 <= 20' file          # range
```

## Calculations

```bash
awk '{sum += $1} END {print sum}' file                     # sum
awk '{sum += $1; count++} END {print sum/count}' file      # average
awk '{if ($1 > max) max=$1} END {print max}' file          # max
awk '{count[$1]++} END {for (k in count) print k, count[k]}' file  # frequency
awk '{sum[$1] += $2} END {for (k in sum) print k, sum[k]}' file    # sum by group
awk 'END {print NR}' file                                  # count lines
awk '/pattern/ {count++} END {print count}' file           # count matches
```

## Conditionals

```bash
awk '{if ($1 > 100) print "High"; else print "Low"}' file
awk '{print ($1 > 100) ? "High" : "Low"}' file             # ternary
awk '{
    if ($1 > 100) print "High"
    else if ($1 > 50) print "Medium"
    else print "Low"
}' file
```

## Arrays

```awk
# Associative arrays
awk '{count[$1]++} END {for (k in count) print k, count[k]}' file

# Check key existence
awk '{if ($1 in array) print "Duplicate: " $1}' file

# Count unique values
awk '{a[$1]++} END {print length(a)}' file

# Deduplication (keep first occurrence of each line)
awk '!seen[$0]++' file
```

## Built-in String Functions

```awk
length(string)                    # string length
substr(string, start, len)        # substring (1-indexed)
index(string, substring)          # position of substring (0 if not found)
split(string, array, sep)         # split into array
sub(regex, replacement, string)   # replace first match (modifies string)
gsub(regex, replacement, string)  # replace all matches
tolower(string)                   # convert to lowercase
toupper(string)                   # convert to uppercase
match(string, regex)              # returns position, sets RSTART/RLENGTH
sprintf(format, ...)              # formatted string (like printf)
```

## Formatted Output

```bash
awk '{printf "%-20s %10.2f\n", $1, $2}' file   # aligned columns
awk '{printf "%s: %8d\n", $1, $2}' data.txt    # right-aligned integer
awk 'BEGIN {OFS="\t"} {print $1, $2, $3}' file # tab output via OFS
```

## Multi-line awk Scripts

```bash
awk '
BEGIN {
    FS = ","
}
NR > 1 {
    sum += $2
    count++
}
END {
    print "Average:", sum/count
}
' file.csv

# Or from file
awk -f script.awk file.csv
```

## Practical Patterns

```bash
# Skip header, process body
awk -F',' 'NR > 1 {print $1, $2}' file.csv

# Print specific line range
awk 'NR>=10 && NR<=20' file

# Skip empty lines
awk 'NF > 0' file

# Swap columns
awk '{print $2, $1}' file

# Add line numbers
awk '{print NR ":", $0}' file

# Join all lines
awk '{printf "%s ", $0} END {print ""}' file

# Parse /etc/passwd
awk -F':' '{print $1, $6}' /etc/passwd         # username, home
awk -F':' '$3 >= 1000 {print $1}' /etc/passwd  # regular users

# Disk usage alert
df -h | awk '$5+0 > 80 {print "Full:", $0}'

# Apache log: count status codes
awk '{print $9}' access.log | sort | uniq -c | sort -rn
```

## Common Pitfalls

**Not quoting awk program**: `awk {print $1} file` — shell expands `$1`. Always quote: `awk '{print $1}' file`.

**Division by zero**: check `if ($2 != 0) print $1/$2; else print "N/A"`.

**Floating point equality**: use tolerance instead of `==`: `abs($1 - 0.1) < 0.001`.

**Missing field check**: use `NF >= 3 {print $3}` before accessing `$3`.

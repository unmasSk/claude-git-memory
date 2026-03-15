---
name: False positives — patterns that are intentional
description: Patterns that look suspicious but are correct in this codebase
type: project
---

## scripts/README.md is not an orphaned file

In any `scripts/` directory inside a skill, a `README.md` is expected documentation. Do not flag it as an orphaned file when auditing routing table coverage against disk contents.

## SKILL.md has two routing tables

unmassk-marketing SKILL.md has BOTH a "Request Routing" table (lines 59-73) AND a "Reference Files" table (lines 189-205). Both reference the same 14 files. This is intentional redundancy (one for quick routing, one for load-when context). Do not flag as duplication.

## finalize_exit + exit $? two-step in cluster_health.sh and network_debug.sh

```bash
finalize_exit
exit $?
```

This is intentional. Calling `exit` directly in `finalize_exit()` would exit the shell if the function were ever sourced. The two-step preserves the exit code from the function's `return` statement and then exits the script. Do not flag as redundant.

## sed -i.bak pattern in generate_* scripts

```bash
sed -i.bak "s/PLACEHOLDER/value/g" "$FILE"
rm -f "${FILE}.bak"
```

This is the cross-platform form of `sed -i` (GNU requires `-i ''`, macOS requires `-i .bak`). The `.bak` suffix approach is intentional for macOS compatibility. The `.bak` cleanup with `rm -f` is correct. Do not flag as unnecessary.

## IGNORECASE=1 replaced by tolower() in dockerfile-validate.sh awk

In `dockerfile-validate.sh` around line 415, the comment explains that BSD awk (macOS) does not honour `IGNORECASE=1` for the `~` dynamic regex operator, only for literal `/patterns/`. Using `tolower()` before the `~` comparison is the correct workaround. Do not flag as inconsistent style.

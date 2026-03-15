---
name: ops-iac fix lessons
description: Lessons from fixing Critical/High findings in ops-iac scripts
type: project
---

## H-2 symlink fix order matters

When fixing the hardcoded `test_role` symlink in validate_role.sh, `ROLE_NAME` must be computed **before** the heredoc that references it (not after). The original code computed ROLE_NAME after the heredoc. When moving ROLE_NAME earlier, the heredoc can use `${ROLE_NAME}` correctly.

## FAILED=0 initialization

validate_playbook_security.sh and validate_role_security.sh reference `$FAILED` in the final summary (`$FAILED security issue(s)`) but never initialize it. This causes an unbound variable error under `set -u`. Add `FAILED=0` next to `ERRORS=0` and `WARNINGS=0`.

## set -euo pipefail vs set -e

Bare `set -e` doesn't catch unset variable references (`-u`) or pipeline failures (`-o pipefail`). Always use `set -euo pipefail` in new and existing scripts.

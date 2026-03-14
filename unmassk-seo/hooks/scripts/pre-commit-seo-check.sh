#!/usr/bin/env bash
set -euo pipefail

# unmassk-seo: Pre-commit SEO validation hook.
#
# Runs on all Bash tool uses via PreToolUse matcher.
# Checks staged HTML-like files for common SEO issues.
#
# DESIGN: Always exits 0 (never blocks). Outputs aggressive warnings
# that force Claude to acknowledge and act on SEO issues.

ISSUES=0

# Check if there are staged changes — exit early if not
if ! git diff --cached --quiet 2>/dev/null; then
    : # There are staged changes, proceed with checks
else
    exit 0  # No staged changes, nothing to check
fi

# Check staged HTML-like files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.(html|htm|php|jsx|tsx|vue|svelte|ejs)$' || true)

if [ -z "${STAGED_FILES}" ]; then
    exit 0
fi

echo ""
echo "=========================================="
echo "[SEO-WARNING] unmassk-seo: Scanning staged files..."
echo "=========================================="

for file in ${STAGED_FILES}; do
    if [ ! -f "${file}" ]; then
        continue
    fi

    # Check for placeholder text in schema
    if grep -qiE '\[(Business Name|City|State|Phone|Address|Your|INSERT|REPLACE|URL|Email)\]' "${file}" 2>/dev/null; then
        echo ""
        echo "[SEO-WARNING] CRITICAL: ${file}"
        echo "  Contains placeholder text in schema markup (e.g. [Business Name], [City], [INSERT])."
        echo "  Placeholder text will render in search results and destroy credibility."
        ISSUES=$((ISSUES + 1))
    fi

    # Check for deprecated schema types
    if grep -qE '"@type"\s*:\s*"(HowTo|SpecialAnnouncement|CourseInfo)"' "${file}" 2>/dev/null; then
        DTYPE=$(grep -oE '"@type"\s*:\s*"(HowTo|SpecialAnnouncement|CourseInfo)"' "${file}" 2>/dev/null | head -1 || true)
        echo ""
        echo "[SEO-WARNING] CRITICAL: ${file}"
        echo "  Contains deprecated schema type: ${DTYPE}"
        echo "  Google no longer generates rich results for this type. Remove or replace."
        ISSUES=$((ISSUES + 1))
    fi

    # Check for images without alt text
    if grep -qP '<img(?![^>]*alt=)' "${file}" 2>/dev/null; then
        echo ""
        echo "[SEO-WARNING] CRITICAL: ${file}"
        echo "  Images found without alt text."
        echo "  Missing alt attributes harm accessibility and image search rankings."
        ISSUES=$((ISSUES + 1))
    fi

    # Check for FID references (should be INP)
    if grep -qi 'First Input Delay\|"FID"' "${file}" 2>/dev/null; then
        echo ""
        echo "[SEO-WARNING] CRITICAL: ${file}"
        echo "  References FID (First Input Delay) which was replaced by INP (Interaction to Next Paint) in March 2024."
        echo "  Update all FID references to INP."
        ISSUES=$((ISSUES + 1))
    fi

    # Check title tag length
    TITLE=$(grep -oP '(?<=<title>).*?(?=</title>)' "${file}" 2>/dev/null | head -1 || true)
    if [ -n "${TITLE}" ]; then
        TITLE_LEN=${#TITLE}
        if [ "${TITLE_LEN}" -lt 30 ] || [ "${TITLE_LEN}" -gt 60 ]; then
            echo ""
            echo "[SEO-WARNING] CRITICAL: ${file}"
            echo "  Title tag length is ${TITLE_LEN} chars (recommended: 30-60)."
            echo "  Titles outside this range get truncated or underperform in SERPs."
            ISSUES=$((ISSUES + 1))
        fi
    fi

    # Check meta description length
    META_DESC=$(grep -oP '(?<=<meta name="description" content=").*?(?=")' "${file}" 2>/dev/null | head -1 || true)
    if [ -n "${META_DESC}" ]; then
        META_LEN=${#META_DESC}
        if [ "${META_LEN}" -lt 120 ] || [ "${META_LEN}" -gt 160 ]; then
            echo ""
            echo "[SEO-WARNING] CRITICAL: ${file}"
            echo "  Meta description length is ${META_LEN} chars (recommended: 120-160)."
            echo "  Descriptions outside this range get truncated or replaced by Google."
            ISSUES=$((ISSUES + 1))
        fi
    fi
done

if [ "${ISSUES}" -gt 0 ]; then
    echo ""
    echo "=========================================="
    echo "[SEO-WARNING] ${ISSUES} issue(s) detected in staged files."
    echo ""
    echo "ACTION REQUIRED: Fix these before proceeding."
    echo "If SEO is not relevant to current work, acknowledge and continue."
    echo "=========================================="
fi

# NEVER block — always exit 0
exit 0

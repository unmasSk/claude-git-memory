#!/usr/bin/env python3
"""unmassk-seo: Post-edit JSON-LD schema validation hook.

Validates JSON-LD structured data blocks after Edit/Write operations.
DESIGN: Always exits 0 (never blocks). Outputs aggressive warnings
that force Claude to acknowledge and act on schema issues.
"""

import json
import re
import sys
import os
from typing import List


def validate_jsonld(content: str) -> List[str]:
    """Validate JSON-LD blocks in HTML content."""
    errors = []
    pattern = r'<script\s+type=["\']application/ld\+json["\']\s*>(.*?)</script>'
    blocks = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)

    if not blocks:
        return []  # No schema found — not an error

    for i, block in enumerate(blocks, 1):
        block = block.strip()
        try:
            data = json.loads(block)
        except json.JSONDecodeError as e:
            errors.append(f"Block {i}: Invalid JSON — {e}")
            continue

        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    errors.extend(_validate_schema_object(item, i))
        elif isinstance(data, dict):
            errors.extend(_validate_schema_object(data, i))

    return errors


def _validate_schema_object(obj: dict, block_num: int) -> List[str]:
    """Validate a single schema object."""
    errors = []
    prefix = f"Block {block_num}"

    # Check @context
    if "@context" not in obj:
        errors.append(f"{prefix}: Missing @context — required for all JSON-LD")
    elif obj["@context"] not in ("https://schema.org", "http://schema.org"):
        errors.append(
            f"{prefix}: @context is '{obj['@context']}' — should be 'https://schema.org'"
        )

    # Check @type
    if "@type" not in obj:
        errors.append(f"{prefix}: Missing @type — required for all JSON-LD")

    # Check for placeholder text
    placeholders = [
        "[Business Name]",
        "[City]",
        "[State]",
        "[Phone]",
        "[Address]",
        "[Your",
        "[INSERT",
        "REPLACE",
        "[URL]",
        "[Email]",
    ]
    text = json.dumps(obj)
    for p in placeholders:
        if p.lower() in text.lower():
            errors.append(
                f"{prefix}: Contains placeholder text '{p}' — will render in search results"
            )

    # Check for deprecated types
    schema_type = obj.get("@type", "")
    deprecated = {
        "HowTo": "deprecated September 2023 — Google no longer generates rich results",
        "SpecialAnnouncement": "deprecated July 31, 2025 — no longer supported",
        "CourseInfo": "retired June 2025 — use Course instead",
        "EstimatedSalary": "retired June 2025 — use Occupation.estimatedSalary",
        "LearningVideo": "retired June 2025 — use VideoObject with educationalAlignment",
        "ClaimReview": "retired June 2025 — fact-check rich results discontinued",
        "VehicleListing": "retired June 2025 — vehicle listing structured data discontinued",
    }
    if schema_type in deprecated:
        errors.append(f"{prefix}: @type '{schema_type}' is {deprecated[schema_type]}")

    # Check for restricted types
    restricted = {
        "FAQPage": "restricted to government and healthcare sites only (Aug 2023)"
    }
    if schema_type in restricted:
        errors.append(
            f"{prefix}: @type '{schema_type}' is {restricted[schema_type]} — verify site qualifies"
        )

    return errors


def main():
    if len(sys.argv) < 2:
        sys.exit(0)

    filepath = sys.argv[1]

    if not filepath or not os.path.isfile(filepath):
        sys.exit(0)

    # Only validate HTML-like files
    valid_extensions = (
        ".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".php", ".ejs",
    )
    if not filepath.endswith(valid_extensions):
        sys.exit(0)

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except (OSError, IOError):
        sys.exit(0)

    errors = validate_jsonld(content)

    if not errors:
        sys.exit(0)

    # All errors get the same aggressive warning treatment
    print("")
    print("==========================================")
    print("[SEO-WARNING] SCHEMA: unmassk-seo validation found issues:")
    print("==========================================")
    print(f"  File: {filepath}")
    print("")
    for e in errors:
        print(f"  - {e}")
    print("")
    print("==========================================")
    print(f"[SEO-WARNING] SCHEMA: {len(errors)} issue(s) in JSON-LD structured data.")
    print("")
    print("ACTION REQUIRED: Fix these before proceeding.")
    print("If SEO is not relevant to current work, acknowledge and continue.")
    print("==========================================")

    # NEVER block — always exit 0
    sys.exit(0)


if __name__ == "__main__":
    main()

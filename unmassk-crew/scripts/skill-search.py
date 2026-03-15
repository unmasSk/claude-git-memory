#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
skill-search.py — BM25 skill router for unmassk-crew agents

Finds the most relevant domain skill for a given task. Agents run this
on boot to load domain-specific knowledge (checklists, patterns, scripts,
references) before doing any work.

Usage:
  python3 skill-search.py "<task description>"
  python3 skill-search.py "<task description>" --top 3
  python3 skill-search.py "<task description>" --json

Scans .skillcat files from:
  - ~/.claude/plugins/cache/   (marketplace plugins)
  - ~/.claude/skills/          (user skills)
  - <git-root>/.claude/skills/ (project skills)
  - <git-root>/                (dev repos with colocated skillcats)

Each .skillcat is CSV: name,plugin,triggers,domains,frameworks,tools
Each skill has a colocated SKILL.md with frontmatter description.
"""

import argparse
import csv
import json
import re
import sys
import os
from pathlib import Path
from math import log
from collections import defaultdict


# ============ CONFIGURATION ============

MAX_RESULTS = 5
LOW_SCORE_THRESHOLD = 1.5
CONFIDENT_THRESHOLD = 5.0

SEARCH_DIRS = [
    Path.home() / ".claude" / "plugins" / "cache",
    Path.home() / ".claude" / "skills",
]

_extra_env = os.environ.get("SKILL_SEARCH_EXTRA_DIRS", "")
if _extra_env:
    SEARCH_DIRS += [Path(p) for p in _extra_env.split(":") if p]

SEARCH_COLS = ["name", "triggers", "domains", "frameworks", "tools"]


# ============ BM25 IMPLEMENTATION ============

class BM25:
    def __init__(self, k1=1.5, b=0.75):
        self.k1 = k1
        self.b = b
        self.corpus = []
        self.doc_lengths = []
        self.avgdl = 0
        self.idf = {}
        self.doc_freqs = defaultdict(int)
        self.N = 0

    def tokenize(self, text):
        text = re.sub(r'[^\w\s\-]', ' ', str(text).lower())
        return [w for w in text.split() if len(w) > 1]

    def fit(self, documents):
        self.doc_freqs = defaultdict(int)
        self.idf = {}
        self.corpus = [self.tokenize(doc) for doc in documents]
        self.N = len(self.corpus)
        if self.N == 0:
            return
        self.doc_lengths = [len(doc) for doc in self.corpus]
        self.avgdl = sum(self.doc_lengths) / self.N
        for doc in self.corpus:
            seen = set()
            for word in doc:
                if word not in seen:
                    self.doc_freqs[word] += 1
                    seen.add(word)
        for word, freq in self.doc_freqs.items():
            self.idf[word] = log((self.N - freq + 0.5) / (freq + 0.5) + 1)

    def score(self, query):
        query_tokens = self.tokenize(query)
        if not query_tokens or self.avgdl == 0:
            return []
        scores = []
        for idx, doc in enumerate(self.corpus):
            score = 0
            doc_len = self.doc_lengths[idx]
            term_freqs = defaultdict(int)
            for word in doc:
                term_freqs[word] += 1
            for token in query_tokens:
                if token in self.idf:
                    tf = term_freqs[token]
                    idf = self.idf[token]
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)
                    score += idf * numerator / denominator
            scores.append((idx, score))
        return sorted(scores, key=lambda x: x[1], reverse=True)


# ============ GIT ROOT ============

def find_git_root():
    current = Path(os.getcwd()).resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".git").exists():
            return parent
    return None


# ============ DISCOVERY ============

def collect_search_dirs():
    dirs = list(SEARCH_DIRS)
    git_root = find_git_root()
    if git_root:
        dirs.append(git_root / ".claude" / "skills")
        dirs.append(git_root)
    return dirs


def discover_skillcats(search_dirs):
    seen = set()
    found = []
    for base in search_dirs:
        if not base.exists() or not base.is_dir():
            continue
        for path in base.rglob("*.skillcat"):
            if path.is_symlink():
                continue
            resolved = path.resolve()
            if resolved not in seen:
                seen.add(resolved)
                found.append(resolved)
    return found


# ============ PARSING ============

def parse_skillcat(path):
    rows = []
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get("name") or "").strip()
                if not name:
                    continue
                rows.append({
                    "name": name,
                    "plugin": (row.get("plugin") or "").strip(),
                    "triggers": (row.get("triggers") or "").strip(),
                    "domains": (row.get("domains") or "").strip(),
                    "frameworks": (row.get("frameworks") or "").strip(),
                    "tools": (row.get("tools") or "").strip(),
                    "skillcat_path": path,
                })
    except Exception as e:
        print(f"WARNING: skipping {path}: {e}", file=sys.stderr)
    return rows


def build_document(row):
    parts = [row.get(col, "") for col in SEARCH_COLS]
    return " ".join(parts)


def derive_skill_md_path(skillcat_path):
    return skillcat_path.parent / "SKILL.md"


def read_skill_description(skill_md_path):
    """Read the description from SKILL.md frontmatter."""
    if not skill_md_path.exists():
        return ""
    try:
        with open(skill_md_path, "r", encoding="utf-8") as f:
            content = f.read(4096).replace('\r\n', '\n')  # normalize CRLF
        # Extract YAML frontmatter
        match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
        if not match:
            return ""
        frontmatter = match.group(1)
        # Extract description (handles multi-line with >)
        desc_match = re.search(
            r'^description:\s*>?\s*\n?(.*?)(?=\n[a-zA-Z_-]+:|\Z)',
            frontmatter,
            re.MULTILINE | re.DOTALL
        )
        if desc_match:
            desc = desc_match.group(1).strip()
            # Clean up multi-line: collapse indented continuation lines
            desc = re.sub(r'\n\s+', ' ', desc)
            # Truncate to first sentence or 200 chars for display
            if len(desc) > 200:
                cut = desc[:200].rfind('.')
                if cut > 80:
                    desc = desc[:cut + 1]
                else:
                    desc = desc[:200] + "..."
            return desc
        # Single-line description
        desc_match = re.search(r'^description:\s*(.+)$', frontmatter, re.MULTILINE)
        if desc_match:
            desc = desc_match.group(1).strip().strip('"').strip("'")
            if len(desc) > 200:
                cut = desc[:200].rfind('.')
                if cut > 80:
                    desc = desc[:cut + 1]
                else:
                    desc = desc[:200] + "..."
            return desc
    except Exception:
        pass
    return ""


# ============ OUTPUT FORMATTING ============

def format_ascii(results, query, total_skills):
    """Rich ASCII output with all info an agent needs to decide."""
    lines = []
    lines.append("")
    lines.append("+-----------------------------------------------------------------------------------+")
    lines.append(f"|  SKILL SEARCH — {len(results)} results for: {query[:55]:<55} |")
    lines.append(f"|  Corpus: {total_skills} skills indexed                                                        |"[:85] + "|")
    lines.append("+-----------------------------------------------------------------------------------+")

    if not results:
        lines.append("|  No matches found. Try different keywords.                                       |")
        lines.append("+-----------------------------------------------------------------------------------+")
        return "\n".join(lines)

    best = results[0]
    if best["score"] < LOW_SCORE_THRESHOLD:
        lines.append("|  ⚠  LOW CONFIDENCE — best score {:.1f} < {:.1f}. Consider more specific keywords.    |".format(
            best["score"], LOW_SCORE_THRESHOLD)[:85] + "|")
        lines.append("|                                                                                   |")

    for i, r in enumerate(results):
        if r["score"] <= 0 and i > 0:
            break  # skip zero-score results after showing at least #1

        rank = i + 1
        confidence = "★★★" if r["score"] >= CONFIDENT_THRESHOLD else "★★☆" if r["score"] >= LOW_SCORE_THRESHOLD else "★☆☆"

        lines.append("|  {:─<83}|".format(""))
        lines.append("|  #{} {} (score: {:.1f}) {}{}|".format(
            rank, r["name"], r["score"], confidence,
            " " * max(0, 68 - len(r["name"]) - len(f"{r['score']:.1f}") - len(confidence))))
        lines.append("|  Plugin: {}{}|".format(
            r["plugin"], " " * max(0, 75 - len(r["plugin"]))))

        if r["description"]:
            # Word-wrap description to ~78 chars
            desc = r["description"]
            while desc:
                chunk = desc[:78]
                if len(desc) > 78:
                    sp = chunk.rfind(' ')
                    if sp > 40:
                        chunk = desc[:sp]
                        desc = desc[sp + 1:]
                    else:
                        desc = desc[78:]
                else:
                    desc = ""
                lines.append("|    {}{}|".format(chunk, " " * max(0, 80 - len(chunk))))

        lines.append("|    Domains:    {}{}|".format(
            r["domains"], " " * max(0, 69 - len(r["domains"]))))
        lines.append("|    Frameworks: {}{}|".format(
            r["frameworks"], " " * max(0, 69 - len(r["frameworks"]))))
        if r["tools"] and r["tools"] != "none":
            lines.append("|    Tools:      {}{}|".format(
                r["tools"], " " * max(0, 69 - len(r["tools"]))))
        lines.append("|    SKILL.md:   {}{}|".format(
            str(r["skill_md"]), " " * max(0, 69 - len(str(r["skill_md"])))))
        lines.append("|                                                                                   |")

    lines.append("+-----------------------------------------------------------------------------------+")
    lines.append("|  ACTION: Read the SKILL.md of result #1 if score >= {:.1f} (★★☆ or ★★★).           |".format(LOW_SCORE_THRESHOLD))
    lines.append("|  If ★☆☆ or no match, proceed without domain skill.                               |")
    lines.append("+-----------------------------------------------------------------------------------+")

    return "\n".join(lines)


def format_json(results, query, total_skills):
    """JSON output for programmatic consumption."""
    return json.dumps({
        "query": query,
        "total_skills": total_skills,
        "results": [{
            "rank": i + 1,
            "name": r["name"],
            "score": round(r["score"], 1),
            "plugin": r["plugin"],
            "description": r["description"],
            "domains": r["domains"],
            "frameworks": r["frameworks"],
            "tools": r["tools"],
            "skill_md": str(r["skill_md"]),
        } for i, r in enumerate(results) if r["score"] > 0 or i == 0]
    }, indent=2)


# ============ MAIN ============

def main():
    parser = argparse.ArgumentParser(
        description="BM25 skill router for unmassk-crew agents",
        epilog="""
EXAMPLES (good queries — include technology names and action verbs):
  "optimize PostgreSQL query EXPLAIN slow"
  "Dockerfile multi-stage build security"
  "NIS2 Article-21 compliance gap assessment"
  "Redis caching session TTL rate limiting"
  "cookie consent banner GDPR ePrivacy"
  "dark mode Tailwind color palette design system"
  "transcribe YouTube audio whisper"

BAD queries (too vague — no technology, no domain terms):
  "fix the bug"
  "review this code"
  "make it faster"
  "new project"
""",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("query", help="Task description with domain keywords")
    parser.add_argument("--top", "-n", type=int, default=MAX_RESULTS,
                        help=f"Max results (default: {MAX_RESULTS})")
    parser.add_argument("--json", "-j", action="store_true",
                        help="Output as JSON")
    args = parser.parse_args()

    query = args.query.strip()
    if not query:
        print("Error: empty query", file=sys.stderr)
        sys.exit(1)

    # Discover
    search_dirs = collect_search_dirs()
    skillcat_files = discover_skillcats(search_dirs)

    if not skillcat_files:
        print("WARNING: no .skillcat files found in any search directory", file=sys.stderr)
        sys.exit(0)

    # Parse all rows
    all_rows = []
    for path in skillcat_files:
        all_rows.extend(parse_skillcat(path))

    if not all_rows:
        print("WARNING: no skill entries found", file=sys.stderr)
        sys.exit(0)

    # Deduplicate by name (keep first seen — cache version wins over dev)
    seen_names = set()
    unique_rows = []
    for row in all_rows:
        if row["name"] not in seen_names:
            seen_names.add(row["name"])
            unique_rows.append(row)
    all_rows = unique_rows

    # Build BM25 index
    documents = [build_document(row) for row in all_rows]
    bm25 = BM25()
    bm25.fit(documents)
    scored = bm25.score(query)

    # Build results with descriptions
    results = []
    for idx, score in scored[:args.top]:
        row = all_rows[idx]
        skill_md = derive_skill_md_path(row["skillcat_path"])
        desc = read_skill_description(skill_md)
        results.append({
            "name": row["name"],
            "score": score,
            "plugin": row["plugin"],
            "description": desc,
            "domains": row["domains"],
            "frameworks": row["frameworks"],
            "tools": row["tools"],
            "skill_md": skill_md,
        })

    # Output
    if args.json:
        print(format_json(results, query, len(all_rows)))
    else:
        print(format_ascii(results, query, len(all_rows)))


if __name__ == "__main__":
    main()

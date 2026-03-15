#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
skill-search.py — BM25 skill search for unmassk-crew

Usage: python3 skill-search.py "<task description>"

Scans .skillcat files from:
  - ~/.claude/plugins/cache/   (marketplace plugins)
  - ~/.claude/skills/          (user skills)
  - <git-root>/.claude/skills/ (project skills)

Each .skillcat is CSV with columns: name,plugin,triggers,domains,frameworks,tools
Returns top-5 results with BM25 scores and SKILL.md paths.
"""

import csv
import re
import sys
import os
from pathlib import Path
from math import log
from collections import defaultdict


# ============ CONFIGURATION ============

MAX_RESULTS = 5
LOW_SCORE_THRESHOLD = 1.5

SEARCH_DIRS = [
    Path.home() / ".claude" / "plugins" / "cache",
    Path.home() / ".claude" / "skills",
]

# Optional extra dirs for testing/CI — colon-separated paths in env var
_extra_env = os.environ.get("SKILL_SEARCH_EXTRA_DIRS", "")
if _extra_env:
    SEARCH_DIRS += [Path(p) for p in _extra_env.split(":") if p]

SEARCH_COLS = ["name", "triggers", "domains", "frameworks", "tools"]


# ============ BM25 IMPLEMENTATION ============
# Copied from unmassk-design/skills/unmassk-design/scripts/core.py (lines 89-148)

class BM25:
    """BM25 ranking algorithm for text search"""

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
        """Lowercase, split, remove punctuation, filter short words"""
        text = re.sub(r'[^\w\s]', ' ', str(text).lower())
        return [w for w in text.split() if len(w) > 2]

    def fit(self, documents):
        """Build BM25 index from documents"""
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
        """Score all documents against query"""
        query_tokens = self.tokenize(query)
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


# ============ GIT ROOT DETECTION ============

def find_git_root():
    """Walk up from cwd to find .git directory."""
    current = Path(os.getcwd()).resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".git").exists():
            return parent
    return None


# ============ SKILLCAT DISCOVERY ============

def collect_search_dirs():
    """Return list of directories to scan for .skillcat files."""
    dirs = list(SEARCH_DIRS)
    git_root = find_git_root()
    if git_root:
        dirs.append(git_root / ".claude" / "skills")
    return dirs


def discover_skillcats(search_dirs):
    """
    Recursively scan search_dirs for *.skillcat files.
    Skips symlinks. Returns list of absolute Path objects.
    """
    found = []
    for base in search_dirs:
        if not base.exists() or not base.is_dir():
            continue
        for path in base.rglob("*.skillcat"):
            if path.is_symlink():
                continue
            found.append(path.resolve())
    return found


# ============ SKILLCAT PARSING ============

def parse_skillcat(path):
    """
    Parse a .skillcat CSV file.
    Returns list of dicts with keys: name, plugin, triggers, domains, frameworks, tools, skillcat_path.
    Skips rows missing the 'name' column.
    """
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
    except Exception:
        pass
    return rows


def build_document(row):
    """Concatenate search columns into a single BM25 document string."""
    parts = [row.get(col, "") for col in SEARCH_COLS]
    return " ".join(parts)


def derive_skill_md_path(skillcat_path, skill_name):
    """
    SKILL.md lives in the same directory as the .skillcat file.
    """
    return skillcat_path.parent / "SKILL.md"


# ============ MAIN ============

def main():
    if len(sys.argv) < 2:
        print("Usage: skill-search.py \"<task description>\"", file=sys.stderr)
        sys.exit(1)

    query = sys.argv[1].strip()
    if not query:
        print("Error: empty query", file=sys.stderr)
        sys.exit(1)

    # Discover
    search_dirs = collect_search_dirs()
    skillcat_files = discover_skillcats(search_dirs)

    if not skillcat_files:
        print("WARNING: no .skillcat files found in any search directory")
        sys.exit(0)

    # Parse all rows
    all_rows = []
    for path in skillcat_files:
        all_rows.extend(parse_skillcat(path))

    if not all_rows:
        print("WARNING: no skill entries found in discovered .skillcat files")
        sys.exit(0)

    # Build BM25 index
    documents = [build_document(row) for row in all_rows]
    bm25 = BM25()
    bm25.fit(documents)

    # Score
    scored = bm25.score(query)

    # Top N
    top = scored[:MAX_RESULTS]

    if not top:
        print("WARNING: no results")
        sys.exit(0)

    # Threshold warning
    best_score = top[0][1]
    if best_score < LOW_SCORE_THRESHOLD:
        print(f"WARNING: low confidence (best score {best_score:.1f} < {LOW_SCORE_THRESHOLD})")

    # Output
    for rank, (idx, score) in enumerate(top, start=1):
        row = all_rows[idx]
        skill_md = derive_skill_md_path(row["skillcat_path"], row["name"])
        print(f"#{rank} {row['name']} ({score:.1f}) -> {skill_md}")


if __name__ == "__main__":
    main()

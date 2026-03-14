#!/usr/bin/env python3
"""
search-evals.py — Quick search across marketing evals.

Usage:
  python3 search-evals.py --reference copy.md          # All evals for copy.md
  python3 search-evals.py --skill copywriting           # All evals from original copywriting skill
  python3 search-evals.py --keyword "pricing"           # Search prompts + assertions for keyword
  python3 search-evals.py --id 3 --skill copywriting    # Specific eval by id within a skill
  python3 search-evals.py --list                        # Summary: references + eval counts
  python3 search-evals.py --random                      # Random eval (useful for spot-testing)
"""

import argparse
import json
import os
import random
import sys

EVALS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evals.json")


def load_evals():
    with open(EVALS_PATH) as f:
        return json.load(f)


def cmd_list(data):
    print(f"Plugin: {data['plugin']} v{data['version']}")
    print(f"Total evals: {data['total_evals']}\n")
    print(f"{'Reference':<25} {'Original Skill':<30} {'Evals':>5}")
    print("-" * 65)
    for source in data["sources"]:
        print(f"{source['reference']:<25} {source['original_skill']:<30} {len(source['evals']):>5}")


def cmd_reference(data, ref):
    results = []
    for source in data["sources"]:
        if source["reference"] == ref:
            for ev in source["evals"]:
                ev["_skill"] = source["original_skill"]
                results.append(ev)
    print(json.dumps(results, indent=2))
    print(f"\n# {len(results)} evals for {ref}", file=sys.stderr)


def cmd_skill(data, skill):
    for source in data["sources"]:
        if source["original_skill"] == skill:
            print(json.dumps(source["evals"], indent=2))
            print(f"\n# {len(source['evals'])} evals for {skill}", file=sys.stderr)
            return
    print(f"Skill '{skill}' not found.", file=sys.stderr)
    sys.exit(1)


def cmd_keyword(data, keyword):
    kw = keyword.lower()
    results = []
    for source in data["sources"]:
        for ev in source["evals"]:
            text = (ev.get("prompt", "") + " " + " ".join(ev.get("assertions", []))).lower()
            if kw in text:
                ev["_skill"] = source["original_skill"]
                ev["_reference"] = source["reference"]
                results.append(ev)
    print(json.dumps(results, indent=2))
    print(f"\n# {len(results)} evals matching '{keyword}'", file=sys.stderr)


def cmd_id(data, eval_id, skill):
    for source in data["sources"]:
        if source["original_skill"] == skill:
            for ev in source["evals"]:
                if ev.get("id") == eval_id:
                    print(json.dumps(ev, indent=2))
                    return
    print(f"Eval id {eval_id} not found in skill '{skill}'.", file=sys.stderr)
    sys.exit(1)


def cmd_random(data):
    all_evals = []
    for source in data["sources"]:
        for ev in source["evals"]:
            ev["_skill"] = source["original_skill"]
            ev["_reference"] = source["reference"]
            all_evals.append(ev)
    pick = random.choice(all_evals)
    print(json.dumps(pick, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Search marketing evals")
    parser.add_argument("--reference", help="Filter by reference file (e.g. copy.md)")
    parser.add_argument("--skill", help="Filter by original skill name")
    parser.add_argument("--keyword", help="Search prompts and assertions")
    parser.add_argument("--id", type=int, help="Specific eval ID (requires --skill)")
    parser.add_argument("--list", action="store_true", help="Summary of references and counts")
    parser.add_argument("--random", action="store_true", help="Random eval for spot-testing")
    args = parser.parse_args()

    data = load_evals()

    if args.list:
        cmd_list(data)
    elif args.reference:
        cmd_reference(data, args.reference)
    elif args.id is not None and args.skill:
        cmd_id(data, args.id, args.skill)
    elif args.skill:
        cmd_skill(data, args.skill)
    elif args.keyword:
        cmd_keyword(data, args.keyword)
    elif args.random:
        cmd_random(data)
    else:
        parser.print_help()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

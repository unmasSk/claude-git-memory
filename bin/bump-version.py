#!/usr/bin/env python3
"""
bump-version.py — Bump plugin versions in the toolkit marketplace.

Interactive version bumper for Claude. Updates both the plugin's own
plugin.json and the marketplace.json entry in one shot.

Usage:
  python3 bin/bump-version.py <plugin-name> <new-version>
  python3 bin/bump-version.py --list                        # Show all plugins and versions
  python3 bin/bump-version.py --all <new-version>           # Bump ALL plugins to same version

Examples:
  python3 bin/bump-version.py unmassk-gitmemory 3.8.0
  python3 bin/bump-version.py unmassk-crew 1.1.0
  python3 bin/bump-version.py --list
"""

import argparse
import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKETPLACE_JSON = os.path.join(REPO_ROOT, ".claude-plugin", "marketplace.json")

SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$")
PLUGIN_NAME_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
MAX_INPUT_LEN = 128


def validate_version(version):
    if len(version) > MAX_INPUT_LEN:
        print(f"  ERROR: Version too long ({len(version)} chars, max {MAX_INPUT_LEN})")
        return False
    if not SEMVER_RE.match(version):
        print(f"  ERROR: Invalid semver format: {version!r}. Expected: MAJOR.MINOR.PATCH")
        return False
    return True


def validate_plugin_name(name):
    if len(name) > MAX_INPUT_LEN:
        print(f"  ERROR: Plugin name too long ({len(name)} chars, max {MAX_INPUT_LEN})")
        return False
    if not PLUGIN_NAME_RE.match(name):
        print(f"  ERROR: Invalid plugin name: {name!r}. Must be lowercase alphanumeric with hyphens.")
        return False
    return True


def safe_plugin_path(plugin_name):
    """Resolve plugin.json path and verify it stays within REPO_ROOT."""
    candidate = os.path.realpath(
        os.path.join(REPO_ROOT, plugin_name, ".claude-plugin", "plugin.json")
    )
    repo_real = os.path.realpath(REPO_ROOT)
    if not candidate.startswith(repo_real + os.sep):
        print(f"  ERROR: Path traversal detected for {plugin_name!r}. Rejected.")
        return None
    return candidate


def load_marketplace():
    try:
        with open(MARKETPLACE_JSON) as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: Marketplace file not found: {MARKETPLACE_JSON}")
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print(f"ERROR: Malformed JSON in {MARKETPLACE_JSON}: {exc}")
        sys.exit(1)

    if "plugins" not in data or not isinstance(data["plugins"], list):
        print(f"ERROR: marketplace.json missing 'plugins' array")
        sys.exit(1)

    return data


def save_marketplace(data):
    with open(MARKETPLACE_JSON, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def load_plugin_json(plugin_name):
    path = safe_plugin_path(plugin_name)
    if not path:
        return None, None
    if not os.path.exists(path):
        return None, path
    try:
        with open(path) as f:
            return json.load(f), path
    except (json.JSONDecodeError, OSError):
        return None, path


def save_plugin_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def list_plugins():
    marketplace = load_marketplace()
    print(f"{'Plugin':<25} {'Marketplace':<15} {'plugin.json':<15} {'Match'}")
    print("-" * 70)
    for entry in marketplace["plugins"]:
        name = entry["name"]
        mp_version = entry["version"]
        pj_data, pj_path = load_plugin_json(name)
        if pj_data:
            pj_version = pj_data.get("version", "???")
            match = "OK" if mp_version == pj_version else "MISMATCH"
        else:
            pj_version = "(missing)"
            match = "NO FILE"
        print(f"{name:<25} {mp_version:<15} {pj_version:<15} {match}")


def bump_plugin(plugin_name, new_version, marketplace_data):
    # Update marketplace entry
    found = False
    old_mp_version = None
    for entry in marketplace_data["plugins"]:
        if entry["name"] == plugin_name:
            old_mp_version = entry["version"]
            entry["version"] = new_version
            found = True
            break

    if not found:
        print(f"  ERROR: {plugin_name} not found in marketplace.json")
        return False

    # Update plugin.json
    pj_data, pj_path = load_plugin_json(plugin_name)
    old_pj_version = None
    if pj_data and pj_path:
        old_pj_version = pj_data.get("version", "???")
        pj_data["version"] = new_version
        save_plugin_json(pj_path, pj_data)
        print(f"  {plugin_name}:")
        print(f"    marketplace.json: {old_mp_version} -> {new_version}")
        print(f"    plugin.json:      {old_pj_version} -> {new_version}")
    else:
        print(f"  {plugin_name}:")
        print(f"    marketplace.json: {old_mp_version} -> {new_version}")
        print(f"    plugin.json:      (not found or unsafe path, skipped)")

    return True


def main():
    parser = argparse.ArgumentParser(description="Bump plugin versions in the toolkit")
    parser.add_argument("plugin", nargs="?", help="Plugin name (e.g. unmassk-gitmemory)")
    parser.add_argument("version", nargs="?", help="New version (e.g. 3.8.0)")
    parser.add_argument("--list", action="store_true", help="List all plugins and versions")
    parser.add_argument("--all", metavar="VERSION", help="Bump ALL plugins to this version")

    args = parser.parse_args()

    if args.list:
        list_plugins()
        return 0

    if args.all:
        if not validate_version(args.all):
            return 1
        marketplace = load_marketplace()
        print(f"Bumping ALL plugins to {args.all}:\n")
        all_ok = True
        for entry in marketplace["plugins"]:
            if not validate_plugin_name(entry["name"]):
                all_ok = False
                continue
            if not bump_plugin(entry["name"], args.all, marketplace):
                all_ok = False
        if all_ok:
            save_marketplace(marketplace)
            print(f"\nDone. {len(marketplace['plugins'])} plugins bumped.")
        else:
            print(f"\nERROR: Some plugins failed. marketplace.json NOT written.")
            return 1
        return 0

    if not args.plugin or not args.version:
        parser.print_help()
        return 1

    if not validate_plugin_name(args.plugin):
        return 1
    if not validate_version(args.version):
        return 1

    marketplace = load_marketplace()
    print(f"Bumping {args.plugin} to {args.version}:\n")
    success = bump_plugin(args.plugin, args.version, marketplace)
    if success:
        save_marketplace(marketplace)
        print("\nDone.")
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())

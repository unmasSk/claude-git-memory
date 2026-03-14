"""
Single source of truth for the plugin version.

Reads from .claude-plugin/plugin.json at the plugin root.
All scripts and hooks import VERSION from here instead of hardcoding it.

To bump the version, update ONLY:
  1. unmassk-gitmemory/.claude-plugin/plugin.json  (source of truth)
  2. .claude-plugin/marketplace.json  (distribution metadata)
Everything else reads from plugin.json automatically.
"""

import json
import os

# Assumes lib/ is exactly one level below the plugin root
_PLUGIN_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PLUGIN_JSON = os.path.join(_PLUGIN_ROOT, ".claude-plugin", "plugin.json")

try:
    with open(_PLUGIN_JSON) as _f:
        VERSION: str = json.load(_f)["version"]
except (FileNotFoundError, json.JSONDecodeError, KeyError) as exc:
    raise RuntimeError(
        f"Cannot read plugin version from {_PLUGIN_JSON}: {exc}"
    ) from exc

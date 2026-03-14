#!/usr/bin/env python3
"""
git-memory-bootstrap -- Conservative analyzer for first contact with a repo.

Analyzes structure, dependencies, tech stack, and recent commits.
Classifies findings by confidence level (fact/hypothesis).
Produces structured output for Claude to present to the user and confirm.

Does NOT create commits. Only analyzes and reports.
Claude uses the output to present findings, get confirmation,
and create the bootstrap commit with the appropriate trailers.

Usage:
  git memory bootstrap              # Human-readable report
  git memory bootstrap --json       # Machine-readable JSON
  git memory bootstrap --silent     # Exit code only (0=findings, 1=empty)

Exit codes:
  0: Findings produced
  1: Nothing to report (empty project or error)
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git
from version import VERSION


# ── Config ────────────────────────────────────────────────────────────────
SCAN_COMMITS = 20
MAX_TREE_DEPTH = 2

# Directories to skip during tree scan
SKIP_DIRS = {
    "node_modules", ".git", "vendor", "dist", "build", ".next", "__pycache__",
    ".venv", "venv", "env", ".env", ".tox", ".mypy_cache", ".pytest_cache",
    "coverage", ".coverage", ".nyc_output", "target", "out", ".turbo",
    ".cache", ".parcel-cache", "bower_components", ".gradle", ".idea",
    ".vscode", ".claude", "eggs", "*.egg-info",
}

# High-signal files and what they indicate
SIGNAL_FILES = {
    # JavaScript/TypeScript ecosystem
    "package.json":       ("npm/node project", "js"),
    "pnpm-lock.yaml":     ("pnpm package manager", "js"),
    "yarn.lock":          ("yarn package manager", "js"),
    "package-lock.json":  ("npm package manager", "js"),
    "bun.lockb":          ("bun runtime", "js"),
    "tsconfig.json":      ("TypeScript", "js"),
    "jsconfig.json":      ("JavaScript (with config)", "js"),
    "next.config.js":     ("Next.js", "js"),
    "next.config.mjs":    ("Next.js", "js"),
    "next.config.ts":     ("Next.js", "js"),
    "nuxt.config.ts":     ("Nuxt.js", "js"),
    "vite.config.ts":     ("Vite", "js"),
    "vite.config.js":     ("Vite", "js"),
    "svelte.config.js":   ("SvelteKit", "js"),
    "astro.config.mjs":   ("Astro", "js"),
    "remix.config.js":    ("Remix", "js"),
    "angular.json":       ("Angular", "js"),
    "vue.config.js":      ("Vue CLI", "js"),
    "webpack.config.js":  ("Webpack", "js"),
    "rollup.config.js":   ("Rollup", "js"),
    "esbuild.config.js":  ("esbuild", "js"),
    "tailwind.config.js": ("Tailwind CSS", "js"),
    "tailwind.config.ts": ("Tailwind CSS", "js"),
    "postcss.config.js":  ("PostCSS", "js"),
    ".eslintrc":          ("ESLint", "js"),
    ".eslintrc.js":       ("ESLint", "js"),
    ".eslintrc.json":     ("ESLint", "js"),
    "eslint.config.js":   ("ESLint (flat config)", "js"),
    ".prettierrc":        ("Prettier", "js"),
    "prettier.config.js": ("Prettier", "js"),
    "biome.json":         ("Biome", "js"),
    "jest.config.js":     ("Jest", "js"),
    "jest.config.ts":     ("Jest", "js"),
    "vitest.config.ts":   ("Vitest", "js"),
    "playwright.config.ts": ("Playwright", "js"),
    "cypress.config.ts":  ("Cypress", "js"),
    ".storybook":         ("Storybook", "js"),
    "turbo.json":         ("Turborepo", "js"),
    "lerna.json":         ("Lerna (monorepo)", "js"),
    "nx.json":            ("Nx (monorepo)", "js"),

    # Python ecosystem
    "requirements.txt":   ("Python (pip)", "py"),
    "pyproject.toml":     ("Python (modern)", "py"),
    "setup.py":           ("Python (setuptools)", "py"),
    "setup.cfg":          ("Python (setuptools)", "py"),
    "Pipfile":            ("Python (pipenv)", "py"),
    "poetry.lock":        ("Python (poetry)", "py"),
    "uv.lock":            ("Python (uv)", "py"),
    "tox.ini":            ("Python (tox)", "py"),
    "pytest.ini":         ("Python (pytest)", "py"),
    ".flake8":            ("Python (flake8)", "py"),
    "ruff.toml":          ("Python (ruff)", "py"),
    "mypy.ini":           ("Python (mypy)", "py"),
    "manage.py":          ("Django", "py"),
    "app.py":             ("Flask/FastAPI candidate", "py"),

    # Rust
    "Cargo.toml":         ("Rust", "rust"),
    "Cargo.lock":         ("Rust (locked deps)", "rust"),

    # Go
    "go.mod":             ("Go", "go"),
    "go.sum":             ("Go (locked deps)", "go"),

    # Java/JVM
    "pom.xml":            ("Java (Maven)", "jvm"),
    "build.gradle":       ("Java/Kotlin (Gradle)", "jvm"),
    "build.gradle.kts":   ("Kotlin (Gradle KTS)", "jvm"),

    # Ruby
    "Gemfile":            ("Ruby", "ruby"),
    "Gemfile.lock":       ("Ruby (locked deps)", "ruby"),
    "Rakefile":           ("Ruby (Rake)", "ruby"),
    "config.ru":          ("Ruby (Rack app)", "ruby"),

    # PHP
    "composer.json":      ("PHP (Composer)", "php"),
    "artisan":            ("Laravel", "php"),

    # Elixir
    "mix.exs":            ("Elixir", "elixir"),

    # .NET
    "*.csproj":           (".NET (C#)", "dotnet"),
    "*.fsproj":           (".NET (F#)", "dotnet"),

    # Infrastructure / DevOps
    "Dockerfile":         ("Docker", "infra"),
    "docker-compose.yml": ("Docker Compose", "infra"),
    "docker-compose.yaml": ("Docker Compose", "infra"),
    "Makefile":           ("Make", "infra"),
    "Justfile":           ("Just", "infra"),
    "Taskfile.yml":       ("Task", "infra"),
    "Procfile":           ("Heroku/Procfile", "infra"),
    "fly.toml":           ("Fly.io", "infra"),
    "vercel.json":        ("Vercel", "infra"),
    "netlify.toml":       ("Netlify", "infra"),
    "railway.json":       ("Railway", "infra"),
    "terraform":          ("Terraform", "infra"),
    "pulumi":             ("Pulumi", "infra"),
    "serverless.yml":     ("Serverless Framework", "infra"),

    # CI/CD
    ".github/workflows":  ("GitHub Actions", "ci"),
    ".gitlab-ci.yml":     ("GitLab CI", "ci"),
    ".circleci":          ("CircleCI", "ci"),
    "Jenkinsfile":        ("Jenkins", "ci"),
    ".travis.yml":        ("Travis CI", "ci"),

    # Config / Quality
    ".editorconfig":      ("EditorConfig", "config"),
    ".gitignore":         ("Git ignore rules", "config"),
    "CLAUDE.md":          ("Claude Code config", "config"),
    ".cursorrules":       ("Cursor AI config", "config"),
    "README.md":          ("Documentation", "config"),
    "CHANGELOG.md":       ("Changelog", "config"),
    "LICENSE":            ("License file", "config"),
    # Monorepo tools
    "rush.json":          ("Rush (monorepo)", "js"),
    ".moon/workspace.yml": ("Moon (monorepo)", "js"),

    "commitlint.config.js": ("commitlint", "ci"),
    ".commitlintrc":      ("commitlint", "ci"),
    ".husky":             ("Husky (git hooks)", "ci"),
    "lint-staged.config.js": ("lint-staged", "ci"),
    ".pre-commit-config.yaml": ("pre-commit", "ci"),
}


# ── Helpers ───────────────────────────────────────────────────────────────

def find_project_root() -> str:
    """Find the project root using git rev-parse, falling back to cwd."""
    code, root = run_git(["rev-parse", "--show-toplevel"])
    if code == 0 and root:
        return root
    return os.getcwd()


# ── Scanners ──────────────────────────────────────────────────────────────

def scan_tree(root: str, max_depth: int = MAX_TREE_DEPTH) -> dict[str, list[str]]:
    """Walk the directory tree up to max_depth, skipping noisy directories.

    Returns:
        Dict with "dirs" and "files" keys, each a list of relative paths.
    """
    tree: dict[str, list[str]] = {"dirs": [], "files": []}

    for dirpath, dirnames, filenames in os.walk(root):
        # Calculate depth relative to root
        rel = os.path.relpath(dirpath, root)
        depth = 0 if rel == "." else rel.count(os.sep) + 1

        if depth > max_depth:
            dirnames.clear()
            continue

        # Filter out skip dirs
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]

        for d in dirnames:
            tree["dirs"].append(os.path.relpath(os.path.join(dirpath, d), root))

        for f in filenames:
            tree["files"].append(os.path.relpath(os.path.join(dirpath, f), root))

    return tree


def scan_signal_files(root: str, tree_files: list[str]) -> list[dict[str, str]]:
    """Match tree files against SIGNAL_FILES to detect ecosystem indicators.

    Returns:
        List of dicts with "file", "signal", and "ecosystem" keys.
    """
    found = []

    for filepath in tree_files:
        basename = os.path.basename(filepath)
        dirname = os.path.dirname(filepath)

        # Check basename against signal files
        if basename in SIGNAL_FILES:
            label, ecosystem = SIGNAL_FILES[basename]
            found.append({
                "file": filepath,
                "signal": label,
                "ecosystem": ecosystem,
            })

        # Check for directory-based signals
        if filepath in SIGNAL_FILES:
            label, ecosystem = SIGNAL_FILES[filepath]
            found.append({
                "file": filepath,
                "signal": label,
                "ecosystem": ecosystem,
            })

    # Also check directories (some signals are dirs like .github/workflows)
    for dirpath in (tree_files):
        pass  # Already handled above

    # Check directory-based signals separately
    for signal_path, (label, ecosystem) in SIGNAL_FILES.items():
        full = os.path.join(root, signal_path)
        if os.path.isdir(full) and signal_path not in [f["file"] for f in found]:
            found.append({
                "file": signal_path,
                "signal": label,
                "ecosystem": ecosystem,
            })

    return found


def scan_package_json(root: str) -> dict[str, Any] | None:
    """Extract stack info from package.json (frameworks, deps, monorepo signals).

    Returns:
        Dict with detected info, or None if package.json is missing or invalid.
    """
    pkg_path = os.path.join(root, "package.json")
    if not os.path.isfile(pkg_path):
        return None

    try:
        with open(pkg_path) as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return None

    info = {}

    # Name and version
    if "name" in data:
        info["name"] = data["name"]
    if "version" in data:
        info["version"] = data["version"]

    # Scripts (signals about tooling)
    if "scripts" in data:
        info["scripts"] = list(data["scripts"].keys())

    # Dependencies (major ones only)
    all_deps = {}
    for key in ("dependencies", "devDependencies", "peerDependencies"):
        if key in data:
            all_deps.update(data[key])
    info["dependency_count"] = len(all_deps)

    # Detect frameworks from deps
    frameworks = []
    framework_signals = {
        "next": "Next.js", "react": "React", "vue": "Vue",
        "svelte": "Svelte", "@angular/core": "Angular",
        "express": "Express", "fastify": "Fastify", "hono": "Hono",
        "remix": "Remix", "astro": "Astro", "nuxt": "Nuxt",
        "electron": "Electron", "react-native": "React Native",
        "expo": "Expo", "@nestjs/core": "NestJS",
        "prisma": "Prisma", "drizzle-orm": "Drizzle",
        "mongoose": "Mongoose", "typeorm": "TypeORM",
        "tailwindcss": "Tailwind CSS",
        "three": "Three.js", "d3": "D3.js",
    }
    for dep, label in framework_signals.items():
        if dep in all_deps:
            version = all_deps[dep].lstrip("^~>=<")
            frameworks.append(f"{label} {version}")
    info["frameworks"] = frameworks

    # Detect TypeScript version
    if "typescript" in all_deps:
        info["typescript"] = all_deps["typescript"].lstrip("^~>=<")

    # Detect monorepo signals
    if "workspaces" in data:
        info["monorepo_signal"] = "npm/yarn workspaces"
        workspaces = data["workspaces"]
        if isinstance(workspaces, list):
            info["workspace_patterns"] = workspaces
        elif isinstance(workspaces, dict) and "packages" in workspaces:
            info["workspace_patterns"] = workspaces["packages"]

    # Detect package manager
    if "packageManager" in data:
        info["package_manager"] = data["packageManager"]

    return info


def scan_pyproject(root: str) -> dict[str, Any] | None:
    """Extract stack info from pyproject.toml (build backend, frameworks, Python version).

    Returns:
        Dict with detected info, or None if pyproject.toml is missing or unreadable.
    """
    pyproject = os.path.join(root, "pyproject.toml")
    if not os.path.isfile(pyproject):
        return None

    try:
        with open(pyproject) as f:
            content = f.read()
    except OSError:
        return None

    info = {}

    # Project name
    m = re.search(r'^\s*name\s*=\s*"([^"]+)"', content, re.MULTILINE)
    if m:
        info["name"] = m.group(1)

    # Python version requirement
    m = re.search(r'^\s*requires-python\s*=\s*"([^"]+)"', content, re.MULTILINE)
    if m:
        info["python_requires"] = m.group(1)

    # Build system
    m = re.search(r'^\s*build-backend\s*=\s*"([^"]+)"', content, re.MULTILINE)
    if m:
        info["build_backend"] = m.group(1)

    # Detect frameworks from dependencies
    frameworks = []
    framework_signals = {
        "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
        "starlette": "Starlette", "celery": "Celery",
        "sqlalchemy": "SQLAlchemy", "alembic": "Alembic",
        "pydantic": "Pydantic", "pytest": "pytest",
        "torch": "PyTorch", "tensorflow": "TensorFlow",
        "transformers": "Hugging Face Transformers",
        "pandas": "Pandas", "numpy": "NumPy",
        "scikit-learn": "scikit-learn", "scipy": "SciPy",
        "matplotlib": "Matplotlib", "plotly": "Plotly",
        "streamlit": "Streamlit", "gradio": "Gradio",
        "langchain": "LangChain", "anthropic": "Anthropic SDK",
        "openai": "OpenAI SDK",
    }
    for dep, label in framework_signals.items():
        if dep in content.lower():
            frameworks.append(label)
    info["frameworks"] = frameworks

    return info


def scan_recent_commits(depth: int = SCAN_COMMITS) -> dict[str, Any] | None:
    """Analyze recent commits for contributor count, trailer usage, and scopes.

    Returns:
        Dict with commit stats, or None if git log fails or is empty.
    """
    code, output = run_git([
        "log", "-n", str(depth),
        "--pretty=format:%h%x1f%s%x1f%b%x1f%aI%x1f%an%x1e",
    ])
    if code != 0 or not output:
        return None

    commits: list[dict[str, Any]] = []
    authors: defaultdict[str, int] = defaultdict(int)
    has_trailers = 0
    trailer_re = re.compile(r"^[A-Z][a-z]+(?:-[A-Z][a-z]+)*:\s*.+$", re.MULTILINE)
    scope_re = re.compile(r"^\w+\(([^)]+)\)")

    for raw in output.split("\x1e"):
        raw = raw.strip()
        if not raw:
            continue
        parts = raw.split("\x1f", 4)
        if len(parts) < 5:
            continue

        sha, subject, body, date, author = parts
        authors[author.strip()] += 1

        if trailer_re.search(body):
            has_trailers += 1

        # Extract scope
        scope = None
        m = scope_re.match(subject.strip())
        if m:
            scope = m.group(1)

        commits.append({
            "sha": sha.strip(),
            "subject": subject.strip(),
            "scope": scope,
            "date": date.strip(),
            "author": author.strip(),
        })

    return {
        "count": len(commits),
        "authors": dict(authors),
        "has_trailers": has_trailers,
        "recent": commits[:5],
    }


def detect_monorepo(root: str, tree: dict[str, list[str]]) -> dict[str, Any]:
    """Detect monorepo patterns and build scope map.

    Returns:
        {"signals": [...], "scope_map": {"apps/web": "web", ...}}
    """
    signals: list[str] = []
    scope_map: dict[str, str] = {}

    # Check for workspace config files
    workspace_files = [
        "pnpm-workspace.yaml", "turbo.json", "lerna.json",
        "nx.json", "rush.json", ".moon/workspace.yml",
    ]
    for wf in workspace_files:
        if os.path.isfile(os.path.join(root, wf)):
            signals.append(f"Found {wf}")

    # Check for packages/ or apps/ directories
    mono_dirs = ["packages", "apps", "libs", "modules", "services"]
    project_markers = ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle"]
    for d in mono_dirs:
        full = os.path.join(root, d)
        if os.path.isdir(full):
            subs: list[str] = []
            try:
                entries = os.listdir(full)
            except OSError:
                continue
            for sub in entries:
                sub_path = os.path.join(full, sub)
                if os.path.isdir(sub_path):
                    for marker in project_markers:
                        if os.path.isfile(os.path.join(sub_path, marker)):
                            subs.append(sub)
                            scope_map[f"{d}/{sub}"] = sub
                            break
            if subs:
                signals.append(f"{d}/ has {len(subs)} sub-projects: {', '.join(subs[:5])}")

    # npm/yarn workspaces from package.json (already parsed by scan_package_json,
    # but we check here too for scope_map completeness)
    pkg_json = os.path.join(root, "package.json")
    if os.path.isfile(pkg_json) and not scope_map:
        try:
            with open(pkg_json) as f:
                data = json.load(f)
            workspaces = data.get("workspaces", [])
            if isinstance(workspaces, dict):
                workspaces = workspaces.get("packages", [])
            if isinstance(workspaces, list):
                for pattern in workspaces:
                    # Resolve simple glob patterns like "packages/*"
                    base = pattern.rstrip("/*")
                    base_path = os.path.join(root, base)
                    if os.path.isdir(base_path):
                        for sub in os.listdir(base_path):
                            if os.path.isdir(os.path.join(base_path, sub)):
                                scope_map.setdefault(f"{base}/{sub}", sub)
        except (json.JSONDecodeError, OSError):
            pass

    return {"signals": signals, "scope_map": scope_map}


def detect_ci_commitlint(root: str) -> list[str]:
    """Detect commitlint, husky, or pre-commit hooks that might reject trailers.

    Returns:
        List of human-readable signal descriptions.
    """
    signals = []

    # commitlint
    commitlint_files = [
        "commitlint.config.js", "commitlint.config.ts",
        ".commitlintrc", ".commitlintrc.js", ".commitlintrc.json",
    ]
    for f in commitlint_files:
        if os.path.isfile(os.path.join(root, f)):
            signals.append(f"commitlint config: {f}")

    # Husky
    husky_dir = os.path.join(root, ".husky")
    if os.path.isdir(husky_dir):
        signals.append("Husky git hooks detected")
        # Check if commit-msg hook exists
        commit_msg = os.path.join(husky_dir, "commit-msg")
        if os.path.isfile(commit_msg):
            try:
                with open(commit_msg) as fh:
                    content = fh.read()
                if "commitlint" in content:
                    signals.append("Husky commit-msg runs commitlint")
            except OSError:
                pass

    # pre-commit
    if os.path.isfile(os.path.join(root, ".pre-commit-config.yaml")):
        signals.append("pre-commit hooks detected")

    return signals


def check_existing_memory(root: str) -> dict[str, Any]:
    """Check if git-memory is already installed by looking for CLAUDE.md block and manifest."""
    signals: dict[str, Any] = {}

    # Check CLAUDE.md for managed block
    claude_md = os.path.join(root, "CLAUDE.md")
    if os.path.isfile(claude_md):
        try:
            with open(claude_md) as f:
                content = f.read()
            signals["claude_md_exists"] = True
            signals["has_memory_block"] = "BEGIN unmassk-gitmemory" in content
        except OSError:
            signals["claude_md_exists"] = False
    else:
        signals["claude_md_exists"] = False

    # Check manifest
    manifest = os.path.join(root, ".claude", "git-memory-manifest.json")
    if os.path.isfile(manifest):
        signals["already_installed"] = True
        try:
            with open(manifest) as f:
                data = json.load(f)
            signals["installed_version"] = data.get("version", "unknown")
        except (json.JSONDecodeError, OSError):
            signals["installed_version"] = "corrupt"
    else:
        signals["already_installed"] = False

    return signals


# ── Classification ────────────────────────────────────────────────────────

def classify_findings(signals: list[dict[str, str]], pkg_info: dict[str, Any] | None, py_info: dict[str, Any] | None, commits: dict[str, Any] | None, monorepo: dict[str, Any], ci_signals: list[str], existing: dict[str, Any]) -> list[dict[str, Any]]:
    """Classify all scanner results into facts (directly detected) and hypotheses (inferred).

    Returns:
        List of finding dicts, each with "level", "category", "text", and "source".
    """
    findings: list[dict[str, Any]] = []

    # Facts: directly detected from files
    seen_signals = set()
    for sig in signals:
        label = sig["signal"]
        if label not in seen_signals:
            seen_signals.add(label)
            findings.append({
                "level": "fact",
                "category": "stack",
                "text": label,
                "source": sig["file"],
            })

    # Package.json details
    if pkg_info:
        for fw in pkg_info.get("frameworks", []):
            if fw not in seen_signals:
                findings.append({
                    "level": "fact",
                    "category": "stack",
                    "text": fw,
                    "source": "package.json",
                })
        if "typescript" in pkg_info:
            findings.append({
                "level": "fact",
                "category": "stack",
                "text": f"TypeScript {pkg_info['typescript']}",
                "source": "package.json",
            })
        if "package_manager" in pkg_info:
            findings.append({
                "level": "fact",
                "category": "stack",
                "text": f"Package manager: {pkg_info['package_manager']}",
                "source": "package.json",
            })
        if pkg_info.get("dependency_count", 0) > 0:
            findings.append({
                "level": "fact",
                "category": "size",
                "text": f"{pkg_info['dependency_count']} dependencies",
                "source": "package.json",
            })

    # Python details
    if py_info:
        for fw in py_info.get("frameworks", []):
            findings.append({
                "level": "fact",
                "category": "stack",
                "text": fw,
                "source": "pyproject.toml",
            })
        if "python_requires" in py_info:
            findings.append({
                "level": "fact",
                "category": "stack",
                "text": f"Python {py_info['python_requires']}",
                "source": "pyproject.toml",
            })
        if "build_backend" in py_info:
            findings.append({
                "level": "fact",
                "category": "stack",
                "text": f"Build: {py_info['build_backend']}",
                "source": "pyproject.toml",
            })

    # Hypotheses: inferred with medium signal
    mono_signals = monorepo.get("signals", [])
    mono_scope_map = monorepo.get("scope_map", {})
    if mono_signals:
        detail = list(mono_signals)
        if mono_scope_map:
            scopes = ", ".join(sorted(mono_scope_map.values())[:8])
            detail.append(f"Scopes: {scopes}")
        findings.append({
            "level": "hypothesis",
            "category": "structure",
            "text": "Monorepo detected",
            "detail": detail,
            "source": "directory structure",
        })

    if ci_signals:
        for ci_sig in ci_signals:
            if "commitlint" in ci_sig.lower():
                findings.append({
                    "level": "hypothesis",
                    "category": "compatibility",
                    "text": "commitlint may reject trailer-format commits",
                    "detail": [ci_sig],
                    "source": ci_sig.split(":")[0] if ":" in ci_sig else "ci config",
                })
                break
        else:
            # CI exists but no commitlint issue
            for ci_sig in ci_signals:
                findings.append({
                    "level": "fact",
                    "category": "ci",
                    "text": ci_sig,
                    "source": "project config",
                })

    # Commit history insights
    if commits:
        if commits["count"] > 0:
            findings.append({
                "level": "fact",
                "category": "history",
                "text": f"{commits['count']} recent commits analyzed",
                "source": "git log",
            })
            num_authors = len(commits["authors"])
            if num_authors > 1:
                authors_list = sorted(commits["authors"].items(), key=lambda x: -x[1])
                top = ", ".join(f"{a} ({n})" for a, n in authors_list[:3])
                findings.append({
                    "level": "fact",
                    "category": "team",
                    "text": f"{num_authors} contributors: {top}",
                    "source": "git log",
                })
            if commits["has_trailers"] > 0:
                findings.append({
                    "level": "fact",
                    "category": "memory",
                    "text": f"{commits['has_trailers']}/{commits['count']} commits already have trailers",
                    "source": "git log",
                })

    # Existing memory state
    if existing.get("already_installed"):
        findings.append({
            "level": "fact",
            "category": "memory",
            "text": f"git-memory already installed (v{existing.get('installed_version', '?')})",
            "source": "manifest",
        })

    return findings


# ── Suggested Actions ─────────────────────────────────────────────────────

def suggest_actions(findings: list[dict[str, Any]], existing: dict[str, Any], monorepo: dict[str, Any], ci_signals: list[str]) -> list[dict[str, Any]]:
    """Build a list of suggested next steps based on findings.

    Returns:
        List of action dicts with "action", "reason", and "detail" keys.
    """
    suggestions = []

    # Already installed?
    if existing.get("already_installed"):
        suggestions.append({
            "action": "skip_bootstrap",
            "reason": "git-memory already installed",
            "detail": "Run `git memory doctor` to check health instead",
        })
        return suggestions

    # Monorepo?
    mono_signals = monorepo.get("signals", [])
    mono_scope_map = monorepo.get("scope_map", {})
    if mono_signals:
        scope_detail = "Ask user: global memory or per-subproject?"
        if mono_scope_map:
            scopes = ", ".join(sorted(mono_scope_map.values())[:8])
            scope_detail += f" Available scopes: {scopes}"
        suggestions.append({
            "action": "ask_scope",
            "reason": "Monorepo detected",
            "detail": scope_detail,
        })

    # commitlint risk?
    has_commitlint = any("commitlint" in str(f.get("text", "")).lower() for f in findings)
    if has_commitlint:
        suggestions.append({
            "action": "consider_compatible_mode",
            "reason": "commitlint detected — trailers may be rejected",
            "detail": "Consider installing in compatible mode",
        })

    # Empty project?
    code_findings = [f for f in findings if f["category"] == "stack"]
    if not code_findings:
        suggestions.append({
            "action": "minimal_bootstrap",
            "reason": "No stack detected (empty or non-code project)",
            "detail": "Create memory as work progresses, no upfront bootstrap needed",
        })
    else:
        # Normal bootstrap: collect facts for memo commit
        facts = [f for f in findings if f["level"] == "fact" and f["category"] == "stack"]
        if facts:
            stack_text = ", ".join(f["text"] for f in facts[:8])
            suggestions.append({
                "action": "bootstrap_commit",
                "reason": f"Stack detected: {stack_text}",
                "detail": "Create bootstrap memo(stack) commit after user confirmation",
                "proposed_trailer": f"Memo: stack - {stack_text}",
            })

    return suggestions


# ── Output ────────────────────────────────────────────────────────────────

def format_human(findings: list[dict[str, Any]], suggestions: list[dict[str, Any]], repo_info: dict[str, str]) -> str:
    """Format findings and suggestions as a human-readable text report."""
    lines = []
    lines.append("=== git memory bootstrap — Project Scout ===")
    lines.append(f"Repo: {repo_info.get('name', '?')} ({repo_info.get('branch', '?')})")
    lines.append("")

    # Group by level
    facts = [f for f in findings if f["level"] == "fact"]
    hypotheses = [f for f in findings if f["level"] == "hypothesis"]

    if facts:
        lines.append("── Facts (detected directly) ──")
        for f in facts:
            lines.append(f"  ✅ [{f['category']}] {f['text']}")
        lines.append("")

    if hypotheses:
        lines.append("── Hypotheses (need confirmation) ──")
        for f in hypotheses:
            lines.append(f"  ❓ [{f['category']}] {f['text']}")
            if "detail" in f:
                if isinstance(f["detail"], list):
                    for d in f["detail"]:
                        lines.append(f"      → {d}")
                else:
                    lines.append(f"      → {f['detail']}")
        lines.append("")

    if suggestions:
        lines.append("── Suggested Actions ──")
        for s in suggestions:
            lines.append(f"  → {s['action']}: {s['reason']}")
            if "proposed_trailer" in s:
                lines.append(f"    Trailer: {s['proposed_trailer']}")
        lines.append("")

    if not findings:
        lines.append("No findings. Empty project or nothing to detect.")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────

def run_bootstrap(silent: bool = False, as_json: bool = False) -> int:
    """Run all scanners, classify findings, and produce the report.

    Returns:
        0 if meaningful findings were found, 1 otherwise.
    """
    root = find_project_root()

    # Repo info
    _, branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    _, remote = run_git(["remote", "get-url", "origin"])
    repo_name = os.path.basename(root)
    repo_info = {
        "name": repo_name,
        "branch": branch or "unknown",
        "remote": remote or "none",
        "root": root,
    }

    # Run all scans
    tree = scan_tree(root)
    signals = scan_signal_files(root, tree["files"])
    pkg_info = scan_package_json(root)
    py_info = scan_pyproject(root)
    commits = scan_recent_commits()
    monorepo = detect_monorepo(root, tree)
    ci_signals = detect_ci_commitlint(root)
    existing = check_existing_memory(root)

    # Classify
    findings = classify_findings(signals, pkg_info, py_info, commits, monorepo, ci_signals, existing)
    suggestions = suggest_actions(findings, existing, monorepo, ci_signals)

    # Output
    if as_json:
        output = {
            "version": VERSION,
            "repo": repo_info,
            "findings": findings,
            "suggestions": suggestions,
            "monorepo_signals": monorepo.get("signals", []),
            "monorepo_scope_map": monorepo.get("scope_map", {}),
            "ci_signals": ci_signals,
            "existing_memory": existing,
        }
        if pkg_info:
            output["package_json"] = pkg_info
        if py_info:
            output["pyproject"] = py_info
        if commits:
            output["commits"] = commits
        print(json.dumps(output, indent=2, default=str))
    elif not silent:
        print(format_human(findings, suggestions, repo_info))

    # Exit 0 if meaningful findings (stack/structure), 1 if empty/trivial
    meaningful = [f for f in findings if f["category"] in ("stack", "structure", "compatibility")]
    return 0 if meaningful else 1


def main() -> None:
    """CLI entry point. Parses args and runs the bootstrap analyzer."""
    parser = argparse.ArgumentParser(description="Analyze repo for first contact.")
    parser.add_argument("--silent", action="store_true", help="Exit code only")
    parser.add_argument("--json", dest="json", action="store_true", help="Machine-readable JSON output")
    args = parser.parse_args()
    silent = args.silent
    as_json = args.json

    exit_code = run_bootstrap(silent=silent, as_json=as_json)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()

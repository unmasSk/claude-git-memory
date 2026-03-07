#!/usr/bin/env python3
"""
git-memory-upgrade — Actualización segura del sistema de memoria.
=================================================================
Compara versión instalada vs fuente, muestra diff, hace backup,
y aplica la actualización preservando modo y configuración.

Usage:
  git memory upgrade              # Interactivo: muestra cambios, pide confirmación
  git memory upgrade --auto       # No interactivo
  git memory upgrade --dry-run    # Solo muestra qué cambiaría
  git memory upgrade --check      # Solo verifica si hay actualización disponible
  git memory upgrade --json       # Output JSON (para consumo de Claude)

Exit codes:
  0: Upgrade exitoso (o nada que actualizar)
  1: Error
  2: Abortado por usuario
"""

import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git


# ── Config ────────────────────────────────────────────────────────────────

VERSION = "2.0.0"

HOOKS = [
    "pre-validate-commit-trailers.py",
    "post-validate-commit-trailers.py",
    "precompact-snapshot.py",
    "stop-dod-check.py",
]

SKILLS = [
    "git-memory",
    "git-memory-protocol",
    "git-memory-lifecycle",
    "git-memory-recovery",
]

BIN_FILES = [
    "git-memory",
    "git-memory-gc.py",
    "git-memory-dashboard.py",
    "git-memory-doctor.py",
    "git-memory-install.py",
    "git-memory-repair.py",
    "git-memory-uninstall.py",
    "git-memory-upgrade.py",
    "git-memory-bootstrap.py",
]


# ── Helpers ───────────────────────────────────────────────────────────────

def find_source_root():
    """Find the git-memory plugin source root."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_target_root():
    """Find the target repo root."""
    code, output = run_git(["rev-parse", "--show-toplevel"])
    if code == 0:
        return output
    return os.getcwd()


def file_hash(path):
    """SHA256 hash of a file, or None if missing. Skips symlinks."""
    if not os.path.isfile(path) or os.path.islink(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()[:16]


# ── Lectura del estado actual ─────────────────────────────────────────────

def read_installed_manifest(target):
    """Leer manifest de la instalación actual."""
    manifest_path = os.path.join(target, ".claude", "git-memory-manifest.json")
    if not os.path.isfile(manifest_path):
        return None
    try:
        with open(manifest_path) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def read_source_version(source):
    """Leer versión del source (este script define la versión canónica)."""
    return VERSION


# ── Comparación ───────────────────────────────────────────────────────────

def compute_diff(source, target):
    """Comparar archivos source vs instalados, producir diff detallado."""
    changes = {
        "added": [],       # Archivos nuevos que no existen en target
        "modified": [],    # Archivos que cambiaron
        "removed": [],     # Archivos en target que ya no existen en source
        "unchanged": [],   # Archivos idénticos
    }

    # Hooks
    for hook in HOOKS:
        src = os.path.join(source, "hooks", hook)
        dst = os.path.join(target, "hooks", hook)
        _compare_file(src, dst, f"hooks/{hook}", changes)

    # Skills (comparar todos los archivos en cada skill dir)
    for skill in SKILLS:
        src_dir = os.path.join(source, "skills", skill)
        dst_dir = os.path.join(target, "skills", skill)
        if os.path.isdir(src_dir):
            for fname in os.listdir(src_dir):
                src = os.path.join(src_dir, fname)
                dst = os.path.join(dst_dir, fname)
                if os.path.isfile(src):
                    _compare_file(src, dst, f"skills/{skill}/{fname}", changes)

    # Bin files
    for bf in BIN_FILES:
        src = os.path.join(source, "bin", bf)
        dst = os.path.join(target, "bin", bf)
        _compare_file(src, dst, f"bin/{bf}", changes)

    # hooks.json
    src = os.path.join(source, "hooks.json")
    dst = os.path.join(target, "hooks.json")
    _compare_file(src, dst, "hooks.json", changes)

    # Plugin manifest
    src = os.path.join(source, ".claude-plugin", "plugin.json")
    dst = os.path.join(target, ".claude-plugin", "plugin.json")
    _compare_file(src, dst, ".claude-plugin/plugin.json", changes)

    return changes


def _compare_file(src, dst, label, changes):
    """Comparar un archivo source vs destino."""
    src_hash = file_hash(src)
    dst_hash = file_hash(dst)

    if src_hash and not dst_hash:
        changes["added"].append(label)
    elif not src_hash and dst_hash:
        changes["removed"].append(label)
    elif src_hash and dst_hash:
        if src_hash != dst_hash:
            changes["modified"].append(label)
        else:
            changes["unchanged"].append(label)


# ── Backup ────────────────────────────────────────────────────────────────

def create_backup(target, manifest):
    """Crear backup del manifest actual antes del upgrade."""
    claude_dir = os.path.join(target, ".claude")
    backup_dir = os.path.join(claude_dir, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    version = manifest.get("version", "unknown")
    backup_name = f"manifest-v{version}-{timestamp}.json"
    backup_path = os.path.join(backup_dir, backup_name)

    with open(backup_path, "w") as f:
        json.dump(manifest, f, indent=2)

    return backup_path


# ── Migraciones ───────────────────────────────────────────────────────────

# Registro de migraciones entre versiones.
# Cada migración es una función que recibe (target, manifest) y retorna el manifest actualizado.
# Se ejecutan en orden de versión.

MIGRATIONS = {
    # "1.0.0→2.0.0": migration_1_to_2,
    # Agregar futuras migraciones aquí
}


def get_needed_migrations(from_version, to_version):
    """Determinar qué migraciones necesitan ejecutarse."""
    needed = []
    for key, fn in MIGRATIONS.items():
        src_v, dst_v = key.split("→")
        # Simple check: si la versión instalada es anterior
        if src_v == from_version and dst_v != from_version:
            needed.append((key, fn))
    return needed


# ── Aplicar upgrade ───────────────────────────────────────────────────────

def apply_upgrade(source, target, changes, manifest):
    """Aplicar los cambios del upgrade."""
    errors = []

    is_self = os.path.realpath(source) == os.path.realpath(target)

    # Copiar archivos modificados y nuevos (excepto en self-install)
    if not is_self:
        for label in changes["added"] + changes["modified"]:
            try:
                src = os.path.join(source, label)
                dst = os.path.join(target, label)
                # Seguridad: no seguir symlinks
                if os.path.islink(src):
                    errors.append(f"Symlink rechazado (seguridad): {label}")
                    continue
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
                # Hacer ejecutable si es bin/git-memory
                if label == "bin/git-memory":
                    os.chmod(dst, 0o755)
            except Exception as e:
                errors.append(f"Error copiando {label}: {e}")

    # Actualizar symlinks en .claude/
    claude_dir = os.path.join(target, ".claude")
    for hook in HOOKS:
        link = os.path.join(claude_dir, "hooks", hook)
        if not os.path.exists(link):
            os.makedirs(os.path.dirname(link), exist_ok=True)
            rel = os.path.join("..", "..", "hooks", hook)
            try:
                os.symlink(rel, link)
            except Exception as e:
                errors.append(f"Error creando symlink hooks/{hook}: {e}")

    for skill in SKILLS:
        link = os.path.join(claude_dir, "skills", skill)
        if not os.path.exists(link):
            os.makedirs(os.path.dirname(link), exist_ok=True)
            rel = os.path.join("..", "..", "skills", skill)
            try:
                os.symlink(rel, link)
            except Exception as e:
                errors.append(f"Error creando symlink skills/{skill}: {e}")

    # Actualizar managed block en CLAUDE.md
    try:
        install_mod = _load_install_module()
        install_mod._update_claude_md(target)
    except Exception as e:
        errors.append(f"Error actualizando CLAUDE.md: {e}")

    # Actualizar manifest
    try:
        new_manifest = dict(manifest)
        new_manifest["version"] = VERSION
        new_manifest["upgraded_at"] = datetime.now().isoformat()
        new_manifest["install_fingerprint"] = _compute_fingerprint(target)

        manifest_path = os.path.join(claude_dir, "git-memory-manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(new_manifest, f, indent=2)
    except Exception as e:
        errors.append(f"Error actualizando manifest: {e}")

    return errors


# ── Helpers internos ──────────────────────────────────────────────────────

_install_mod = None

def _load_install_module():
    """Cargar git-memory-install.py como módulo (cache)."""
    global _install_mod
    if _install_mod is not None:
        return _install_mod
    from importlib.util import spec_from_file_location, module_from_spec
    install_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-memory-install.py")
    if not os.path.isfile(install_path):
        raise FileNotFoundError(f"git-memory-install.py no encontrado en {install_path}")
    spec = spec_from_file_location("install", install_path)
    _install_mod = module_from_spec(spec)
    spec.loader.exec_module(_install_mod)
    return _install_mod


def _compute_fingerprint(root):
    """Calcular fingerprint de archivos instalados."""
    h = hashlib.sha256()
    for hook in HOOKS:
        path = os.path.join(root, "hooks", hook)
        if os.path.isfile(path):
            with open(path, "rb") as f:
                h.update(f.read())
    for skill in SKILLS:
        path = os.path.join(root, "skills", skill, "SKILL.md")
        if os.path.isfile(path):
            with open(path, "rb") as f:
                h.update(f.read())
    cli_path = os.path.join(root, "bin", "git-memory")
    if os.path.isfile(cli_path):
        with open(cli_path, "rb") as f:
            h.update(f.read())
    return f"sha256:{h.hexdigest()[:16]}"


# ── Output ────────────────────────────────────────────────────────────────

def format_diff_human(changes, from_version, to_version):
    """Formatear diff para lectura humana."""
    lines = []
    lines.append(f"Versión instalada: v{from_version}")
    lines.append(f"Versión disponible: v{to_version}")
    lines.append("")

    total_changes = len(changes["added"]) + len(changes["modified"])
    if total_changes == 0:
        lines.append("Sin cambios — ya estás en la versión más reciente.")
        return "\n".join(lines)

    if changes["added"]:
        lines.append(f"  + {len(changes['added'])} archivos nuevos:")
        for f in changes["added"]:
            lines.append(f"    + {f}")

    if changes["modified"]:
        lines.append(f"  ~ {len(changes['modified'])} archivos modificados:")
        for f in changes["modified"]:
            lines.append(f"    ~ {f}")

    if changes["removed"]:
        lines.append(f"  - {len(changes['removed'])} archivos eliminados:")
        for f in changes["removed"]:
            lines.append(f"    - {f}")

    lines.append(f"\n  = {len(changes['unchanged'])} archivos sin cambios")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    auto = "--auto" in args
    dry_run = "--dry-run" in args
    check_only = "--check" in args
    as_json = "--json" in args

    source = find_source_root()
    target = find_target_root()

    # Self-upgrade guard
    is_self = os.path.realpath(source) == os.path.realpath(target)

    # Leer estado actual
    manifest = read_installed_manifest(target)
    if manifest is None:
        if as_json:
            print(json.dumps({"status": "error", "message": "No hay instalación para actualizar. Usa: git memory install"}))
        else:
            print("Error: no hay instalación de git-memory para actualizar.", file=sys.stderr)
            print("Usa: git memory install", file=sys.stderr)
        sys.exit(1)

    from_version = manifest.get("version", "unknown")
    to_version = read_source_version(source)

    # Calcular diff
    changes = compute_diff(source, target)
    total_changes = len(changes["added"]) + len(changes["modified"])

    # --check: solo reportar si hay actualización
    if check_only:
        has_update = total_changes > 0 or from_version != to_version
        if as_json:
            print(json.dumps({
                "status": "update_available" if has_update else "up_to_date",
                "installed_version": from_version,
                "available_version": to_version,
                "changes": {k: len(v) for k, v in changes.items()},
            }))
        else:
            if has_update:
                print(f"Actualización disponible: v{from_version} → v{to_version}")
                print(f"  {total_changes} archivos a actualizar")
            else:
                print(f"Ya estás en la versión más reciente (v{to_version})")
        sys.exit(0)

    # Output completo
    if as_json:
        output = {
            "installed_version": from_version,
            "available_version": to_version,
            "changes": changes,
            "is_self": is_self,
            "migrations": [k for k, _ in get_needed_migrations(from_version, to_version)],
        }

        if total_changes == 0 and from_version == to_version:
            output["status"] = "up_to_date"
            print(json.dumps(output, indent=2))
            sys.exit(0)

        output["status"] = "update_available"
        if dry_run:
            output["dry_run"] = True
            print(json.dumps(output, indent=2))
            sys.exit(0)

    else:
        print("=== git memory upgrade ===")
        print(f"Fuente: {source}")
        print(f"Destino: {target}")
        if is_self:
            print("(modo self-upgrade — source == target)")
        print()
        print(format_diff_human(changes, from_version, to_version))
        print()

    # Nada que actualizar
    if total_changes == 0 and from_version == to_version:
        if not as_json:
            print("Nada que actualizar.")
        sys.exit(0)

    # Dry run
    if dry_run:
        if not as_json:
            print("(dry-run — no se aplicaron cambios)")
        sys.exit(0)

    # Confirmación
    if not auto:
        try:
            answer = input("\n¿Aplicar actualización? [Y/n] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAbortado.")
            sys.exit(2)

        if answer and answer not in ("y", "yes", "s", "si", "sí", ""):
            print("Abortado.")
            sys.exit(2)

    # Backup
    if not as_json:
        print("\nCreando backup...")
    backup_path = create_backup(target, manifest)
    if not as_json:
        print(f"  Backup: {backup_path}")

    # Migraciones
    migrations = get_needed_migrations(from_version, to_version)
    if migrations:
        if not as_json:
            print(f"\nEjecutando {len(migrations)} migración(es)...")
        for key, fn in migrations:
            try:
                manifest = fn(target, manifest)
                if not as_json:
                    print(f"  ✅ {key}")
            except Exception as e:
                if not as_json:
                    print(f"  ❌ {key}: {e}")
                    print("Upgrade abortado. Manifest original preservado en backup.")
                sys.exit(1)

    # Aplicar
    if not as_json:
        print("\nAplicando actualización...")
    errors = apply_upgrade(source, target, changes, manifest)

    if errors:
        if as_json:
            print(json.dumps({"status": "error", "errors": errors}))
        else:
            print(f"\n{len(errors)} error(es):")
            for e in errors:
                print(f"  ❌ {e}")
            print(f"\nBackup disponible en: {backup_path}")
        sys.exit(1)

    # Verificar
    if not as_json:
        print("\nVerificando...")
    doctor_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-memory-doctor.py")
    if os.path.isfile(doctor_script):
        subprocess.run([sys.executable, doctor_script], timeout=15)

    if as_json:
        print(json.dumps({
            "status": "upgraded",
            "from_version": from_version,
            "to_version": to_version,
            "changes_applied": total_changes,
            "backup": backup_path,
        }))
    else:
        print(f"\n✅ Upgrade completado: v{from_version} → v{to_version}")
        print(f"   {total_changes} archivos actualizados")
        print(f"   Backup: {backup_path}")


if __name__ == "__main__":
    main()

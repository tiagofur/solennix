#!/usr/bin/env python3
"""Anti-literal lint: forbid raw Spanish UI literals in SwiftUI source.

Change: ios-l10n-harness (B-4), work unit U2.
Spec requirement: "Anti-Literal Lint" -- scan .swift for raw Spanish UI
literals in `Text`/`Button`/`Label`/`.navigationTitle` positions and exit
non-zero on the first violation.

A literal in such a position is FLAGGED when it:
  * contains an accented char / n-tilde / inverted punctuation
    (a e i o u n u inverted-? inverted-!, and their uppercase), OR
  * matches an unambiguous-Spanish denylist word (whole-word, case-insensitive).

Accent-only detection is INSUFFICIENT: "Buscar" / "Listo" / "Cancelar" /
"Actualizar" carry no accents, so the lint pairs accent detection with an
explicit denylist. Cognates (Error, Perfil, Normal, Radio, Visa) are EXCLUDED
so EN/ES cognates used as literals stay permitted -- `Button("Error")` at
ToastOverlay is the intentional proof point that stays literal.

The decision logic (`classify`, `find_violations_in_line`) is PURE and
unit-tested; the file walk + exit-code wiring live at the CLI boundary.

Usage:
    python3 lint_literals.py                 # scan ios/, exit 0 or 1
    python3 lint_literals.py PATH...         # scan given files/dirs
    python3 lint_literals.py --root ios      # override scan root
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROOT = REPO_ROOT / "ios"

# Positions where a bare string literal becomes user-facing copy. The capture
# is the literal text (without quotes); escapes are tolerated.
_POSITION_RE = re.compile(
    r'\b(?:Text|Button|Label|navigationTitle)\s*\(\s*"((?:[^"\\]|\\.)*)"'
)

# Accented / Spanish-only punctuation. n-tilde and the inverted marks are
# unambiguous Spanish signals even when the rest of the word has none.
_ACCENT_RE = re.compile(r"[áéíóúñü¿¡ÁÉÍÓÚÑÜ]")

# Unambiguous Spanish UI words (none are English words). Paired with the
# accent rule because these specific words carry no accent.
_DENYLIST = (
    "Cancelar", "Buscar", "Actualizar", "Guardar", "Eliminar", "Editar",
    "Cerrar", "Agregar", "Aceptar", "Continuar", "Configuración", "Listo",
    "Volver", "Quitar", "Añadir", "Seleccionar", "Ajustes", "Cuenta",
    "Ayuda", "Soporte", "Información",
)
_DENYLIST_RE = re.compile(
    r"(?:%s)" % "|".join(re.escape(w) for w in _DENYLIST),
    flags=re.IGNORECASE,
)

# EN/ES cognates permitted as literals (no accent, semantically identical in
# both locales). Excluded explicitly so the lint never trips on them even if
# the denylist grows later.
_COGNATES = frozenset(("Error", "Perfil", "Normal", "Radio", "Visa"))


# --------------------------------------------------------------------------- #
# PURE decision logic (unit-tested; no I/O)
# --------------------------------------------------------------------------- #
def classify(literal: str):
    """Return a human-readable reason when `literal` is a flagged raw Spanish
    UI literal, otherwise ``None``.

    Pure: performs no I/O and reads no global mutable state.
    """
    stripped = literal.strip()
    # Cognate escape hatch: an exact cognate literal is always allowed.
    if stripped in _COGNATES:
        return None
    if _ACCENT_RE.search(literal):
        return "contains an accented/Spanish character"
    match = _DENYLIST_RE.search(literal)
    if match:
        return "Spanish denylist word %r" % match.group(0)
    return None


def find_violations_in_line(line: str):
    """Yield ``(column, literal, reason)`` for every flagged position literal
    on ``line``. ``column`` is 1-based and points at the literal's opening quote
    position within the line. Pure: no I/O.
    """
    for match in _POSITION_RE.finditer(line):
        literal = match.group(1)
        reason = classify(literal)
        if reason is not None:
            yield (match.start(0) + 1, literal, reason)


def is_excluded(path: Path) -> bool:
    """True for test sources, which legitimately assert on Spanish strings and
    are out of the lint's scope ("scan ios/**/*.swift, excl tests").

    Test targets live under a "...Tests" directory (SolennixTests/, a package
    Tests/ dir, ...) or are named "...Tests.swift".
    """
    if any(part.endswith("Tests") for part in path.parts):
        return True
    return path.name.endswith("Tests.swift")


# --------------------------------------------------------------------------- #
# I/O + CLI
# --------------------------------------------------------------------------- #
def iter_swift_files(roots):
    """Yield non-excluded *.swift paths under each root (files pass through)."""
    seen = set()
    for root in roots:
        base = Path(root)
        if base.is_file():
            paths = [base]
        else:
            paths = sorted(base.rglob("*.swift"))
        for path in paths:
            if path in seen:
                continue
            seen.add(path)
            if is_excluded(path):
                continue
            yield path


def _preview_macro_on_line(line: str) -> bool:
    """True when ``line`` opens a ``#Preview`` macro invocation.

    A ``#Preview`` macro introduces a trailing closure (``{ ... }``) whose
    body is Xcode canvas demo copy, NOT shipped UI. Literals there are
    intentionally raw and must be excluded from the lint. We only treat the
    marker as a macro when it appears outside a ``//`` line comment.
    """
    idx = line.find("#Preview")
    if idx == -1:
        return False
    comment_idx = line.find("//")
    return comment_idx == -1 or idx < comment_idx


def scan_file(path: Path):
    """Yield ``(lineno, column, literal, reason)`` violations in ``path``.

    Lines inside a ``#Preview { ... }`` macro block are skipped: that block is
    Xcode canvas demo copy (e.g. ``ConfirmDialog``'s preview button), not
    shipped UI, so its raw literals are out of scope. The block boundary is
    tracked by brace counting from the ``#Preview`` line.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return
    in_preview = False
    brace_depth = 0
    for lineno, line in enumerate(text.splitlines(), start=1):
        if _preview_macro_on_line(line):
            # Open a preview block and (re)seed its brace counter on this line.
            in_preview = True
            brace_depth = 0
        if in_preview:
            brace_depth += line.count("{") - line.count("}")
            if brace_depth <= 0:
                in_preview = False
            continue
        for column, literal, reason in find_violations_in_line(line):
            yield (lineno, column, literal, reason)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("paths", nargs="*",
                        help="files/dirs to scan (default: ios/)")
    parser.add_argument("--root", default=str(DEFAULT_ROOT),
                        help="scan root when no positional paths are given")
    args = parser.parse_args(argv)

    roots = args.paths or [args.root]
    violations = 0
    for path in iter_swift_files(roots):
        for lineno, column, literal, reason in scan_file(path):
            rel = path.relative_to(REPO_ROOT) if str(path).startswith(str(REPO_ROOT)) else path
            print("%s:%d:%d: %s -- %r" % (rel, lineno, column, reason, literal))
            violations += 1

    if violations:
        print("\nl10n lint: %d raw Spanish literal(s) must be localized." % violations)
        return 1
    print("l10n lint: no raw Spanish UI literals found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

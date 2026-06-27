#!/usr/bin/env python3
"""Prune dead localization keys from an Xcode .xcstrings catalog.

Change: ios-catalog-english (B-2), work unit T1 (PR1).
Spec requirement: "Orphan Key Pruning" — a key whose localizations are all
empty AND has zero codebase references SHALL be removed. No key with >=1
reference may ever be pruned (the ref-check gate).

Scope (T1):
  * Prune empty-localization orphans (spec mandate), ref-gate filtered.
  * Prune an explicit allowlist of Xcode-"stale" keys the orchestrator named
    (the B-1 picker labels), ref-gate filtered.
  * Other "stale" keys are OUT OF SCOPE and are never touched here, even if
    they happen to be dead.

The decision logic (is_orphan_entry / partition_by_ref_gate / build_prune_plan)
is PURE and unit-tested with an injected `has_ref` callable. The real ref check
(ripgrep over the ios/ tree, excluding the catalog itself) is wired in only at
the CLI boundary.

Usage:
    python3 prune_orphan_keys.py --dry-run            # report only
    python3 prune_orphan_keys.py                      # prune + write back
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG = REPO_ROOT / "ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Resources/Localizable.xcstrings"
IOS_ROOT = REPO_ROOT / "ios"
CATALOG_SUFFIX = "Localizable.xcstrings"

# Orchestrator-specified stale keys to prune (B-1 picker labels, now dead).
# Ref-check gate still applies: any with a live ref is retained.
STALE_ALLOWLIST = (
    "settings.language.option.en",
    "settings.language.option.es",
    "settings.profile.language",
    "settings.profile.language_updated",
)


# --------------------------------------------------------------------------- #
# PURE decision logic (unit-tested; no I/O)
# --------------------------------------------------------------------------- #
def is_orphan_entry(entry) -> bool:
    """True when an entry has no localizations (spec: "localizations all empty")."""
    if not isinstance(entry, dict):
        return False
    return not entry.get("localizations")


def is_interpolation_susceptible(key) -> bool:
    """True for keys that may originate from SwiftUI `Text("...\\(var)...")`.

    Such interpolations compile to "%lld"/"%@" placeholder keys that do NOT
    appear literally in source, so a substring ref-check cannot confirm they
    are dead (false negative). To stay strictly faithful to "no live key may
    be pruned", these keys are never taken as empty-orphan prune candidates;
    they are resolved during T2's per-call-site migration.
    """
    return "%" in key


def partition_by_ref_gate(keys, has_ref):
    """Split keys into (prunable, protected) via the ref-check gate.

    has_ref(key) -> bool must return True when `key` has >=1 codebase
    reference (i.e. it is LIVE). A live key is ALWAYS protected.
    """
    prunable, protected = [], []
    for key in keys:
        (protected if has_ref(key) else prunable).append(key)
    return prunable, protected


def build_prune_plan(catalog, has_ref, extra_keys=()):
    """Build (prunable, protected) for the whole catalog.

    Candidates:
      * the supplied `extra_keys` (named keys, e.g. B-1 picker labels -- never
        interpolation-derived), and
      * empty-localization orphans that are NOT interpolation-susceptible
        (the substring ref-check is reliable for them).
    The ref-check gate is applied to every candidate. Translated keys,
    out-of-scope stale keys and interpolation-susceptible orphans are never
    candidates.
    """
    strings = catalog.get("strings", {})
    candidates = []
    seen = set()
    for key in extra_keys:
        if key in strings and key not in seen:
            candidates.append(key)
            seen.add(key)
    for key, value in strings.items():
        if key in seen:
            continue
        if is_orphan_entry(value) and not is_interpolation_susceptible(key):
            candidates.append(key)
            seen.add(key)
    return partition_by_ref_gate(candidates, has_ref)


# --------------------------------------------------------------------------- #
# Real ref-check (ripgrep over ios/, excluding the catalog file itself)
# --------------------------------------------------------------------------- #
def _empty_key_is_referenced():
    """Targeted check for the "" key (substring grep is meaningless for it)."""
    try:
        res = subprocess.run(
            ["rg", "--fixed-strings", "-n", "-e", 'Text("")',
             "-e", 'LocalizedStringKey("")', "-e", 'FeatureL10n.text("")',
             str(IOS_ROOT)],
            capture_output=True, text=True,
        )
        return res.returncode == 0 and bool(res.stdout.strip())
    except FileNotFoundError:
        return False


def make_ref_checker():
    """Return a has_ref(key)->bool backed by ripgrep over the ios/ tree."""
    def has_ref(key):
        if key == "":
            return _empty_key_is_referenced()
        try:
            res = subprocess.run(
                ["rg", "--fixed-strings", "-l", "--", key, str(IOS_ROOT)],
                capture_output=True, text=True,
            )
        except FileNotFoundError:
            raise SystemExit("ripgrep (rg) is required for the ref-check gate.")
        if res.returncode not in (0, 1):
            res.check_returncode()
        files = [f for f in res.stdout.splitlines()
                 if f and not f.endswith(CATALOG_SUFFIX)]
        return len(files) > 0
    return has_ref


# --------------------------------------------------------------------------- #
# I/O + CLI
# --------------------------------------------------------------------------- #
def load_catalog(path=CATALOG):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def _find_line(lines, signature):
    for i, line in enumerate(lines):
        if line == signature:
            return i
    return None


def _match_block(lines, start):
    """Return the index of the brace-balanced closing line for the block
    opened at `start`."""
    depth = 0
    for j in range(start, len(lines)):
        depth += lines[j].count("{") - lines[j].count("}")
        if depth == 0:
            return j
    raise ValueError("unterminated block at line %d" % (start + 1))


def remove_key_blocks(text, keys):
    """Surgically delete the top-level 'strings' child blocks for `keys`.

    Preserves Xcode's exact formatting (": " separators, blank lines inside
    empty objects) by editing text directly instead of re-serializing JSON.
    Every removed block MUST close with a comma (i.e. not be the final
    'strings' entry); otherwise a trailing-comma would be introduced and this
    raises. The result is validated with json.loads before return.
    """
    lines = text.split("\n")
    ranges = []
    for key in keys:
        signature = "    " + json.dumps(key, ensure_ascii=False) + " : {"
        start = _find_line(lines, signature)
        if start is None:
            raise KeyError("block not found for key %r" % key)
        end = _match_block(lines, start)
        closing = lines[end].strip()
        if closing != "},":
            raise NotImplementedError(
                "removing the last 'strings' entry (%r) is not supported" % key)
        ranges.append((start, end))
    for start, end in sorted(ranges, reverse=True):
        del lines[start:end + 1]
    result = "\n".join(lines)
    json.loads(result)  # validate: explodes on trailing comma / bad structure
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true",
                        help="report the prune plan without writing")
    parser.add_argument("--catalog", default=str(CATALOG))
    args = parser.parse_args(argv)

    catalog_path = Path(args.catalog)
    catalog = load_catalog(catalog_path)
    before = len(catalog.get("strings", {}))

    has_ref = make_ref_checker()
    prunable, protected = build_prune_plan(catalog, has_ref, STALE_ALLOWLIST)

    print(f"catalog:            {catalog_path.relative_to(REPO_ROOT)}")
    print(f"sourceLanguage:     {catalog.get('sourceLanguage')}")
    print(f"keys before:        {before}")
    print(f"candidates prunable:{len(prunable)}")
    print(f"candidates protected (have refs): {len(protected)}")
    for key in prunable:
        print(f"  - prune: {key!r}")

    if args.dry_run:
        print("DRY-RUN: no changes written.")
        return 0

    original = catalog_path.read_text(encoding="utf-8")
    new_text = remove_key_blocks(original, prunable)
    catalog_path.write_text(new_text, encoding="utf-8")
    after = len(load_catalog(catalog_path).get("strings", {}))
    print(f"keys after:         {after}")
    print(f"removed:            {before - after}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

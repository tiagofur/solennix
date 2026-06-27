"""Unit tests for prune_orphan_keys (TDD).

Spec: ios-catalog-english (B-2) -> Requirement: Orphan Key Pruning.
  - "dead orphans removed": empty localizations + zero refs -> removed.
  - "live key protected (ref-check gate)": >=1 codebase ref -> retained.

REFINEMENT (discovered during apply): the substring-grep ref-check produces
FALSE NEGATIVES for keys derived from SwiftUI `Text("...\\(var)...")`
interpolation, which become "%lld"/"%@" placeholder keys not present
literally in source. Such keys are therefore never taken as prune candidates
(is_interpolation_susceptible) -- they are deferred to T2, where the
migration of each call site resolves them. This is strictly MORE conservative
than the spec's literal gate.

Run:  python3 -m unittest test_prune_orphan_keys   (from scripts/l10n)
"""

import os
import sys
import unittest
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import prune_orphan_keys as pop  # noqa: E402


def _translated():
    return {
        "localizations": {
            "en": {"stringUnit": {"state": "translated", "value": "Hello"}},
            "es": {"stringUnit": {"state": "translated", "value": "Hola"}},
        }
    }


class TestIsOrphanEntry(unittest.TestCase):
    def test_missing_localizations_is_orphan(self):
        self.assertTrue(pop.is_orphan_entry({}))

    def test_empty_localizations_dict_is_orphan(self):
        self.assertTrue(pop.is_orphan_entry({"localizations": {}}))

    def test_translated_entry_is_not_orphan(self):
        self.assertFalse(pop.is_orphan_entry(_translated()))

    def test_none_entry_is_not_orphan(self):
        self.assertFalse(pop.is_orphan_entry(None))


class TestInterpolationSusceptible(unittest.TestCase):
    """Keys with % placeholders may come from Text("\\(...)"); the substring
    ref-check cannot see those refs, so they must never be auto-pruned."""

    def test_percent_placeholder_is_susceptible(self):
        self.assertTrue(pop.is_interpolation_susceptible("x%lld"))
        self.assertTrue(pop.is_interpolation_susceptible("%lld fotos"))
        self.assertTrue(pop.is_interpolation_susceptible("Total: %@"))

    def test_plain_sentence_is_not_susceptible(self):
        self.assertFalse(pop.is_interpolation_susceptible("¿Descartar cambios?"))

    def test_empty_key_is_not_susceptible(self):
        self.assertFalse(pop.is_interpolation_susceptible(""))


class TestRefCheckGate(unittest.TestCase):
    """THE REF-CHECK GATE. A key with >=1 codebase ref is NEVER pruned."""

    def test_zero_refs_all_prunable(self):
        keys = ["dead.one", "dead.two", "dead.three"]
        prunable, protected = pop.partition_by_ref_gate(keys, lambda _k: False)
        self.assertEqual(prunable, keys)
        self.assertEqual(protected, [])

    def test_live_ref_is_protected(self):
        keys = ["settings.profile.language"]
        prunable, protected = pop.partition_by_ref_gate(
            keys, lambda k: k == "settings.profile.language"
        )
        self.assertEqual(prunable, [])
        self.assertEqual(protected, ["settings.profile.language"])

    def test_mixed_partition_preserves_order(self):
        keys = ["keep_me", "dead", "also_live", "also_dead"]
        has_ref = {"keep_me": True, "dead": False,
                   "also_live": True, "also_dead": False}.get
        prunable, protected = pop.partition_by_ref_gate(keys, has_ref)
        self.assertEqual(prunable, ["dead", "also_dead"])
        self.assertEqual(protected, ["keep_me", "also_live"])


class TestBuildPrunePlan(unittest.TestCase):
    def _catalog(self):
        return {
            "sourceLanguage": "es",
            "strings": {
                # sentence-like empty orphan, dead -> PRUNE
                "¿Descartar?": {},
                # sentence-like empty orphan, still referenced -> PROTECT
                "Aún en uso": {},
                # format empty orphan -> interpolation-susceptible -> NOT candidate
                "%lld fotos": {},
                "x%lld": {},
                # translated live key -> NOT a candidate
                "live.key": _translated(),
                # stale allowlist key, dead -> PRUNE
                "settings.language.option.en": dict(_translated(), extractionState="stale"),
                # stale allowlist key, still referenced -> PROTECT
                "settings.profile.language": dict(_translated(), extractionState="stale"),
                # stale key NOT in allowlist -> OUT OF SCOPE
                "calendar.title": dict(_translated(), extractionState="stale"),
            },
        }

    def _plan(self, refs):
        return pop.build_prune_plan(
            self._catalog(), refs,
            extra_keys=("settings.language.option.en", "settings.profile.language"),
        )

    def test_dead_sentence_orphan_with_zero_refs_is_pruned(self):
        prunable, _ = self._plan({"Aún en uso": True,
                                  "settings.profile.language": True}.get)
        self.assertIn("¿Descartar?", prunable)

    def test_live_sentence_orphan_is_protected(self):
        _, protected = self._plan({"Aún en uso": True,
                                   "settings.profile.language": True}.get)
        self.assertIn("Aún en uso", protected)

    def test_interpolation_susceptible_orphan_is_never_a_candidate(self):
        # Even with zero refs, format keys are not candidates (gate unreliable).
        prunable, protected = self._plan({"Aún en uso": True,
                                          "settings.profile.language": True}.get)
        self.assertNotIn("%lld fotos", prunable)
        self.assertNotIn("%lld fotos", protected)
        self.assertNotIn("x%lld", prunable)
        self.assertNotIn("x%lld", protected)

    def test_stale_allowlist_dead_is_pruned(self):
        prunable, _ = self._plan({"Aún en uso": True,
                                  "settings.profile.language": True}.get)
        self.assertIn("settings.language.option.en", prunable)

    def test_stale_allowlist_live_is_protected(self):
        _, protected = self._plan({"Aún en uso": True,
                                   "settings.profile.language": True}.get)
        self.assertIn("settings.profile.language", protected)

    def test_translated_and_out_of_scope_stale_never_touched(self):
        prunable, protected = self._plan(lambda _k: True)
        self.assertNotIn("live.key", prunable)
        self.assertNotIn("live.key", protected)
        self.assertNotIn("calendar.title", prunable)
        self.assertNotIn("calendar.title", protected)


class TestRemoveKeyBlocks(unittest.TestCase):
    """Surgical text removal must preserve Xcode formatting and stay valid JSON."""

    SAMPLE = (
        '{\n'
        '  "sourceLanguage" : "es",\n'
        '  "strings" : {\n'
        '    "" : {\n\n'
        '    },\n'
        '    "keep.me" : {\n'
        '      "localizations" : {\n'
        '        "en" : {\n'
        '          "stringUnit" : {\n'
        '            "state" : "translated",\n'
        '            "value" : "Keep"\n'
        '          }\n'
        '        }\n'
        '      }\n'
        '    },\n'
        '    "drop.me" : {\n'
        '      "extractionState" : "stale",\n'
        '      "localizations" : {}\n'
        '    },\n'
        '    "tail" : {\n\n'
        '    }\n'
        '  },\n'
        '  "version" : "1.0"\n'
        '}\n'
    )

    def test_removes_only_targeted_blocks(self):
        result = pop.remove_key_blocks(self.SAMPLE, ["", "drop.me"])
        data = json.loads(result)
        self.assertNotIn("", data["strings"])
        self.assertNotIn("drop.me", data["strings"])
        self.assertIn("keep.me", data["strings"])
        self.assertIn("tail", data["strings"])

    def test_preserves_xcode_formatting_of_remaining_entries(self):
        result = pop.remove_key_blocks(self.SAMPLE, ["drop.me"])
        # untouched entry formatting is byte-identical (": " separators kept)
        self.assertIn('"keep.me" : {', result)
        self.assertIn('"state" : "translated",', result)
        self.assertTrue(result.rstrip().endswith("}"))

    def test_empty_object_block_with_blank_line_removed_cleanly(self):
        result = pop.remove_key_blocks(self.SAMPLE, [""])
        self.assertNotIn('"" : {', result)
        self.assertTrue(json.loads(result) is not None)

    def test_refuses_last_entry_to_avoid_trailing_comma(self):
        with self.assertRaises(NotImplementedError):
            pop.remove_key_blocks(self.SAMPLE, ["tail"])

    def test_missing_key_raises(self):
        with self.assertRaises(KeyError):
            pop.remove_key_blocks(self.SAMPLE, ["does.not.exist"])


if __name__ == "__main__":
    unittest.main()

"""Unit tests for lint_literals (TDD).

Change: ios-l10n-harness (B-4), work unit U2.
Spec requirement: "Anti-Literal Lint" -- scan .swift for raw Spanish UI
literals in Text/Button/Label/.navigationTitle positions; flag when a literal
contains an accented/Spanish char OR matches the denylist; EXCLUDE cognates.

Written as unittest (matching the sibling test_prune_orphan_keys.py). pytest
discovers unittest.TestCase classes natively, so `python3 -m pytest
scripts/l10n/` is green wherever pytest is installed; locally run with
`python3 -m unittest` (the environment has no pytest).

Run:
    python3 -m unittest test_lint_literals          (from scripts/l10n)
    python3 -m pytest scripts/l10n/                 (where pytest exists)
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lint_literals as lint  # noqa: E402


class TestClassifyCognates(unittest.TestCase):
    """THE cognate escape hatch: EN/ES cognates used as literals stay allowed."""

    def test_each_cognate_is_not_flagged(self):
        for word in ("Error", "Perfil", "Normal", "Radio", "Visa"):
            self.assertIsNone(lint.classify(word), msg=word)

    def test_cognate_with_surrounding_whitespace_still_allowed(self):
        # strip() is applied before the cognate check.
        self.assertIsNone(lint.classify("  Error  "))


class TestClassifyAllowed(unittest.TestCase):
    """Symbolic keys, English words and empty literals are not flagged."""

    def test_symbolic_namespace_key_not_flagged(self):
        self.assertIsNone(lint.classify("settings.profile.language"))
        self.assertIsNone(lint.classify("keyboard.shortcut.search"))

    def test_plain_english_not_flagged(self):
        self.assertIsNone(lint.classify("Search"))
        self.assertIsNone(lint.classify("Dashboard"))

    def test_empty_not_flagged(self):
        self.assertIsNone(lint.classify(""))


class TestClassifyAccents(unittest.TestCase):
    """Accented chars / n-tilde / inverted marks always flag."""

    def test_accented_word_flagged(self):
        self.assertIsNotNone(lint.classify("Atención"))
        self.assertIsNotNone(lint.classify("Configuración"))

    def test_inverted_marks_flag(self):
        self.assertIsNotNone(lint.classify("¿Eliminar?"))
        self.assertIsNotNone(lint.classify("¡Hola!"))

    def test_ntilde_flags(self):
        self.assertIsNotNone(lint.classify("Español"))
        self.assertIsNotNone(lint.classify("Añadir"))


class TestClassifyDenylist(unittest.TestCase):
    """Unambiguous Spanish words (case-insensitive, whole-word) flag even with
    no accent -- the gap accent-only detection misses."""

    def test_denylist_words_flag(self):
        for word in ("Buscar", "Cancelar", "Listo", "Actualizar", "Ajustes",
                     "Ayuda", "Eliminar", "Continuar"):
            self.assertIsNotNone(lint.classify(word), msg=word)

    def test_denylist_case_insensitive(self):
        self.assertIsNotNone(lint.classify("buscar"))
        self.assertIsNotNone(lint.classify("CANCELAR"))

    def test_denylist_inside_phrase_flags(self):
        # whole-word match within a larger literal still flags
        self.assertIsNotNone(lint.classify("Eliminar Evento"))
        self.assertIsNotNone(lint.classify("Desbloquea para continuar"))
        self.assertIsNotNone(lint.classify("Ayuda de Solennix"))
        self.assertIsNotNone(lint.classify("Ajustes..."))


class TestFindViolationsInLine(unittest.TestCase):
    """Position-scoped detection: only Text/Button/Label/.navigationTitle."""

    def test_button_text_label_navigationtitle_detected(self):
        self.assertEqual(len(list(lint.find_violations_in_line('Button("Buscar")'))), 1)
        self.assertEqual(len(list(lint.find_violations_in_line('Text("Cancelar")'))), 1)
        self.assertEqual(len(list(lint.find_violations_in_line('Label("Ajustes", systemImage: "gear")'))), 1)
        self.assertEqual(len(list(lint.find_violations_in_line('.navigationTitle("Ayuda")'))), 1)

    def test_non_position_string_not_scanned(self):
        # systemImage value / a bare string are NOT Text/Button/Label positions
        self.assertEqual(list(lint.find_violations_in_line('Image(systemImage: "Buscar")')), [])
        self.assertEqual(list(lint.find_violations_in_line('let x = "Buscar"')), [])

    def test_cognate_position_not_flagged(self):
        # Button("Error") is the cognate proof point -- never flagged.
        self.assertEqual(list(lint.find_violations_in_line('Button("Error")')), [])

    def test_symbolic_key_position_not_flagged(self):
        self.assertEqual(list(lint.find_violations_in_line('Text("keyboard.shortcut.search")')), [])

    def test_button_with_role_still_scanned(self):
        # Button("Cancelar", role: .cancel) -- the literal is still in position.
        vs = list(lint.find_violations_in_line('Button("Cancelar", role: .cancel) {}'))
        self.assertEqual(len(vs), 1)
        self.assertEqual(vs[0][1], "Cancelar")

    def test_mytext_prefix_not_matched(self):
        # \b before the API name avoids matching MyText( / reButton( etc.
        self.assertEqual(list(lint.find_violations_in_line('MyText("Buscar")')), [])

    def test_violation_carries_column_literal_reason(self):
        vs = list(lint.find_violations_in_line('   Text("Cancelar")'))
        self.assertEqual(len(vs), 1)
        col, literal, reason = vs[0]
        self.assertEqual(literal, "Cancelar")
        self.assertTrue(reason)
        self.assertGreater(col, 0)


class TestIsExcluded(unittest.TestCase):
    """Test sources are out of scope ("scan ios/**/*.swift, excl tests")."""

    def test_solennis_tests_dir_excluded(self):
        p = Path("ios/SolennixTests/Foo.swift")
        self.assertTrue(lint.is_excluded(p))

    def test_package_tests_dir_excluded(self):
        self.assertTrue(lint.is_excluded(Path("ios/Packages/Foo/Tests/Bar.swift")))

    def test_tests_filename_excluded(self):
        self.assertTrue(lint.is_excluded(Path("ios/Solennix/SomeViewTests.swift")))

    def test_production_file_not_excluded(self):
        self.assertFalse(lint.is_excluded(Path("ios/Solennix/Keyboard/KeyboardShortcuts.swift")))
        self.assertFalse(lint.is_excluded(
            Path("ios/Packages/SolennixDesign/Sources/SolennixDesign/ViewModifiers.swift")))


class TestScanFile(unittest.TestCase):
    """End-to-end over a temp fixture: good lines pass, bad lines reported."""

    def _scan(self, content, name="Fixture.swift"):
        with tempfile.NamedTemporaryFile("w", suffix=name, delete=False,
                                         encoding="utf-8") as fh:
            fh.write(content)
            path = Path(fh.name)
        try:
            return list(lint.scan_file(path))
        finally:
            path.unlink()

    def test_clean_fixture_no_violations(self):
        content = (
            'struct V: View {\n'
            '    var body: some View {\n'
            '        Button("keyboard.shortcut.search") {}\n'
            '        Text("Error")\n'              # cognate, allowed
            '        Label("Dashboard", systemImage: "chart.bar")\n'
            '    }\n'
            '}\n'
        )
        self.assertEqual(self._scan(content), [])

    def test_dirty_fixture_reports_each_violation(self):
        content = (
            'Button("Buscar") {}\n'                       # flagged
            'Text("Dashboard")\n'                          # allowed
            '.navigationTitle("Ajustes")\n'               # flagged
            'Button("Error")\n'                            # cognate, allowed
        )
        vi = self._scan(content)
        lines = sorted(v[0] for v in vi)
        self.assertEqual(lines, [1, 3])


class TestPreviewSkip(unittest.TestCase):
    """``#Preview`` macro bodies are canvas demo copy, not shipped UI: their raw
    literals MUST be excluded so the lint does not flag preview demo buttons."""

    def _scan(self, content, name="Fixture.swift"):
        with tempfile.NamedTemporaryFile("w", suffix=name, delete=False,
                                         encoding="utf-8") as fh:
            fh.write(content)
            path = Path(fh.name)
        try:
            return list(lint.scan_file(path))
        finally:
            path.unlink()

    def test_flagged_literal_inside_preview_block_skipped(self):
        content = (
            'struct V: View {\n'
            '    var body: some View {\n'
            '        Button("Buscar") {}\n'          # flagged (outside preview)
            '    }\n'
            '}\n'
            '\n'
            '#Preview("Confirm Dialog") {\n'
            '    Button("Eliminar Evento") {}\n'      # raw, inside preview -> skipped
            '}\n'
        )
        vi = self._scan(content)
        self.assertEqual(len(vi), 1)
        self.assertEqual(vi[0][0], 3)               # only the outside literal

    def test_single_line_preview_skipped(self):
        content = '#Preview { Button("Cancelar") {} }\n'
        self.assertEqual(self._scan(content), [])

    def test_preview_with_traits_and_nested_braces_skipped(self):
        # Braces inside the preview body must not close the block early.
        content = (
            '#Preview("Demo", traits: .sizeThatFitsLayout) {\n'
            '    VStack {\n'
            '        Button("Ajustes") {}\n'
            '        Text("Cancelar")\n'
            '    }\n'
            '}\n'
            'Button("Buscar") {}\n'                  # outside preview -> flagged
        )
        vi = self._scan(content)
        self.assertEqual(len(vi), 1)
        self.assertEqual(vi[0][0], 7)

    def test_literal_after_preview_block_is_scanned(self):
        content = (
            '#Preview { Button("Cancelar") {} }\n'
            'Button("Buscar") {}\n'                  # outside preview -> flagged
        )
        vi = self._scan(content)
        self.assertEqual(len(vi), 1)
        self.assertEqual(vi[0][0], 2)


if __name__ == "__main__":
    unittest.main()

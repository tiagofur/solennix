import XCTest
@testable import SolennixFeatures

// MARK: - FeatureL10n.plural: Plural-Aware Resolution (PR1 of ios-l10n-polish)
//
// B-3a pluralization correctness. `FeatureL10n.plural(_:default:count:)` MUST
// route through `String.localizedStringWithFormat` so the catalog's
// `variations.plural` entries are honored per the system locale. Plain
// `String(format:)` — as used by ``FeatureL10n/format(_:_:_:)`` — silently
// ignores those variations, which is the root cause of the "1 eventos" bug.
//
// Fixture key `clients.list.events_count` already ships real `.xcstrings`
// plural variations for both `en` and `es` (one/other only — CLDR has no
// `zero` variant for either language). Using a real catalog key exercises the
// actual plural machinery rather than a synthetic fixture, and keeps PR1 free
// of catalog edits (the 33-key variation work is PR2).

final class FeatureL10nPluralTests: XCTestCase {

    private static let pluralKey = "clients.list.events_count"
    private static let pluralDefault = "%lld eventos"

    /// Strips the leading count integer (and any adjacent space) so a comparison
    /// isolates the plural WORD form (`one` vs `other`). This makes the routing
    /// assertions locale-independent — they hold under both `en` and `es`.
    private func pluralWordForm(_ value: String) -> String {
        String(value.drop(while: { $0.isNumber || $0.isWhitespace }))
    }

    // MARK: - count=1 selects the `one` form (THE routing gate)

    // count=1 MUST resolve the `one` plural form, which is DISTINCT from count=5's
    // `other` form. Against the buggy plain `String(format:)` route this FAILS:
    // count=1 would render the `other` word ("eventos"/"events") and match
    // count=5 — proving variations.plural were ignored. RED when the helper is
    // absent (compile error); GREEN once `plural` routes correctly.
    func testCountOne_selectsOneForm_distinctFromOther() {
        let one = FeatureL10n.plural(Self.pluralKey, Self.pluralDefault, count: 1)
        let other = FeatureL10n.plural(Self.pluralKey, Self.pluralDefault, count: 5)

        XCTAssertNotEqual(pluralWordForm(one), pluralWordForm(other),
                          "count=1 must resolve the `one` plural form; matching count=5 means "
                          + "variations.plural were ignored (plain String(format:) bug)")
    }

    // MARK: - count=0 / count=5 select the `other` form

    // `en` and `es` share CLDR `one`/`other` only (no `zero` variant), so 0
    // behaves like any plural count other than 1 — it uses `other`.
    func testCountZero_selectsOtherForm_likeCountFive() {
        let zero = FeatureL10n.plural(Self.pluralKey, Self.pluralDefault, count: 0)
        let other = FeatureL10n.plural(Self.pluralKey, Self.pluralDefault, count: 5)

        XCTAssertEqual(pluralWordForm(zero), pluralWordForm(other),
                       "count=0 must resolve the `other` plural form in en/es (no zero variant)")
    }

    // MARK: - count interpolation

    // The numeric count must still be substituted into the `%lld` slot of the
    // resolved template.
    func testCount_isInterpolatedIntoTemplate() {
        let result = FeatureL10n.plural(Self.pluralKey, Self.pluralDefault, count: 7)

        XCTAssertTrue(result.contains("7"),
                      "count must be interpolated into the format template's %lld slot")
    }

    // MARK: - fallback contract for unknown keys

    // Unknown keys must fall back to the provided defaultValue (the `value:`
    // contract inherited from ``text``) without crashing, so callers can rely on
    // a non-empty result even before a key ships in the catalog.
    func testUnknownKey_returnsNonEmptyWithoutCrashing() {
        let result = FeatureL10n.plural("__not_a_real_plural_key__", "%lld items", count: 1)

        XCTAssertFalse(result.isEmpty,
                       "plural must always return a non-empty string, even for unknown keys")
    }

    // MARK: - concrete English form (locale-guarded)

    // A readable, concrete check of the en one/other word forms. Skipped unless
    // the system locale is English so it never flakes under `es`.
    func testConcreteEnglishForms_whenLocaleIsEnglish() throws {
        try XCTSkipUnless(FeatureL10n.languageCode == "en",
                          "concrete en assertion only runs under the English system locale")

        XCTAssertEqual(FeatureL10n.plural(Self.pluralKey, Self.pluralDefault, count: 1), "1 event")
        XCTAssertEqual(FeatureL10n.plural(Self.pluralKey, Self.pluralDefault, count: 5), "5 events")
        XCTAssertEqual(FeatureL10n.plural(Self.pluralKey, Self.pluralDefault, count: 0), "0 events")
    }
}

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

// MARK: - count=1 Plural Sweep (PR3 of ios-l10n-polish)
//
// B-3a regression net. Iterates every package-catalog key that carries
// `variations.plural` and asserts that count=1 resolves the `one` form while
// count=5 resolves the `other` form. For keys whose noun inflects (one != other)
// the two word forms MUST differ; for invariant-noun keys (staff, more, stars…)
// one == other by design and the assertion confirms routing still produces a
// stable, non-empty result.
//
// Two layers:
//  1. `FeatureL10n.plural` against the real catalog variations (PR2) — guards
//     the catalog + helper plumbing (RED if a variation is stripped).
//  2. Accessor spot-checks — proves the actual call-site wrappers were migrated
//     from the `format` path (which silently renders `other` at count=1) to the
//     `plural` path. These are the genuine RED→GREEN proof of the PR3 migration:
//     under the pre-PR3 `FeatureL10n.format` route they returned the plural word
//     at count=1 and would FAIL here.
//
// Widget (`widget.*`) and app (`intent.*`) keys live in separate bundles (not
// reachable via `Bundle.module`/`FeatureL10n`); they are migrated at their call
// sites to native `String.localizedStringWithFormat` and verified by the grep
// gate rather than this sweep.

final class FeatureL10nPluralSweepTests: XCTestCase {

    /// Keys whose noun inflects in BOTH `en` and `es` (one != other under either
    /// locale). The word-form assertion is therefore locale-agnostic.
    ///
    /// Note: `events.detail.equipment.assigned_count` inflects ONLY in `es`
    /// (`equipo`/`equipos`) while `en` is invariant (`equipment`/`equipment`), so
    /// it cannot be asserted locale-agnostically and is covered by its call-site
    /// migration instead.
    private static let inflectingKeys: [(key: String, defaultValue: String)] = [
        ("calendar.a11y.day_with_events", "%lld eventos"),
        ("dashboard.event.people", "%lld personas"),
        ("events.detail.countdown.future", "FALTAN %d DÍAS"),
        ("events.detail.days_until_event", "Faltan %lld días para el evento"),
        ("events.detail.extras.count", "%d extras"),
        ("events.detail.products.count", "%d productos"),
        ("events.list.date.in_days", "In %lld days"),
        ("events.list.people_count", "%lld people"),
        ("events.photos.count", "%lld fotos"),
        ("inventory.in_days", "en %lld días"),
        ("inventory.low_stock_toggle_active", "activado, %lld artículos"),
        ("products.chart.a11y_label", "Demanda: %lld eventos próximos"),
        ("products.in_days", "en %lld días"),
        ("products.quantity_units", "%lld uds"),
        ("products.units_next_7_days", "%lld unidades en los próximos 7 días"),
        ("products.upcoming_events_count", "Próximos %lld eventos"),
        ("settings.contract.cancellation_days_value", "%d días"),
        ("settings.contract.preview.cancellation_days_value", "%d días antes"),
        ("clients.list.events_count", "%lld eventos")
    ]

    /// Invariant-noun keys: one == other by design (the noun does not inflect).
    /// count=1 and count=5 must therefore render the SAME word form.
    private static let invariantKeys: [(key: String, defaultValue: String)] = [
        ("calendar.overflow_more", "+%lld más"),
        ("events.detail.staff.assigned_count", "%d colaboradores asignados"),
        ("clients.events.history_count", "Historial de eventos (%lld)"),
        ("clients.detail.a11y.stat_events", "Eventos: %lld"),
        ("reviews.organizer.stars_label", "%lld de 5 estrellas"),
        ("search.results.more", "+ %lld más")
    ]

    /// Removes every digit so the comparison isolates the plural WORD form from
    /// the interpolated count. Locale-agnostic: holds under both `en` and `es`.
    private func wordForm(_ value: String) -> String {
        String(value.filter { !$0.isNumber })
    }

    // MARK: - Layer 1: catalog + helper plumbing

    func testSweep_inflectingKeys_countOneDistinctFromCountFive() {
        for (key, defaultValue) in Self.inflectingKeys {
            let one = FeatureL10n.plural(key, defaultValue, count: 1)
            let five = FeatureL10n.plural(key, defaultValue, count: 5)
            XCTAssertNotEqual(wordForm(one), wordForm(five),
                "inflecting key \"\(key)\": count=1 must resolve the `one` form (distinct "
                + "from count=5). Equal word forms mean variations.plural are being ignored.")
        }
    }

    func testSweep_invariantKeys_countOneMatchesCountFive() {
        for (key, defaultValue) in Self.invariantKeys {
            let one = FeatureL10n.plural(key, defaultValue, count: 1)
            let five = FeatureL10n.plural(key, defaultValue, count: 5)
            XCTAssertFalse(one.isEmpty, "invariant key \"\(key)\" must render non-empty at count=1")
            XCTAssertEqual(wordForm(one), wordForm(five),
                "invariant key \"\(key)\": one == other by design; differing forms signal a catalog typo.")
        }
    }

    // MARK: - Layer 2: migrated accessor spot-checks (RED under `format`, GREEN under `plural`)

    func testMigratedAccessors_renderSingularWordAtCountOne() {
        XCTAssertNotEqual(wordForm(ProductStrings.inDays(1)), wordForm(ProductStrings.inDays(5)))
        XCTAssertNotEqual(wordForm(ProductStrings.quantityUnits(1)), wordForm(ProductStrings.quantityUnits(5)))
        XCTAssertNotEqual(wordForm(ProductStrings.unitsNext7Days(1)), wordForm(ProductStrings.unitsNext7Days(5)))
        XCTAssertNotEqual(wordForm(CalendarStrings.a11yDayWithEvents(1)), wordForm(CalendarStrings.a11yDayWithEvents(5)))
        XCTAssertNotEqual(wordForm(InventoryStrings.inDays(1)), wordForm(InventoryStrings.inDays(5)))
    }

    // MARK: - Double-plural sibling (products.quantity_for_people)
    //
    // PR3 splits the flat key into 4 sibling keys (one_one/one_other/other_one/
    // other_other), mirroring products.demand_summary.*. count=1 on EITHER axis
    // must render the singular noun for that axis; both >1 renders the plural.

    func testQuantityForPeople_bothPlural_baselineMatchesFlatKey() {
        // (5,5) and (100,50) both resolve other_other → identical word form.
        XCTAssertEqual(
            wordForm(ProductStrings.quantityForPeople(quantity: 5, people: 5)),
            wordForm(ProductStrings.quantityForPeople(quantity: 100, people: 50))
        )
    }

    func testQuantityForPeople_quantityOne_rendersSingularUnit() {
        XCTAssertNotEqual(
            wordForm(ProductStrings.quantityForPeople(quantity: 1, people: 5)),
            wordForm(ProductStrings.quantityForPeople(quantity: 5, people: 5))
        )
    }

    func testQuantityForPeople_peopleOne_rendersSingularPeople() {
        XCTAssertNotEqual(
            wordForm(ProductStrings.quantityForPeople(quantity: 5, people: 1)),
            wordForm(ProductStrings.quantityForPeople(quantity: 5, people: 5))
        )
    }

    func testQuantityForPeople_bothOne_rendersBothSingular() {
        let oneOne = ProductStrings.quantityForPeople(quantity: 1, people: 1)
        // Both nouns singular: distinct from the all-plural form.
        XCTAssertNotEqual(wordForm(oneOne), wordForm(ProductStrings.quantityForPeople(quantity: 5, people: 5)))
        // And the count is still interpolated.
        XCTAssertTrue(oneOne.contains("1"))
    }
}

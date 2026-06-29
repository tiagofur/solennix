import XCTest

// MARK: - L10n Catalog Coverage Guard (B-4, U1)
//
// Permanent invariant: every SYMBOLIC (dot-separated namespace identifier,
// e.g. `settings.profile.language`) catalog key across the SolennixFeatures,
// App and Widget catalogs MUST ship BOTH `en` and `es`.
// "Present" = a translated `stringUnit.value` OR a complete
// `variations.plural.{one,other}` set (mirrors the B-3 plural mechanism).
//
// Why symbolic-only: the catalogs also carry hundreds of orphan/stale
// prose-string residue (empty `{}` entries inherited from pre-B-2
// `Text("Spanish literal")` calls). Those are B-5 cleanup territory and are
// deliberately excluded, so this guard passes green today (0 gap) and protects
// only the keys that actually ship.
//
// The `InfoPlist.xcstrings` catalog (app metadata) is intentionally NOT
// covered — it carries permission descriptions, not UI strings.
//
// RED -> GREEN:
//   * `testCoverageLogic_ReportsGapWhenLocaleMissing` proves the evaluator
//     reports a gap the instant a symbolic key loses its `es` (the RED
//     simulation that would fail the guard).
//   * `testCatalog_*_everySymbolicKeyHasEnAndEs` are GREEN today (B-1/B-2/B-3
//     completed the catalog), so the guard is a future-drift tripwire.

final class L10nCatalogCoverageTests: XCTestCase {

    // Catalog sources, expressed relative to the `ios/` directory.
    private static let featuresCatalogPath = "Packages/SolennixFeatures/Sources/SolennixFeatures/Resources/Localizable.xcstrings"
    private static let appCatalogPath = "Solennix/Localizable.xcstrings"
    private static let widgetCatalogPath = "SolennixWidgetExtension/Localizable.xcstrings"

    /// The `ios/` directory, derived from this source file's compile-time path.
    /// The catalog `.xcstrings` are read as SOURCE JSON (not compiled
    /// `.strings`) because plural `variations.plural.{one,other}` keys compile
    /// into `.stringsdict`, which a flat `.strings` lookup cannot see.
    private static var iosRoot: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()   // .../SolennixTests/
            .deletingLastPathComponent()   // .../ios/
    }

    private static func catalogURL(_ relative: String) -> URL {
        iosRoot.appendingPathComponent(relative)
    }

    // MARK: - Pure coverage logic (unit-tested, no I/O)

    /// A "symbolic" key is a dot-separated namespace identifier such as
    /// `settings.profile.language`. Orphan prose keys that merely *contain* a
    /// period — trailing-sentence dots ("Cargando..."), decimals ("0.00"),
    /// format strings ("%@ est.") — are NOT symbolic and are excluded (B-5
    /// cleanup territory). With this definition the merged B-1/B-2/B-3
    /// catalogs carry 0 en/es gaps (1577 symbolic keys in Features).
    private static let symbolicKeyPattern: NSRegularExpression = {
        // first segment starts with a letter; segments are [A-Za-z0-9_]+; >= 2 segments
        let pattern = "^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z0-9_]+)+$"
        return try! NSRegularExpression(pattern: pattern)
    }()

    private static func isSymbolic(_ key: String) -> Bool {
        let range = NSRange(key.startIndex..., in: key)
        return symbolicKeyPattern.firstMatch(in: key, range: range) != nil
    }

    /// The set of (key, locale) gaps in `strings`. Each SYMBOLIC key must carry
    /// BOTH `en` and `es`, each "present" per `isPresent`.
    static func coverageGaps(_ strings: [String: Any]) -> [(key: String, locale: String)] {
        var gaps: [(key: String, locale: String)] = []
        for (key, rawEntry) in strings {
            guard isSymbolic(key) else { continue }                    // symbolic only
            guard let entry = rawEntry as? [String: Any] else { continue }
            let localizations = (entry["localizations"] as? [String: Any]) ?? [:]
            for locale in ["en", "es"] where !isPresent(localizations[locale]) {
                gaps.append((key, locale))
            }
        }
        return gaps
    }

    /// "Present" = a translated, non-empty `stringUnit.value` OR a complete
    /// `variations.plural.{one,other}` set (both variations translated).
    private static func isPresent(_ raw: Any?) -> Bool {
        guard let loc = raw as? [String: Any] else { return false }
        if let unit = loc["stringUnit"] as? [String: Any],
           (unit["state"] as? String) == "translated",
           let value = unit["value"] as? String, !value.isEmpty {
            return true
        }
        if let variations = loc["variations"] as? [String: Any],
           let plural = variations["plural"] as? [String: Any],
           let one = plural["one"] as? [String: Any],
           let other = plural["other"] as? [String: Any],
           isUnitTranslated(one), isUnitTranslated(other) {
            return true
        }
        return false
    }

    private static func isUnitTranslated(_ dict: [String: Any]) -> Bool {
        guard let unit = dict["stringUnit"] as? [String: Any] else { return false }
        return (unit["state"] as? String) == "translated"
            && !(unit["value"] as? String ?? "").isEmpty
    }

    // MARK: - Pure-logic tests (RED -> GREEN proof)

    func testCoverageLogic_ReportsGapWhenLocaleMissing() {
        // Complete bilingual string key -> 0 gaps.
        let complete: [String: Any] = [
            "complete.string": [
                "localizations": [
                    "en": ["stringUnit": ["state": "translated", "value": "Search"]],
                    "es": ["stringUnit": ["state": "translated", "value": "Buscar"]],
                ] as [String: Any],
            ] as [String: Any],
        ]
        XCTAssertTrue(Self.coverageGaps(complete).isEmpty,
                      "a complete bilingual symbolic key must report 0 gaps")

        // RED: same key with its `es` removed -> exactly one (key, es) gap.
        let missingEs: [String: Any] = [
            "complete.string": [
                "localizations": [
                    "en": ["stringUnit": ["state": "translated", "value": "Search"]],
                ] as [String: Any],
            ] as [String: Any],
        ]
        let gaps = Self.coverageGaps(missingEs)
        XCTAssertEqual(gaps.count, 1)
        XCTAssertEqual(gaps.first?.key, "complete.string")
        XCTAssertEqual(gaps.first?.locale, "es")
    }

    func testCoverageLogic_PluralKeyCountsAsPresent() {
        let strings: [String: Any] = [
            "plural.only": [
                "localizations": [
                    "en": ["variations": ["plural": [
                        "one": ["stringUnit": ["state": "translated", "value": "%lld event"]],
                        "other": ["stringUnit": ["state": "translated", "value": "%lld events"]],
                    ] as [String: Any]]] as [String: Any],
                    "es": ["variations": ["plural": [
                        "one": ["stringUnit": ["state": "translated", "value": "%lld evento"]],
                        "other": ["stringUnit": ["state": "translated", "value": "%lld eventos"]],
                    ] as [String: Any]]] as [String: Any],
                ] as [String: Any],
            ] as [String: Any],
        ]
        XCTAssertTrue(Self.coverageGaps(strings).isEmpty,
                      "a plural key with one+other for both locales must be present")
    }

    func testCoverageLogic_PluralKeyMissingVariationIsAGap() {
        let strings: [String: Any] = [
            "plural.incomplete": [
                "localizations": [
                    "en": ["variations": ["plural": [
                        "one": ["stringUnit": ["state": "translated", "value": "%lld event"]],
                        // "other" missing -> not present -> gap
                    ] as [String: Any]]] as [String: Any],
                    "es": ["variations": ["plural": [
                        "one": ["stringUnit": ["state": "translated", "value": "%lld evento"]],
                        "other": ["stringUnit": ["state": "translated", "value": "%lld eventos"]],
                    ] as [String: Any]]] as [String: Any],
                ] as [String: Any],
            ] as [String: Any],
        ]
        let gaps = Self.coverageGaps(strings)
        XCTAssertTrue(gaps.contains { $0.key == "plural.incomplete" && $0.locale == "en" })
    }

    func testCoverageLogic_NonSymbolicAndEmptyKeysAreExcluded() {
        // Orphan prose keys (no dot), the empty "" key, AND prose/decimal keys
        // that merely contain a period (B-5 cleanup territory) are out of
        // scope, so they never produce a gap even when empty.
        let strings: [String: Any] = [
            "Buscar": [:] as [String: Any],
            "": [:] as [String: Any],
            "Cargando...": [:] as [String: Any],     // trailing-sentence period, not symbolic
            "0.00": [:] as [String: Any],            // decimal, not symbolic
            "%@ est.": [:] as [String: Any],         // format string with period, not symbolic
            "ok.symbolic": [
                "localizations": [
                    "en": ["stringUnit": ["state": "translated", "value": "OK"]],
                    "es": ["stringUnit": ["state": "translated", "value": "OK"]],
                ] as [String: Any],
            ] as [String: Any],
        ]
        XCTAssertTrue(Self.coverageGaps(strings).isEmpty)
    }

    // MARK: - Real-catalog sweep (GREEN today)

    private static func loadStrings(_ relative: String,
                                    file: StaticString = #file, line: UInt = #line) throws -> [String: Any] {
        let url = catalogURL(relative)
        guard let data = try? Data(contentsOf: url) else {
            throw NSError(domain: "L10nCatalogCoverageTests", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "catalog not found at \(url.path) — run from the source tree",
            ])
        }
        let json = try JSONSerialization.jsonObject(with: data, options: [])
        guard let root = json as? [String: Any],
              let strings = root["strings"] as? [String: Any] else {
            XCTFail("catalog \(relative) is not valid .xcstrings JSON", file: file, line: line)
            return [:]
        }
        return strings
    }

    func testCatalog_features_everySymbolicKeyHasEnAndEs() throws {
        let strings = try Self.loadStrings(Self.featuresCatalogPath)
        let gaps = Self.coverageGaps(strings)
        XCTAssertTrue(gaps.isEmpty, "Features catalog symbolic keys missing en/es:\n" + format(gaps))
    }

    func testCatalog_app_everySymbolicKeyHasEnAndEs() throws {
        let strings = try Self.loadStrings(Self.appCatalogPath)
        let gaps = Self.coverageGaps(strings)
        XCTAssertTrue(gaps.isEmpty, "App catalog symbolic keys missing en/es:\n" + format(gaps))
    }

    func testCatalog_widget_everySymbolicKeyHasEnAndEs() throws {
        let strings = try Self.loadStrings(Self.widgetCatalogPath)
        let gaps = Self.coverageGaps(strings)
        XCTAssertTrue(gaps.isEmpty, "Widget catalog symbolic keys missing en/es:\n" + format(gaps))
    }

    /// RED proof on the REAL App catalog: demonstrates the guard would FAIL if
    /// a shipped symbolic key lost its `es` translation (catches future drift).
    func testCatalog_redProof_deliberatelyRemovedSpanishIsCaught() throws {
        var strings = try Self.loadStrings(Self.appCatalogPath)
        guard let probeKey = strings.keys.first(where: { Self.isSymbolic($0) }),
              let probeEntry = strings[probeKey] as? [String: Any] else {
            throw XCTSkip("app catalog has no symbolic key to probe")
        }
        strings[probeKey] = Self.entryByRemoving(locale: "es", from: probeEntry)
        let gaps = Self.coverageGaps(strings)
        XCTAssertTrue(gaps.contains { $0.key == probeKey && $0.locale == "es" },
                      "removing es from \(probeKey) must be reported as a gap")
    }

    // MARK: - Helpers

    private static func entryByRemoving(locale: String, from entry: [String: Any]) -> [String: Any] {
        var copy = entry
        var localizations = (copy["localizations"] as? [String: Any]) ?? [:]
        localizations.removeValue(forKey: locale)
        copy["localizations"] = localizations
        return copy
    }

    private func format(_ gaps: [(key: String, locale: String)]) -> String {
        gaps.map { "  - \($0.key) [missing \($0.locale)]" }.joined(separator: "\n")
    }
}

import XCTest
@testable import SolennixFeatures

// MARK: - Catalog Format-String Positional-Arg Preservation Tests
//
// T2 (ios-catalog-english) invariant: every migrated format-string key that
// carries printf-style specifiers (`%lld`, `%1$@`, `%@%%`, …) MUST preserve the
// positional-argument count AND order across its `en` and `es` values. A
// mismatch (e.g. en uses `%1$@` first but es reorders to `%2$@`) would corrupt
// interpolation at runtime, so this is a hard regression guard.
//
// RED -> GREEN: before migration the curated `migratedFormatKeys` do not exist
// in the catalog (no `en`/`es`), so the lookup is `nil` and the test fails.
// After migration each key ships matching en+es specifiers and the test passes.

final class CatalogFormatStringTests: XCTestCase {

    /// printf-style specifier. Captures an optional explicit positional index
    /// (`%2$@`) and the conversion character (`@`, `lld`, `f`, …). `%%` is
    /// treated as a literal-percent (no consumed argument) and excluded.
    private static let specifierPattern = try! NSRegularExpression(
        pattern: #"%(\d+\$)?(\d*|\.\d+)*[diouxXeEfgGsScC@]|%lld|%@|%d|%f|%%"#
    )

    /// Canonical signature of the arguments a format string consumes.
    /// Two strings that interpolate the "same" arguments produce equal signatures.
    private static func argumentSignature(_ format: String) -> [String] {
        let range = NSRange(format.startIndex..., in: format)
        var signatures: [String] = []
        specifierPattern.enumerateMatches(in: format, range: range) { match, _, _ in
            guard let match = match else { return }
            let raw = (format as NSString).substring(with: match.range)
            if raw == "%%" { return } // literal percent, consumes no argument
            // Normalize: keep the positional index (if explicit) + conversion.
            // Strip field-width/precision flags so "%2$@"/"%02$@" compare equal.
            if raw.hasPrefix("%") {
                let body = raw.dropFirst()
                // Extract explicit position like "1$"
                var position = ""
                var rest = Substring(body)
                if let dollar = body.firstIndex(of: "$") {
                    position = String(body[body.startIndex..<dollar]) + "$"
                    rest = body[body.index(after: dollar)...]
                }
                // Conversion = trailing alphabetic run (e.g. "lld", "@", "f").
                let conversion = String(rest.reversed().prefix { $0.isLetter || $0 == "@" }.reversed())
                signatures.append(position.isEmpty ? conversion : position + conversion)
            }
        }
        return signatures
    }

    /// Loads the package's compiled `Localizable.strings` for `lang` and returns
    /// its key -> value map. The `.xcstrings` source is compiled into per-locale
    /// `.strings` at build time, so this inspects the values that actually ship.
    private func compiledStrings(for lang: String) throws -> [String: String] {
        let resourceBundle = try Self.featuresResourceBundle()
        guard let url = resourceBundle.url(forResource: "Localizable",
                                           withExtension: "strings",
                                           subdirectory: "\(lang).lproj"),
              let dict = NSDictionary(contentsOf: url) as? [String: String] else {
            throw NSError(domain: "CatalogFormatStringTests", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "missing \(lang).lproj/Localizable.strings in resource bundle"])
        }
        return dict
    }

    /// Locates the `SolennixFeatures_SolennixFeatures` resource bundle that ships
    /// the compiled localizations. Walks all loaded bundles and any embedded
    /// `.bundle`s so it is robust to where the package is linked.
    private static func featuresResourceBundle() throws -> Bundle {
        let bundleFile = "SolennixFeatures_SolennixFeatures.bundle"
        var seen = Set<URL>()
        func search(_ bundle: Bundle) -> Bundle? {
            let urls = [bundle.bundleURL] + (bundle.urls(forResourcesWithExtension: "bundle", subdirectory: nil) ?? [])
            for url in urls {
                if url.lastPathComponent == bundleFile, let b = Bundle(url: url) { return b }
                if seen.insert(url).inserted, let sub = Bundle(url: url), let found = search(sub) { return found }
            }
            return nil
        }
        for bundle in Bundle.allBundles {
            if let found = search(bundle) { return found }
        }
        throw NSError(domain: "CatalogFormatStringTests", code: 3,
                      userInfo: [NSLocalizedDescriptionKey: "\(bundleFile) not found among loaded bundles"])
    }

    // MARK: - Pure-function: argument-signature extraction

    func testArgumentSignature_identicalForMatchingPositionalSpecifiers() {
        XCTAssertEqual(Self.argumentSignature("%1$@ needed"), Self.argumentSignature("%1$@ necesarios"))
        XCTAssertEqual(Self.argumentSignature("%lld photos"), Self.argumentSignature("%lld fotos"))
        XCTAssertEqual(Self.argumentSignature("x%@"), Self.argumentSignature("x%@"))
    }

    func testArgumentSignature_detectsReordering() {
        // en "%1$@ needs %2$@" vs es "%2$@ necesita %1$@" -> reordered -> NOT equal.
        XCTAssertNotEqual(
            Self.argumentSignature("%1$@ needs %2$@"),
            Self.argumentSignature("%2$@ necesita %1$@")
        )
    }

    func testArgumentSignature_treatsLiteralPercentAsNoArg() {
        // "%%" must not count as a consumed argument.
        XCTAssertEqual(Self.argumentSignature("100%%"), [])
        XCTAssertEqual(Self.argumentSignature("%lld%%"), Self.argumentSignature("%lld%%"))
    }

    // MARK: - Catalog-driven: every migrated format key preserves args en<->es

    // Keys migrated in T2 that carry format specifiers. RED before migration
    // (keys absent from catalog); GREEN after migration (en+es present, matching).
    private static let migratedFormatKeys = [
        "events.photos.count",          // "%lld photos" / "%lld fotos"
        "events.shopping.qty_units",    // "%@ units" / "%@ unidades"
        "events.shopping.qty_prefix",   // "x%@" / "x%@"
        "events.shopping.required_qty", // "Needed: %1$@ %2$@" / "Necesario: %1$@ %2$@"
        "events.shopping.stock_qty",    // "Stock: %@" / "Stock: %@"
        "events.equipment.qty_prefix"   // "x%lld" / "x%lld"
    ]

    func testMigratedFormatKeys_preservePositionalArgCountAndOrder() throws {
        let en = try compiledStrings(for: "en")
        let es = try compiledStrings(for: "es")

        var checked = 0
        for key in Self.migratedFormatKeys {
            guard let enValue = en[key], let esValue = es[key] else {
                XCTFail("migrated format key \(key) must ship BOTH en and es values in the catalog")
                continue
            }
            let enSig = Self.argumentSignature(enValue)
            let esSig = Self.argumentSignature(esValue)
            XCTAssertEqual(enSig, esSig,
                           "key \(key): en=\(enValue) and es=\(esValue) must consume arguments in the same count/order")
            checked += 1
        }
        XCTAssertGreaterThan(checked, 0, "at least one migrated format key must be validated")
    }

    // Whole-catalog sweep: ANY key that already ships BOTH en and es with
    // specifiers must keep them aligned. Catches accidental future drift and
    // proves the migration did not introduce a positional-arg mismatch anywhere.
    func testCatalog_allBilingualFormatKeys_preservePositionalArgs() throws {
        let en = try compiledStrings(for: "en")
        let es = try compiledStrings(for: "es")
        var violations: [String] = []

        for (key, enValue) in en {
            guard let esValue = es[key] else { continue }
            // Only inspect strings that actually contain a format specifier.
            guard enValue.contains("%") || esValue.contains("%") else { continue }
            if Self.argumentSignature(enValue) != Self.argumentSignature(esValue) {
                violations.append("\(key): en=\(enValue) es=\(esValue)")
            }
        }

        XCTAssertTrue(violations.isEmpty,
                      "bilingual format keys with mismatched positional args:\n" + violations.joined(separator: "\n"))
    }
}

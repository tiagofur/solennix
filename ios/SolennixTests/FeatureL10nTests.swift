import XCTest
@testable import SolennixFeatures

// MARK: - FeatureL10n System-Locale Resolution Tests
//
// WU1 (ios-system-language) invariant: FeatureL10n resolves against the SYSTEM
// locale. The legacy `preferredLocale` UserDefaults override MUST have no
// effect on any accessor. "Follows the system locale" itself cannot be flipped
// in-process, so these tests assert the observable, deterministic consequence:
// the override is ignored.

final class FeatureL10nTests: XCTestCase {

    override func tearDown() {
        super.tearDown()
        UserDefaults.standard.removeObject(forKey: "preferredLocale")
    }

    // MARK: - Override Independence (RED -> GREEN for WU1)

    // languageCode must reflect the system locale and be INVARIANT to writes of
    // the legacy `preferredLocale` override.
    //
    // Against the pre-WU1 code this fails: setting preferredLocale="en" yields
    // languageCode == "en", then "zh" yields "zh" -> first != second (RED).
    // Against WU1 code both reads return the same system-driven code (GREEN).
    func testLanguageCode_isInvariantToPreferredLocaleOverride() {
        UserDefaults.standard.set("en", forKey: "preferredLocale")
        let first = FeatureL10n.languageCode

        UserDefaults.standard.set("zh", forKey: "preferredLocale")
        let second = FeatureL10n.languageCode

        XCTAssertEqual(first, second,
                       "languageCode must reflect the system locale, not the preferredLocale override")
        XCTAssertFalse(second.isEmpty, "languageCode must always resolve to a non-empty code")
    }

    // Triangulation: the same override-independence holds for the `locale`
    // accessor (a distinct code path that previously returned
    // Locale(identifier: languageCode)).
    func testLocale_isInvariantToPreferredLocaleOverride() {
        UserDefaults.standard.set("en", forKey: "preferredLocale")
        let first = FeatureL10n.locale

        UserDefaults.standard.set("zh", forKey: "preferredLocale")
        let second = FeatureL10n.locale

        XCTAssertEqual(first, second,
                       "locale must reflect the system locale, not the preferredLocale override")
    }

    // MARK: - Bundle.module Resolution (approval / regression guards)

    // A real catalog key ("products.title") must resolve via Bundle.module to a
    // non-empty catalog value, never the default fallback passed by the caller.
    // Locale-independent: the key ships in Base/es so it always resolves.
    func testText_resolvesKnownKeyFromCatalog() {
        let resolved = FeatureL10n.text("products.title", "__FALLBACK__")

        XCTAssertFalse(resolved.isEmpty)
        XCTAssertNotEqual(resolved, "__FALLBACK__",
                          "known catalog key must resolve from the catalog, not return the caller default")
    }

    // Triangulation for text(): an unknown key falls back to the provided
    // default value (documents the value:-contract of localizedString).
    func testText_returnsDefaultForUnknownKey() {
        let value = FeatureL10n.text("__definitely_not_a_real_key__", "SentinelDefault")

        XCTAssertEqual(value, "SentinelDefault")
    }
}

import Foundation

/// Resolves localized feature strings against the SYSTEM locale.
///
/// Localization follows the device language and region — there is no longer a
/// runtime language override. ``locale`` is region-aware, so date/number
/// formatting also tracks the system locale. Business-currency formatting that
/// must NOT follow the user locale (e.g. MXN) is pinned separately in the
/// formatting layer.
public enum FeatureL10n {
    /// Language code of the system locale (e.g. `"es"` / `"en"`).
    /// Falls back to `"es"` — the catalog/source language — when unavailable.
    public static var languageCode: String {
        Locale.autoupdatingCurrent.language.languageCode?.identifier ?? "es"
    }

    /// The system locale (region-aware). Drives date/number formatting.
    public static var locale: Locale {
        Locale.autoupdatingCurrent
    }

    /// Returns a localized string for `key`, resolving via the module bundle for
    /// the system locale. `defaultValue` is returned when `key` has no
    /// translation in the catalog.
    public static func text(_ key: String, _ defaultValue: String) -> String {
        Bundle.module.localizedString(forKey: key, value: defaultValue, table: "Localizable")
    }

    /// Returns a localized, formatted string for `key`, interpolating `arguments`
    /// using the system locale.
    public static func format(_ key: String, _ defaultValue: String, _ arguments: CVarArg...) -> String {
        let template = text(key, defaultValue)
        return String(format: template, locale: locale, arguments: arguments)
    }
}

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

    /// Returns a localized, **plural-aware** string for `key`, where `count`
    /// drives CLDR plural selection against the key's `.xcstrings`
    /// `variations.plural` (e.g. `one` for 1, `other` for 0 and 5 in en/es).
    ///
    /// This is the plural counterpart of ``format``. Unlike ``format`` — which
    /// routes through plain `String(format:)` and therefore **silently ignores**
    /// `variations.plural` (the root cause of the "1 eventos" bug) — this method
    /// resolves the template from the module bundle and formats it through
    /// `String.localizedStringWithFormat`, which honors plural variations per
    /// the system locale.
    ///
    /// `count` is both the plural-discriminating argument (CLDR rules select the
    /// `one`/`other` form from it) and the value substituted into the template's
    /// `%lld` slot. Call sites that need more than one interpolated count
    /// (nested double-plurals) should format those templates directly with
    /// `String.localizedStringWithFormat`.
    public static func plural(_ key: String, _ defaultValue: String, count: Int) -> String {
        let template = text(key, defaultValue)
        return String.localizedStringWithFormat(template, count)
    }
}

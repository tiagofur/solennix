import Foundation

// MARK: - NetL10n

/// Resolves user-visible strings in the `SolennixNetwork` package against its
/// own `.xcstrings` catalog (`Resources/Localizable.xcstrings`) via
/// `Bundle.module`.
///
/// Network-layer types (`LocalizedError` cases, manager status messages) own
/// their copy here — the same pattern Foundation uses for its own errors — so
/// they never leak a hardcoded Spanish literal to English-profile users.
///
/// Mirrors the `FeatureL10n` shape used by `SolennixFeatures`.
enum NetL10n {

    /// Returns the localized string for `key`, falling back to `defaultValue`
    /// (and then the key itself) when the catalog has no entry.
    static func text(_ key: String, _ defaultValue: String) -> String {
        Bundle.module.localizedString(forKey: key, value: defaultValue, table: "Localizable")
    }

    /// Returns the localized format string for `key` substituted with the
    /// given arguments via `String.localizedStringWithFormat`.
    static func format(_ key: String, _ defaultValue: String, _ args: CVarArg...) -> String {
        let template = Bundle.module.localizedString(forKey: key, value: defaultValue, table: "Localizable")
        return String.localizedStringWithFormat(template, args)
    }
}

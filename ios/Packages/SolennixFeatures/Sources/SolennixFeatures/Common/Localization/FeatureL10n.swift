import Foundation

public enum FeatureL10n {
    public static var languageCode: String {
        if let stored = UserDefaults.standard.string(forKey: "preferredLocale")?.split(separator: "-").first,
           !stored.isEmpty {
            return String(stored)
        }

        if let current = Locale.autoupdatingCurrent.language.languageCode?.identifier,
           !current.isEmpty {
            return current
        }

        return "es"
    }

    public static var locale: Locale {
        Locale(identifier: languageCode)
    }

    /// Returns a localized string for `key` using the user's chosen language.
    ///
    /// `String(localized:bundle:locale:)` does NOT respect the `locale` parameter
    /// for language selection — it uses the system's preferred localization.
    /// The only way to force a specific language at runtime is to load the
    /// language-specific `.lproj` sub-bundle explicitly.
    public static func text(_ key: String, _ defaultValue: String) -> String {
        let code = languageCode
        if let lp = Bundle.module.path(forResource: code, ofType: "lproj"),
           let langBundle = Bundle(path: lp) {
            let result = langBundle.localizedString(forKey: key, value: defaultValue, table: "Localizable")
            return result
        }
        // Fallback: system-chosen localization from the module bundle
        let result = Bundle.module.localizedString(forKey: key, value: defaultValue, table: "Localizable")
        return result
    }

    public static func format(_ key: String, _ defaultValue: String, _ arguments: CVarArg...) -> String {
        let template = text(key, defaultValue)
        return String(format: template, locale: locale, arguments: arguments)
    }
}

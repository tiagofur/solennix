import Foundation
import SolennixNetwork
import SolennixFeatures

// MARK: - Backend payload
//
// Identical JSON shape to the retired in-app picker path: `{"preferredLanguage":"es"}`.
// Replicated here (instead of importing the now-deleted `SettingsViewModel`
// version) so `LanguageReporter` stays a self-contained, app-layer type. Sending the
// LANGUAGE CODE ("es"/"en") — NOT the full locale ("es-MX") — keeps the backend
// contract identical to today; the fine locale is only used internally for MXN
// currency formatting (see WU2 / DashboardFormatting).
private struct ProfileUpdatePayload: Encodable {
    let preferredLanguage: String
    let defaultCurrency: String
}

// MARK: - Persistence abstraction (throttle store)

/// Read/write window over the language and currency values used to throttle reports.
/// `@objc protocol`-free; the production adapter wraps `UserDefaults`.
protocol LanguageReportStoring: AnyObject {
    var lastReportedLanguage: String? { get set }
    var lastReportedCurrency: String? { get set }
}

/// `UserDefaults`-backed adapter. Defaults to the standard suite (the same store
/// `SolennixApp` uses for other per-device keys).
final class UserDefaultsLanguageStore: LanguageReportStoring {
    static let key = "lastReportedLanguage"
    static let currencyKey = "lastReportedCurrency"

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    var lastReportedLanguage: String? {
        get { defaults.string(forKey: Self.key) }
        set {
            if let newValue {
                defaults.set(newValue, forKey: Self.key)
            } else {
                defaults.removeObject(forKey: Self.key)
            }
        }
    }

    var lastReportedCurrency: String? {
        get { defaults.string(forKey: Self.currencyKey) }
        set {
            if let newValue {
                defaults.set(newValue, forKey: Self.currencyKey)
            } else {
                defaults.removeObject(forKey: Self.currencyKey)
            }
        }
    }
}

// MARK: - LanguageReporter
//
// Reports the device's SYSTEM language to the backend (`preferredLanguage`) and suggested currency.
// Replaces the in-app picker's report path (removed in WU3). After WU3 the app had
// no language-report path at all; this re-adds it on a throttled, launch/locale-change
// schedule — without flashing the Settings spinner on launch (the reason the old
// `SettingsViewModel.updatePreferredLanguage` is NOT reused).
//
// Throttle: `reportIfNeeded()` compares the current language code against the last
// reported value (persisted in `UserDefaults`). On a match it is a no-op. Only on a
// change does it call the backend, and only on success does it persist the new value
// (a failed report keeps the old value so the next fire retries).
final class LanguageReporter {

    private let store: LanguageReportStoring
    private let currentLanguageProvider: () -> String
    private let currentCurrencyProvider: () -> String
    private let report: (String, String) async throws -> Void

    /// Testable initializer: inject the store, providers, and backend call
    init(
        store: LanguageReportStoring,
        currentLanguageProvider: @escaping () -> String,
        currentCurrencyProvider: @escaping () -> String,
        report: @escaping (String, String) async throws -> Void
    ) {
        self.store = store
        self.currentLanguageProvider = currentLanguageProvider
        self.currentCurrencyProvider = currentCurrencyProvider
        self.report = report
    }

    /// Production convenience: wires the real `UserDefaults` store, the system language
    /// CODE reader, and the backend call.
    convenience init(authManager: AuthManager) {
        self.init(
            store: UserDefaultsLanguageStore(),
            currentLanguageProvider: {
                Locale.current.language.languageCode?.identifier ?? "es"
            },
            currentCurrencyProvider: {
                Locale.current.currency?.identifier ?? "MXN"
            },
            report: { lang, currency in
                try await authManager.updateProfile(
                    data: ProfileUpdatePayload(preferredLanguage: lang, defaultCurrency: currency)
                )
            }
        )
    }

    /// Reports the current system language and currency to the backend IF they differ from the last
    /// reported values.
    ///
    /// - Returns: `true` when a report was made; `false` when throttled (no change) or
    ///   when the backend call failed. On success the new value is persisted so
    ///   subsequent fires are throttled; on failure the old value is kept so the next
    ///   fire retries.
    @discardableResult
    func reportIfNeeded() async -> Bool {
        let currentLang = currentLanguageProvider()
        let currentCurrency = currentCurrencyProvider()
        guard currentLang != store.lastReportedLanguage || currentCurrency != store.lastReportedCurrency else { return false }
        do {
            try await report(currentLang, currentCurrency)
            store.lastReportedLanguage = currentLang
            store.lastReportedCurrency = currentCurrency
            return true
        } catch {
            // Best-effort diagnostics. Non-fatal: a missed report simply retries on the
            // next fire (launch / authState change / locale change).
            SentryHelper.capture(error: error, context: "report_preferred_language")
            return false
        }
    }
}

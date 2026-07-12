import Foundation

// MARK: - App Group Constants
//
// Extracted from SolennixWidgets.swift so they carry no `@main` and can be
// compiled directly into the widget-extension unit-test target (an app-extension
// product is not linkable by a test bundle, so the data layer is tested by
// compiling its sources rather than `@testable import`-ing the extension).

enum AppGroup {
    static let identifier = "group.com.solennix.app"

    static let userDefaults: UserDefaults = {
        guard let suite = UserDefaults(suiteName: identifier) else {
            fatalError("App Group '\(identifier)' not configured in widget extension. Enable it in Signing & Capabilities.")
        }
        return suite
    }()
}

// MARK: - Shared Data Keys

enum WidgetDataKey {
    static let upcomingEvents = "widget_upcoming_events"
    static let kpis = "widget_kpis"
    static let lastUpdated = "widget_last_updated"
    static let userPlan = "widget_user_plan"
    static let completedEvents = "completed_events"
    /// Auth-state signal (mirrors `WidgetKey.authState` in the app target).
    /// Lets the extension distinguish signed-out from empty data.
    static let authState = "widget_auth_state"
    /// User's preferred currency code (mirrors `WidgetKey.currencyCode`).
    /// Written by the app from `User.defaultCurrency`; read by widget formatters
    /// so widgets render in the user's currency, not a hardcoded MXN. Defaults
    /// to `"MXN"` when the app hasn't synced yet (#808).
    static let currencyCode = "widget_currency_code"
}

// MARK: - Widget Currency

/// Read-only accessor for the currency code the widget extension should use
/// when formatting amounts. Reads the App Group key written by the app
/// (`WidgetDataSync.syncCurrencyCode`), defaulting to `"MXN"` before the app
/// has synced a value.
enum WidgetCurrency {
    /// The default currency shown before the app writes the user's preference.
    static let defaultCode = "MXN"

    /// Current currency code synced from the app, or `defaultCode`.
    static var current: String {
        AppGroup.userDefaults.string(forKey: WidgetDataKey.currencyCode) ?? defaultCode
    }
}

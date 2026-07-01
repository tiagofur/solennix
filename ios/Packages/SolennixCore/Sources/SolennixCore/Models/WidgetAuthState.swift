import Foundation

/// Widget auth-state signal shared between the app (writer) and the widget
/// extension (reader) through the App Group container.
///
/// The app writes `WidgetAuthState.authenticated` on login and `.signedOut` on
/// logout so the extension can tell a signed-out user (render `.signedOut`)
/// apart from a signed-in user whose data has not loaded yet (render `.empty`).
/// Without this signal, `WidgetDataSync.clearWidgetData()` wiping the data keys
/// on logout made signed-out indistinguishable from empty.
///
/// Only the raw value crosses the process boundary; the extension owns the
/// `current` reader (see `SolennixWidgetExtension`), keeping all App Group I/O
/// out of this leaf package.
public enum WidgetAuthState: String, Codable, Sendable {
    case authenticated
    case signedOut
}

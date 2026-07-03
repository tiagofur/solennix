import Foundation
import os.log

/// Centralized logging subsystem shared by every Solennix module.
///
/// `os.Logger` is the canonical Apple logging API. Unlike `NSLog`, it is
/// **stripped at runtime by default**: `.debug` messages are not persisted in
/// Release builds (they only surface under a developer config), and `.error`
/// / `.fault` are always available for diagnostics. This prevents the leak of
/// sensitive request data (URLs with query params, IDs, body previews) to
/// Console.app and the device's diagnostic reports on TestFlight/App Store.
///
/// All modules should build their logger off `SolennixLog.subsystem` so the
/// logs group together in Console.app under `com.solennix.app`:
///
/// ```swift
/// import os.log
/// import SolennixCore
///
/// private let logger = Logger(subsystem: SolennixLog.subsystem,
///                             category: "DashboardViewModel")
/// logger.debug("Loading \(endpoint, privacy: .public)")
/// logger.error("kpis preload failed: \(error.localizedDescription, privacy: .public)")
/// ```
public enum SolennixLog {
    /// The shared `os.Logger` subsystem. Every module's `Logger` MUST use this
    /// so logs aggregate under a single Console.app filter.
    public static let subsystem = "com.solennix.app"
}

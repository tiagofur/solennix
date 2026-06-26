import Foundation
import SwiftData
import os.log

// MARK: - SolennixModelContainer

private let logger = Logger(subsystem: "com.solennix.app", category: "SolennixModelContainer")

/// Factory for creating the app's SwiftData `ModelContainer` with all cached model types.
public enum SolennixModelContainer {

    /// Creates a configured `ModelContainer` for offline caching.
    ///
    /// Tries persistent storage first, falls back to in-memory. If BOTH fail,
    /// throws so the caller can report the error (Sentry, analytics, alert)
    /// before deciding how to terminate — avoids a silent `fatalError`.
    ///
    /// - Parameter onPersistentFallback: Optional callback invoked when the
    ///   persistent store fails but the in-memory fallback succeeds. The app
    ///   target uses this to route the degraded-mode error to Sentry, since this
    ///   package cannot depend on Sentry. Defaults to `nil` (no-op), so callers
    ///   that don't care about observability are unaffected.
    public static func create(
        onPersistentFallback: ((Error) -> Void)? = nil
    ) throws -> ModelContainer {
        let schema = Schema([
            CachedClient.self,
            CachedEvent.self,
            CachedProduct.self,
            CachedInventoryItem.self,
            CachedPayment.self
        ])

        let configuration = ModelConfiguration(
            "SolennixCache",
            schema: schema,
            isStoredInMemoryOnly: false
        )

        do {
            return try ModelContainer(
                for: schema,
                configurations: [configuration]
            )
        } catch {
            logger.fault("Persistent store failed, falling back to in-memory cache: \(error.localizedDescription, privacy: .public)")
            onPersistentFallback?(error)
            let fallback = ModelConfiguration(
                "SolennixCacheFallback",
                schema: schema,
                isStoredInMemoryOnly: true
            )
            return try ModelContainer(for: schema, configurations: [fallback])
        }
    }
}

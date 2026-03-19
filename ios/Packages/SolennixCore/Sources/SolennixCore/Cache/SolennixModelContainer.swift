import Foundation
import SwiftData

// MARK: - SolennixModelContainer

/// Factory for creating the app's SwiftData `ModelContainer` with all cached model types.
public enum SolennixModelContainer {

    /// Creates a configured `ModelContainer` for offline caching.
    ///
    /// Includes all cached model types and persists data to disk.
    /// Falls back to an in-memory store if the persistent store fails.
    public static func create() -> ModelContainer {
        let schema = Schema([
            CachedClient.self,
            CachedEvent.self,
            CachedProduct.self
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
            // If persistent storage fails, fall back to in-memory
            // so the app doesn't crash on launch.
            print("[SolennixModelContainer] Error al crear el contenedor persistente: \(error). Usando almacenamiento en memoria.")
            let fallback = ModelConfiguration(
                "SolennixCacheFallback",
                schema: schema,
                isStoredInMemoryOnly: true
            )
            do {
                return try ModelContainer(for: schema, configurations: [fallback])
            } catch {
                fatalError("[SolennixModelContainer] No se pudo crear el contenedor de datos: \(error)")
            }
        }
    }
}

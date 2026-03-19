import Foundation
import Observation
import SwiftData

// MARK: - CacheManager

/// Manages SwiftData caching operations for offline support.
///
/// Provides methods to cache and retrieve `Client`, `Event`, and `Product`
/// data from the local SwiftData store.
@MainActor
@Observable
public final class CacheManager {

    // MARK: - Properties

    private let modelContext: ModelContext

    // MARK: - Init

    public init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Clients

    /// Replaces all cached clients with the provided list.
    public func cacheClients(_ clients: [Client]) throws {
        try deleteAll(CachedClient.self)
        for client in clients {
            modelContext.insert(CachedClient(from: client))
        }
        try modelContext.save()
    }

    /// Returns all cached clients, converted to `Client` value types.
    public func getCachedClients() throws -> [Client] {
        let descriptor = FetchDescriptor<CachedClient>(
            sortBy: [SortDescriptor(\.name)]
        )
        let cached = try modelContext.fetch(descriptor)
        return cached.map { $0.toClient() }
    }

    // MARK: - Events

    /// Replaces all cached events with the provided list.
    public func cacheEvents(_ events: [Event]) throws {
        try deleteAll(CachedEvent.self)
        for event in events {
            modelContext.insert(CachedEvent(from: event))
        }
        try modelContext.save()
    }

    /// Returns all cached events, converted to `Event` value types.
    public func getCachedEvents() throws -> [Event] {
        let descriptor = FetchDescriptor<CachedEvent>(
            sortBy: [SortDescriptor(\.eventDate, order: .reverse)]
        )
        let cached = try modelContext.fetch(descriptor)
        return cached.map { $0.toEvent() }
    }

    // MARK: - Products

    /// Replaces all cached products with the provided list.
    public func cacheProducts(_ products: [Product]) throws {
        try deleteAll(CachedProduct.self)
        for product in products {
            modelContext.insert(CachedProduct(from: product))
        }
        try modelContext.save()
    }

    /// Returns all cached products, converted to `Product` value types.
    public func getCachedProducts() throws -> [Product] {
        let descriptor = FetchDescriptor<CachedProduct>(
            sortBy: [SortDescriptor(\.name)]
        )
        let cached = try modelContext.fetch(descriptor)
        return cached.map { $0.toProduct() }
    }

    // MARK: - Clear All

    /// Removes all cached data from the local store.
    public func clearAll() throws {
        try deleteAll(CachedClient.self)
        try deleteAll(CachedEvent.self)
        try deleteAll(CachedProduct.self)
        try modelContext.save()
    }

    // MARK: - Helpers

    private func deleteAll<T: PersistentModel>(_ type: T.Type) throws {
        try modelContext.delete(model: type)
    }
}

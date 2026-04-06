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
    private let userDefaults: UserDefaults

    private enum CacheDomain: String, CaseIterable {
        case clients
        case events
        case products
        case inventory
        case payments
    }

    // MARK: - Init

    public init(modelContext: ModelContext, userDefaults: UserDefaults = .standard) {
        self.modelContext = modelContext
        self.userDefaults = userDefaults
    }

    // MARK: - Clients

    /// Replaces all cached clients with the provided list.
    public func cacheClients(_ clients: [Client]) throws {
        try deleteAll(CachedClient.self)
        for client in clients {
            modelContext.insert(CachedClient(from: client))
        }
        try modelContext.save()
        markCacheUpdated(.clients)
    }

    /// Returns all cached clients, converted to `Client` value types.
    public func getCachedClients(maxAge: TimeInterval? = nil) throws -> [Client] {
        guard isCacheFresh(.clients, maxAge: maxAge) else { return [] }
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
        markCacheUpdated(.events)
    }

    /// Returns all cached events, converted to `Event` value types.
    public func getCachedEvents(maxAge: TimeInterval? = nil) throws -> [Event] {
        guard isCacheFresh(.events, maxAge: maxAge) else { return [] }
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
        markCacheUpdated(.products)
    }

    /// Returns all cached products, converted to `Product` value types.
    public func getCachedProducts(maxAge: TimeInterval? = nil) throws -> [Product] {
        guard isCacheFresh(.products, maxAge: maxAge) else { return [] }
        let descriptor = FetchDescriptor<CachedProduct>(
            sortBy: [SortDescriptor(\.name)]
        )
        let cached = try modelContext.fetch(descriptor)
        return cached.map { $0.toProduct() }
    }

    // MARK: - Inventory Items

    /// Replaces all cached inventory items with the provided list.
    public func cacheInventoryItems(_ items: [InventoryItem]) throws {
        try deleteAll(CachedInventoryItem.self)
        for item in items {
            modelContext.insert(CachedInventoryItem(from: item))
        }
        try modelContext.save()
        markCacheUpdated(.inventory)
    }

    /// Returns all cached inventory items, converted to `InventoryItem` value types.
    public func getCachedInventoryItems(maxAge: TimeInterval? = nil) throws -> [InventoryItem] {
        guard isCacheFresh(.inventory, maxAge: maxAge) else { return [] }
        let descriptor = FetchDescriptor<CachedInventoryItem>(
            sortBy: [SortDescriptor(\.ingredientName)]
        )
        let cached = try modelContext.fetch(descriptor)
        return cached.map { $0.toInventoryItem() }
    }

    // MARK: - Payments

    /// Replaces all cached payments with the provided list.
    public func cachePayments(_ payments: [Payment]) throws {
        try deleteAll(CachedPayment.self)
        for payment in payments {
            modelContext.insert(CachedPayment(from: payment))
        }
        try modelContext.save()
        markCacheUpdated(.payments)
    }

    /// Returns cached payments for a specific event.
    public func getCachedPayments(eventId: String, maxAge: TimeInterval? = nil) throws -> [Payment] {
        guard isCacheFresh(.payments, maxAge: maxAge) else { return [] }
        var descriptor = FetchDescriptor<CachedPayment>(
            sortBy: [SortDescriptor(\.paymentDate, order: .reverse)]
        )
        descriptor.predicate = #Predicate<CachedPayment> { $0.eventId == eventId }
        let cached = try modelContext.fetch(descriptor)
        return cached.map { $0.toPayment() }
    }

    // MARK: - Clear All

    /// Removes all cached data from the local store.
    public func clearAll() throws {
        try deleteAll(CachedClient.self)
        try deleteAll(CachedEvent.self)
        try deleteAll(CachedProduct.self)
        try deleteAll(CachedInventoryItem.self)
        try deleteAll(CachedPayment.self)
        try modelContext.save()
        clearCacheTimestamps()
    }

    // MARK: - Helpers

    private func deleteAll<T: PersistentModel>(_ type: T.Type) throws {
        try modelContext.delete(model: type)
    }

    private func timestampKey(for domain: CacheDomain) -> String {
        "solennix.cache.updatedAt.\(domain.rawValue)"
    }

    private func markCacheUpdated(_ domain: CacheDomain) {
        userDefaults.set(Date(), forKey: timestampKey(for: domain))
    }

    private func isCacheFresh(_ domain: CacheDomain, maxAge: TimeInterval?) -> Bool {
        guard let maxAge else { return true }
        guard let lastUpdate = userDefaults.object(forKey: timestampKey(for: domain)) as? Date else {
            return false
        }
        return Date().timeIntervalSince(lastUpdate) <= maxAge
    }

    private func clearCacheTimestamps() {
        for domain in CacheDomain.allCases {
            userDefaults.removeObject(forKey: timestampKey(for: domain))
        }
    }
}

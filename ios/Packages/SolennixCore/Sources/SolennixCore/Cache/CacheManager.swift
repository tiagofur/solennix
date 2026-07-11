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
        try deleteAllCachedClients()
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
        try deleteAllCachedEvents()
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

    /// Upserts a single event into the cache without wiping the rest.
    ///
    /// Mirrors `upsertCachedPayment` for event mutations
    /// (`EventFormViewModel.save`, `EventDetailViewModel.changeStatus`) so the
    /// widget reflects the change on the next `syncAll()` instead of waiting
    /// for the background refresh (#804). Same explicit fetch+update posture
    /// (not relying on SwiftData's implicit upsert for `@Attribute(.unique)`).
    public func upsertCachedEvent(_ event: Event) throws {
        if let existing = try fetchCachedEvent(id: event.id) {
            existing.userId = event.userId
            existing.clientId = event.clientId
            existing.eventDate = event.eventDate
            existing.startTime = event.startTime
            existing.endTime = event.endTime
            existing.serviceType = event.serviceType
            existing.numPeople = event.numPeople
            existing.statusRawValue = event.status.rawValue
            existing.discount = event.discount
            existing.discountTypeRawValue = event.discountType.rawValue
            existing.requiresInvoice = event.requiresInvoice
            existing.taxRate = event.taxRate
            existing.taxAmount = event.taxAmount
            existing.totalAmount = event.totalAmount
            existing.location = event.location
            existing.city = event.city
            existing.depositPercent = event.depositPercent
            existing.cancellationDays = event.cancellationDays
            existing.refundPercent = event.refundPercent
            existing.notes = event.notes
            existing.photos = event.photos
            existing.createdAt = event.createdAt
            existing.updatedAt = event.updatedAt
            existing.currency = event.currency
        } else {
            modelContext.insert(CachedEvent(from: event))
        }
        try modelContext.save()
        markCacheUpdated(.events)
    }

    /// Deletes a single cached event by id, leaving other events intact.
    ///
    /// Used by `EventDetailViewModel.deleteEvent` so the widget drops the
    /// event immediately instead of waiting for the background refresh (#804).
    public func deleteCachedEvent(id: String) throws {
        if let existing = try fetchCachedEvent(id: id) {
            modelContext.delete(existing)
            try modelContext.save()
            markCacheUpdated(.events)
        }
    }

    // MARK: - Products

    /// Replaces all cached products with the provided list.
    public func cacheProducts(_ products: [Product]) throws {
        try deleteAllCachedProducts()
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
        try deleteAllCachedInventoryItems()
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
        try deleteAllCachedPayments()
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

    /// Upserts a single payment into the cache without wiping the rest.
    ///
    /// Used by foreground mutations (`EventDetailViewModel.addPayment`) so the
    /// widget reflects the new payment immediately, before the background
    /// refresh re-fetches the full list (#803). If a payment with the same id
    /// already exists, its fields are updated in place; otherwise a new row is
    /// inserted. Explicit fetch+update (not relying on SwiftData's implicit
    /// upsert for `@Attribute(.unique)`, which has been inconsistent across
    /// OS versions) — same defensive posture as the wipe-then-insert in
    /// `cachePayments`.
    public func upsertCachedPayment(_ payment: Payment) throws {
        if let existing = try fetchCachedPayment(id: payment.id) {
            existing.eventId = payment.eventId
            existing.userId = payment.userId
            existing.amount = payment.amount
            existing.paymentDate = payment.paymentDate
            existing.paymentMethod = payment.paymentMethod
            existing.notes = payment.notes
            existing.createdAt = payment.createdAt
        } else {
            modelContext.insert(CachedPayment(from: payment))
        }
        try modelContext.save()
        markCacheUpdated(.payments)
    }

    /// Deletes a single cached payment by id, leaving other payments intact.
    ///
    /// Mirrors `upsertCachedPayment` for the delete path
    /// (`EventDetailViewModel.deletePayment`) so the widget drops the payment
    /// immediately instead of waiting for the background refresh (#803).
    public func deleteCachedPayment(id: String) throws {
        if let existing = try fetchCachedPayment(id: id) {
            modelContext.delete(existing)
            try modelContext.save()
            markCacheUpdated(.payments)
        }
    }

    /// Fetches a single cached payment by id, or nil if absent.
    private func fetchCachedPayment(id: String) throws -> CachedPayment? {
        var descriptor = FetchDescriptor<CachedPayment>(
            predicate: #Predicate { $0.id == id }
        )
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }

    /// Fetches a single cached event by id, or nil if absent.
    private func fetchCachedEvent(id: String) throws -> CachedEvent? {
        var descriptor = FetchDescriptor<CachedEvent>(
            predicate: #Predicate { $0.id == id }
        )
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }

    // MARK: - Clear All

    /// Removes all cached data from the local store.
    public func clearAll() throws {
        try deleteAllCachedClients()
        try deleteAllCachedEvents()
        try deleteAllCachedProducts()
        try deleteAllCachedInventoryItems()
        try deleteAllCachedPayments()
        try modelContext.save()
        clearCacheTimestamps()
    }

    // MARK: - Helpers

    private func deleteAllCachedClients() throws {
        try modelContext.delete(model: CachedClient.self)
    }

    private func deleteAllCachedEvents() throws {
        try modelContext.delete(model: CachedEvent.self)
    }

    private func deleteAllCachedProducts() throws {
        try modelContext.delete(model: CachedProduct.self)
    }

    private func deleteAllCachedInventoryItems() throws {
        try modelContext.delete(model: CachedInventoryItem.self)
    }

    private func deleteAllCachedPayments() throws {
        try modelContext.delete(model: CachedPayment.self)
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

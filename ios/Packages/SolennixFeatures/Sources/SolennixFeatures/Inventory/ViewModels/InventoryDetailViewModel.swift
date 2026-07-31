import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Inventory Demand Entry

struct InventoryDemandEntry: Identifiable {
    let id: String
    let eventDate: Date
    let eventName: String
    let quantity: Double
    let unit: String
}

// MARK: - Demand Row Display Data (precomputed outside ForEach — fix #7)

struct DemandRowData {
    let entry: InventoryDemandEntry
    let runningBalance: Double
    let isInsufficient: Bool
    let diffDays: Int
}

// MARK: - Inventory Detail View Model

@Observable
final class InventoryDetailViewModel {

    var item: InventoryItem?
    var demandEntries: [InventoryDemandEntry] = []
    var isLoading: Bool = true
    var errorMessage: String?
    var showDeleteConfirm: Bool = false
    var showStockAdjustment: Bool = false
    var adjustmentQuantity: Double = 0
    var stockSavedCounter: Int = 0
    var stockErrorCounter: Int = 0

    private let apiClient: APIClient
    let itemId: String

    init(apiClient: APIClient, itemId: String) {
        self.apiClient = apiClient
        self.itemId = itemId
    }

    // MARK: - Computed KPIs

    var isLowStock: Bool {
        guard let item else { return false }
        return item.minimumStock > 0 && item.currentStock < item.minimumStock
    }

    var stockValue: Double {
        guard let item, let cost = item.unitCost else { return 0 }
        return cost * item.currentStock
    }

    // MARK: - UTC-pinned window (fix #2 — matches ProductDetail pattern)

    /// Today anchored to UTC midnight for stable day-window comparisons.
    /// Initialized eagerly; refreshed at the top of loadDemandForecast.
    private(set) var todayUTC: Date? = Date.fromServerDay(Date.localTodayString())

    /// UTC-pinned calendar for day-diff arithmetic — avoids timezone shifts.
    static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    var demand7Days: Double {
        guard let todayUTC else { return 0 }
        let in7 = Self.utcCalendar.date(byAdding: .day, value: 7, to: todayUTC) ?? todayUTC
        return demandEntries
            .filter { $0.eventDate >= todayUTC && $0.eventDate <= in7 }
            .reduce(0) { $0 + $1.quantity }
    }

    var stockAfter7Days: Double {
        (item?.currentStock ?? 0) - demand7Days
    }

    // MARK: - Data Loading

    @MainActor
    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            item = try await apiClient.get(Endpoint.inventoryItem(itemId))
            await loadDemandForecast()
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? InventoryStrings.errorLoadingTitle
            } else {
                errorMessage = InventoryStrings.errorLoadingTitle
            }
        }

        isLoading = false
    }

    // MARK: - Parallelized demand loading (fix #3 — withTaskGroup, fault-isolated)

    private struct DemandFetchResult {
        let entry: InventoryDemandEntry?
        let fetchFailed: Bool
    }

    @MainActor
    private func loadDemandForecast() async {
        guard let item else { return }

        // Anchor today once for the whole load (fix #2).
        todayUTC = Date.fromServerDay(Date.localTodayString())

        // Snapshot properties accessed inside child tasks to satisfy Swift 6 capture hygiene.
        let itemType = item.type
        let itemUnit = item.unit

        do {
            let events: [Event] = try await apiClient.getAll(Endpoint.upcomingEvents)
            let eventsSlice = Array(events.prefix(15))

            var collected: [InventoryDemandEntry] = []
            var fetchFailedCount = 0
            var successfulFetchCount = 0

            await withTaskGroup(of: DemandFetchResult.self) { group in
                for event in eventsSlice {
                    group.addTask { [apiClient, itemId] in
                        do {
                            // Parse date first — skip if unparseable, never fabricate.
                            guard let eventDate = Date.fromServerDay(event.eventDate) else {
                                return DemandFetchResult(entry: nil, fetchFailed: false)
                            }

                            let eventProducts: [EventProduct] = try await apiClient.get(Endpoint.eventProducts(event.id))

                            // Compute demand for this item across all products concurrently.
                            var eventDemand: Double = 0
                            await withTaskGroup(of: Double.self) { ingredientGroup in
                                for ep in eventProducts {
                                    ingredientGroup.addTask {
                                        do {
                                            let ingredients: [ProductIngredient] = try await apiClient.get(Endpoint.productIngredients(ep.productId))
                                            if let matching = ingredients.first(where: { $0.inventoryId == itemId }) {
                                                if itemType == .supply {
                                                    return matching.quantityRequired
                                                } else {
                                                    return matching.quantityRequired * ep.quantity
                                                }
                                            }
                                            return 0
                                        } catch {
                                            return 0
                                        }
                                    }
                                }
                                for await qty in ingredientGroup {
                                    eventDemand += qty
                                }
                            }

                            // Zero demand is a legitimate success — this event just doesn't use the item.
                            guard eventDemand > 0 else {
                                return DemandFetchResult(entry: nil, fetchFailed: false)
                            }

                            // Client fetch runs sequentially after the ingredient group completes.
                            var eventName = InventoryStrings.defaultEventName(serviceType: event.serviceType)
                            if !event.clientId.isEmpty {
                                if let client = try? await apiClient.get(Endpoint.client(event.clientId)) as Client {
                                    eventName = InventoryStrings.eventWithClient(client.name)
                                }
                            }

                            return DemandFetchResult(
                                entry: InventoryDemandEntry(
                                    id: event.id,
                                    eventDate: eventDate,
                                    eventName: eventName,
                                    quantity: eventDemand,
                                    unit: itemUnit
                                ),
                                fetchFailed: false
                            )
                        } catch {
                            return DemandFetchResult(entry: nil, fetchFailed: true)
                        }
                    }
                }

                for await result in group {
                    if result.fetchFailed {
                        fetchFailedCount += 1
                    } else {
                        successfulFetchCount += 1
                        if let entry = result.entry { collected.append(entry) }
                    }
                }
            }

            // Surface an error only when every fetch genuinely failed (network/auth),
            // not when items simply have zero demand in upcoming events.
            if fetchFailedCount > 0 && successfulFetchCount == 0 && !eventsSlice.isEmpty {
                errorMessage = InventoryStrings.unexpectedRetryError
            }

            demandEntries = collected.sorted { $0.eventDate < $1.eventDate }
        } catch {
            // Upcoming events fetch itself failed — demand section stays empty (non-critical).
        }
    }

    @MainActor
    func deleteItem() async -> Bool {
        do {
            try await apiClient.delete(Endpoint.inventoryItem(itemId))
            return true
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? InventoryStrings.unexpectedError
            } else {
                errorMessage = InventoryStrings.unexpectedError
            }
            return false
        }
    }

    @MainActor
    func saveStockAdjustment() async {
        guard let currentItem = item else { return }
        do {
            let body = InventoryItem(
                id: currentItem.id,
                userId: currentItem.userId,
                ingredientName: currentItem.ingredientName,
                currentStock: max(0, adjustmentQuantity),
                minimumStock: currentItem.minimumStock,
                unit: currentItem.unit,
                unitCost: currentItem.unitCost,
                lastUpdated: currentItem.lastUpdated,
                type: currentItem.type
            )
            let updated: InventoryItem = try await apiClient.put(Endpoint.inventoryItem(itemId), body: body)
            item = updated
            showStockAdjustment = false
            stockSavedCounter &+= 1
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? InventoryStrings.unexpectedError
            } else {
                errorMessage = InventoryStrings.unexpectedError
            }
            stockErrorCounter &+= 1
        }
    }

    // MARK: - Precomputed demand row data (fix #7 — no mutable accumulator inside ForEach)

    func makeDemandRows() -> [DemandRowData] {
        guard let todayUTC else { return demandEntries.map {
            DemandRowData(entry: $0, runningBalance: 0, isInsufficient: false, diffDays: 999)
        }}
        var balance = item?.currentStock ?? 0
        return demandEntries.map { entry in
            balance -= entry.quantity
            let diff = Self.utcCalendar.dateComponents([.day], from: todayUTC, to: entry.eventDate).day ?? 999
            return DemandRowData(
                entry: entry,
                runningBalance: balance,
                isInsufficient: balance < 0,
                diffDays: diff
            )
        }
    }
}

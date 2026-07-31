import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Product Detail View Model

@Observable
final class ProductDetailViewModel {

    var product: Product?
    var ingredients: [ProductIngredient] = []
    var demandData: [DemandDataPoint] = []
    var isLoading: Bool = true
    var errorMessage: String?
    var showDeleteConfirm: Bool = false

    private let apiClient: APIClient
    let productId: String

    init(apiClient: APIClient, productId: String) {
        self.apiClient = apiClient
        self.productId = productId
    }

    // MARK: - Computed KPIs

    var ingredientItems: [ProductIngredient] {
        ingredients.filter { $0.type == .ingredient }
    }

    var supplyItems: [ProductIngredient] {
        ingredients.filter { $0.type == .supply }
    }

    var equipmentItems: [ProductIngredient] {
        ingredients.filter { $0.type == .equipment }
    }

    /// Unit cost = ingredient items + supply items (both carry quantityRequired × unitCost).
    var unitCost: Double {
        let ingredientCost = ingredientItems.reduce(0) { $0 + $1.quantityRequired * ($1.unitCost ?? 0) }
        let supplyCost = supplyItems.reduce(0) { $0 + $1.quantityRequired * ($1.unitCost ?? 0) }
        return ingredientCost + supplyCost
    }

    var perEventCost: Double {
        supplyItems.reduce(0) { $0 + $1.quantityRequired * ($1.unitCost ?? 0) }
    }

    /// Returns nil when there are no recipe items (no basis for margin).
    var margin: Double? {
        let hasRecipe = !ingredientItems.isEmpty || !supplyItems.isEmpty
        guard hasRecipe else { return nil }
        guard let price = product?.basePrice, price > 0 else { return 0 }
        return ((price - unitCost) / price) * 100
    }

    // MARK: - Demand

    /// Today as UTC-midnight Date for stable day comparisons (same technique as EventCountdownChip).
    /// Initialized eagerly so KPIs never see a nil window; refreshed on each loadDemandData
    /// so all window calculations within one load share the same anchor.
    private var todayUTC: Date? = Date.fromServerDay(Date.localTodayString())

    /// A UTC-pinned calendar for day-diff arithmetic (avoids UTC-negative timezone shifts).
    private static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    var demand7Days: Int {
        guard let todayUTC else { return 0 }
        let in7 = Self.utcCalendar.date(byAdding: .day, value: 7, to: todayUTC) ?? todayUTC
        return demandData.filter { $0.eventDate >= todayUTC && $0.eventDate <= in7 }
            .reduce(0) { $0 + $1.quantity }
    }

    var totalDemand: Int {
        demandData.reduce(0) { $0 + $1.quantity }
    }

    /// Revenue computed over the 7-day window only, consistent with demand7Days / smart alert.
    var estimatedRevenue7Days: Double {
        guard let price = product?.basePrice, let todayUTC else { return 0 }
        let in7 = Self.utcCalendar.date(byAdding: .day, value: 7, to: todayUTC) ?? todayUTC
        let window = demandData.filter { $0.eventDate >= todayUTC && $0.eventDate <= in7 }
        return window.reduce(0) { acc, dp in
            let unitPrice = dp.unitPrice > 0 ? dp.unitPrice : price
            return acc + Double(dp.quantity) * unitPrice
        }
    }

    @MainActor
    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let productTask: Product = apiClient.get(Endpoint.product(productId))
            async let ingredientsTask: [ProductIngredient] = apiClient.get(Endpoint.productIngredients(productId))

            let (loadedProduct, loadedIngredients) = try await (productTask, ingredientsTask)
            product = loadedProduct
            ingredients = loadedIngredients

            await loadDemandData()
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Parallelized demand loading (fault-isolated: one 404/timeout won't discard collected points)

    private struct DemandFetchResult {
        let point: DemandDataPoint?
        let fetchFailed: Bool
    }

    @MainActor
    private func loadDemandData() async {
        // Anchor today once for the entire load; window KPIs read this stored value.
        todayUTC = Date.fromServerDay(Date.localTodayString())

        do {
            let events: [Event] = try await apiClient.getAll(Endpoint.upcomingEvents)
            let eventsSlice = Array(events.prefix(10))

            var collected: [DemandDataPoint] = []
            var fetchFailedCount = 0
            var successfulFetchCount = 0

            // Non-throwing group: each child isolates its own errors so a single
            // 404/timeout does not discard points already collected from other events.
            await withTaskGroup(of: DemandFetchResult.self) { group in
                for event in eventsSlice {
                    group.addTask {
                        do {
                            // Parse date first — skip if unparseable (no fabricated Date()).
                            guard let eventDate = Date.fromServerDay(event.eventDate) else {
                                return DemandFetchResult(point: nil, fetchFailed: false)
                            }

                            async let epTask: [EventProduct] = self.apiClient.get(Endpoint.eventProducts(event.id))

                            // Client fetch is independent — run concurrently with eventProducts.
                            var clientName = FeatureL10n.text("clients.title_singular", "Cliente")
                            if !event.clientId.isEmpty {
                                async let clientTask: Client = self.apiClient.get(Endpoint.client(event.clientId))
                                let (eps, maybeClient) = try await (epTask, clientTask)
                                clientName = maybeClient.name
                                // Product not in this event is a legitimate success (zero demand).
                                guard let ep = eps.first(where: { $0.productId == self.productId }) else {
                                    return DemandFetchResult(point: nil, fetchFailed: false)
                                }
                                return DemandFetchResult(
                                    point: DemandDataPoint(
                                        id: event.id,
                                        eventDate: eventDate,
                                        clientName: clientName,
                                        quantity: Int(ep.quantity),
                                        numPeople: event.numPeople,
                                        unitPrice: ep.unitPrice
                                    ),
                                    fetchFailed: false
                                )
                            } else {
                                let eps = try await epTask
                                // Product not in this event is a legitimate success (zero demand).
                                guard let ep = eps.first(where: { $0.productId == self.productId }) else {
                                    return DemandFetchResult(point: nil, fetchFailed: false)
                                }
                                return DemandFetchResult(
                                    point: DemandDataPoint(
                                        id: event.id,
                                        eventDate: eventDate,
                                        clientName: clientName,
                                        quantity: Int(ep.quantity),
                                        numPeople: event.numPeople,
                                        unitPrice: ep.unitPrice
                                    ),
                                    fetchFailed: false
                                )
                            }
                        } catch {
                            // Network/auth failure — counts against fetch failures.
                            return DemandFetchResult(point: nil, fetchFailed: true)
                        }
                    }
                }

                for await result in group {
                    if result.fetchFailed {
                        fetchFailedCount += 1
                    } else {
                        successfulFetchCount += 1
                        if let point = result.point { collected.append(point) }
                    }
                }
            }

            // Surface an error only when every fetch genuinely failed (network/auth),
            // not when the product simply has no demand in upcoming events.
            if fetchFailedCount > 0 && successfulFetchCount == 0 && !eventsSlice.isEmpty {
                errorMessage = ProductStrings.unexpectedRetryError
            }

            // Sort by event date ascending so chart renders chronologically.
            demandData = collected.sorted { $0.eventDate < $1.eventDate }
        } catch {
            // Upcoming events fetch itself failed — keep demandData empty (non-critical).
        }
    }

    @MainActor
    func deleteProduct() async -> Bool {
        do {
            try await apiClient.delete(Endpoint.product(productId))
            return true
        } catch {
            errorMessage = mapError(error)
            return false
        }
    }

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? ProductStrings.unexpectedError
        }
        return ProductStrings.unexpectedRetryError
    }
}

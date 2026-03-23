import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Dashboard View Model

@Observable
public final class DashboardViewModel {

    // MARK: - Properties

    public var eventsThisMonth: [Event] = []
    public var upcomingEvents: [Event] = []
    public var lowStockItems: [InventoryItem] = []
    public var netSalesThisMonth: Double = 0
    public var cashCollectedThisMonth: Double = 0
    public var vatCollectedThisMonth: Double = 0
    public var vatOutstandingThisMonth: Double = 0
    public var lowStockCount: Int = 0
    public var isLoading: Bool = false
    public var errorMessage: String?

    /// Map of client ID -> Client for joining event data with client names.
    public var clientMap: [String: Client] = [:]

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Computed

    /// Group events by status and return counts.
    public var eventStatusCounts: [EventStatus: Int] {
        var counts: [EventStatus: Int] = [:]
        for event in eventsThisMonth {
            counts[event.status, default: 0] += 1
        }
        return counts
    }

    public var totalClients: Int {
        clientMap.count
    }

    public var pendingQuotes: Int {
        eventsThisMonth.filter { $0.status == .quoted }.count
    }

    /// Resolve a client name from the client map.
    public func clientName(for clientId: String) -> String {
        clientMap[clientId]?.name ?? "Cliente"
    }

    // MARK: - Data Loading

    @MainActor
    public func loadDashboard() async {
        isLoading = true
        errorMessage = nil

        do {
            // Build date range for current month
            let now = Date()
            let calendar = Calendar.current
            let components = calendar.dateComponents([.year, .month], from: now)
            guard let startOfMonth = calendar.date(from: components),
                  let endOfMonth = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: startOfMonth)
            else {
                errorMessage = "Error calculando rango de fechas"
                isLoading = false
                return
            }

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let startStr = dateFormatter.string(from: startOfMonth)
            let endStr = dateFormatter.string(from: endOfMonth)

            // Fetch all data concurrently
            async let clientsResult: [Client] = apiClient.get(Endpoint.clients)
            async let monthEventsResult: [Event] = apiClient.get(
                Endpoint.events,
                params: ["start_date": startStr, "end_date": endStr]
            )
            async let upcomingResult: [Event] = apiClient.get(
                Endpoint.upcomingEvents,
                params: ["limit": "5"]
            )
            async let inventoryResult: [InventoryItem] = apiClient.get(Endpoint.inventory)
            async let paymentsResult: [Payment] = apiClient.get(
                Endpoint.payments,
                params: ["start_date": startStr, "end_date": endStr]
            )

            let clients = try await clientsResult
            let monthEvents = try await monthEventsResult
            let upcoming = try await upcomingResult
            let inventory = try await inventoryResult
            let payments = try await paymentsResult

            // Build client map
            clientMap = Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0) })

            // Events this month
            eventsThisMonth = monthEvents

            // Upcoming events
            upcomingEvents = upcoming

            // Net sales = sum of total_amount for confirmed/completed events
            netSalesThisMonth = monthEvents
                .filter { $0.status == .confirmed || $0.status == .completed }
                .reduce(0) { $0 + $1.totalAmount }

            // Low stock items = inventory where current_stock < minimum_stock AND minimum_stock > 0
            lowStockItems = inventory.filter { $0.minimumStock > 0 && $0.currentStock < $0.minimumStock }
            lowStockCount = lowStockItems.count

            // Cash collected = sum of payment amounts in current month
            cashCollectedThisMonth = payments.reduce(0) { $0 + $1.amount }

            // VAT calculation based on payment ratio
            let totalEventAmount = monthEvents
                .filter { $0.status == .confirmed || $0.status == .completed }
                .reduce(0) { $0 + $1.totalAmount }
            let totalTaxAmount = monthEvents
                .filter { $0.status == .confirmed || $0.status == .completed }
                .reduce(0) { $0 + $1.taxAmount }

            if totalEventAmount > 0 {
                let paymentRatio = cashCollectedThisMonth / totalEventAmount
                vatCollectedThisMonth = totalTaxAmount * paymentRatio
                vatOutstandingThisMonth = totalTaxAmount - vatCollectedThisMonth
            } else {
                vatCollectedThisMonth = 0
                vatOutstandingThisMonth = 0
            }

        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Error cargando el dashboard"
            } else {
                errorMessage = "Error cargando el dashboard"
            }
        }

        isLoading = false
    }

    @MainActor
    public func refresh() async {
        await loadDashboard()
    }
}

// MARK: - Currency Formatting

public extension Double {
    /// Format as Mexican Peso currency string.
    var asMXN: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: self)) ?? "$0"
    }
}

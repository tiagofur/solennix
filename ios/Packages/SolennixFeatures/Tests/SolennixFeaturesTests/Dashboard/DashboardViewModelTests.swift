import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

final class DashboardViewModelTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!
    private var viewModel: DashboardViewModel!

    override func setUp() async throws {
        try await super.setUp()
        
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        viewModel = await DashboardViewModel(apiClient: apiClient)
        await apiClient.setAuthManager(AuthManager())
    }

    override func tearDown() async throws {
        MockURLProtocol.requestHandler = nil
        viewModel = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    // MARK: - 1. Computed KPI Fallbacks
    @MainActor
    func testKPIFallbacksWhenKPINil() {
        XCTAssertNil(viewModel.kpis)
        XCTAssertEqual(viewModel.totalClients, 0)
        XCTAssertEqual(viewModel.pendingQuotes, 0)
        XCTAssertEqual(viewModel.eventsThisMonthCount, 0)
        XCTAssertEqual(viewModel.netSalesThisMonth, 0.0)
        XCTAssertEqual(viewModel.cashCollectedThisMonth, 0.0)
        XCTAssertEqual(viewModel.vatCollectedThisMonth, 0.0)
        XCTAssertEqual(viewModel.vatOutstandingThisMonth, 0.0)
    }

    @MainActor
    func testKPIValuesWhenKPIPopulated() {
        let kpis = DashboardKPIs(
            totalRevenue: 50000.0,
            eventsThisMonth: 5,
            pendingQuotes: 3,
            lowStockItems: 2,
            upcomingEvents: 4,
            totalClients: 10,
            totalProducts: 8,
            averageEventValue: 10000.0,
            netSalesThisMonth: 25000.0,
            cashCollectedThisMonth: 15000.0,
            vatCollectedThisMonth: 2400.0,
            vatOutstandingThisMonth: 1600.0
        )
        viewModel.kpis = kpis

        XCTAssertEqual(viewModel.totalClients, 10)
        XCTAssertEqual(viewModel.pendingQuotes, 3)
        XCTAssertEqual(viewModel.eventsThisMonthCount, 5)
        XCTAssertEqual(viewModel.netSalesThisMonth, 25000.0)
        XCTAssertEqual(viewModel.cashCollectedThisMonth, 15000.0)
        XCTAssertEqual(viewModel.vatCollectedThisMonth, 2400.0)
        XCTAssertEqual(viewModel.vatOutstandingThisMonth, 1600.0)
    }

    // MARK: - 2. Trend Points Padding
    func testTrendPointsPadding() {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"

        guard let testNow = formatter.date(from: "2026-07-09") else {
            XCTFail("Failed to parse base test date")
            return
        }

        let serverPoints = [
            DashboardRevenuePoint(month: "2026-07", revenue: 1500.0, eventCount: 2),
            DashboardRevenuePoint(month: "2026-05", revenue: 3000.0, eventCount: 4)
        ]

        let trend = DashboardViewModel.buildTrailingSixMonthTrend(from: serverPoints, now: testNow)

        XCTAssertEqual(trend.count, 6)

        // The six months should be: 2026-02, 2026-03, 2026-04, 2026-05, 2026-06, 2026-07
        // 2026-02 (index 0)
        XCTAssertEqual(trend[0].revenue, 0.0)
        XCTAssertEqual(trend[0].eventCount, 0)

        // 2026-05 (index 3)
        XCTAssertEqual(trend[3].revenue, 3000.0)
        XCTAssertEqual(trend[3].eventCount, 4)

        // 2026-06 (index 4)
        XCTAssertEqual(trend[4].revenue, 0.0)

        // 2026-07 (index 5)
        XCTAssertEqual(trend[5].revenue, 1500.0)
        XCTAssertEqual(trend[5].eventCount, 2)
    }

    // MARK: - 3. Attention Event Prioritization
    func testAttentionEventsPrioritization() {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"

        guard let testNow = formatter.date(from: "2026-07-09") else {
            XCTFail("Failed to parse base test date")
            return
        }

        let clientMap = [
            "client-1": Client(
                id: "client-1",
                userId: "user-1",
                name: "Alpha",
                phone: "1234567890",
                createdAt: "2026-07-09T00:00:00Z",
                updatedAt: "2026-07-09T00:00:00Z"
            ),
            "client-2": Client(
                id: "client-2",
                userId: "user-1",
                name: "Beta",
                phone: "1234567890",
                createdAt: "2026-07-09T00:00:00Z",
                updatedAt: "2026-07-09T00:00:00Z"
            )
        ]

        // 1. Overdue event (status quoted/confirmed in past)
        let overdueEvent = Event(
            id: "evt-overdue",
            userId: "user-1",
            clientId: "client-1",
            eventDate: "2026-07-05T12:00:00Z",
            serviceType: "Catering",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 1000.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )

        // 2. Pending payment (confirmed within next 7 days, outstanding balance)
        let pendingPaymentEvent = Event(
            id: "evt-pending",
            userId: "user-1",
            clientId: "client-2",
            eventDate: "2026-07-12T12:00:00Z",
            serviceType: "Music",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 1200.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )

        // 3. Unconfirmed event (quoted within next 14 days)
        let unconfirmedEvent = Event(
            id: "evt-unconfirmed",
            userId: "user-1",
            clientId: "client-1",
            eventDate: "2026-07-15T12:00:00Z",
            serviceType: "Bar",
            numPeople: 50,
            status: .quoted,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 800.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )

        let events = [unconfirmedEvent, overdueEvent, pendingPaymentEvent]
        let payments = [
            Payment(
                id: "pay-1",
                eventId: "evt-pending",
                userId: "user-1",
                amount: 500.0,
                paymentDate: "2026-07-08T00:00:00Z",
                paymentMethod: "card",
                createdAt: "2026-07-09T00:00:00Z"
            )
        ]

        let attention = DashboardViewModel.makeAttentionEvents(
            events: events,
            payments: payments,
            clientMap: clientMap,
            now: testNow
        )

        // Should return 3 items
        XCTAssertEqual(attention.count, 3)

        // Sort priority: overdueEvent (0) < pendingPayment (1) < unconfirmedEvent (2)
        XCTAssertEqual(attention[0].kind, .overdueEvent)
        XCTAssertEqual(attention[0].event.id, "evt-overdue")

        XCTAssertEqual(attention[1].kind, .pendingPayment)
        XCTAssertEqual(attention[1].event.id, "evt-pending")
        XCTAssertEqual(attention[1].outstandingAmount, 700.0) // 1200 - 500 = 700

        XCTAssertEqual(attention[2].kind, .unconfirmedEvent)
        XCTAssertEqual(attention[2].event.id, "evt-unconfirmed")
    }

    // MARK: - 4. loadDashboard — summary + parallel lists
    @MainActor
    func testLoadDashboardPopulatesFromSummaryAndLists() async {
        // One all-events list feeds both eventsThisMonth (client-side month
        // filter) and the total count. /products is intentionally NOT stubbed
        // — it must not be fetched anymore; totalProducts comes from KPIs.
        let allEvents = "[]".data(using: .utf8)!
        MockURLProtocol.requestHandler = { request in
            let urlString = request.url?.absoluteString ?? ""
            let ok = { (body: Data) in
                (HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                                 headerFields: ["Content-Type": "application/json"])!, body)
            }
            if urlString.contains("/dashboard/summary") {
                // Single bundled payload: KPIs + 5 datasets.
                let json = """
                {
                    "kpis": {
                        "totalRevenue": 50000.0,
                        "eventsThisMonth": 5,
                        "pendingQuotes": 3,
                        "lowStockItems": 2,
                        "upcomingEvents": 4,
                        "totalClients": 10,
                        "totalProducts": 8,
                        "averageEventValue": 10000.0,
                        "netSalesThisMonth": 25000.0,
                        "cashCollectedThisMonth": 15000.0,
                        "vatCollectedThisMonth": 2400.0,
                        "vatOutstandingThisMonth": 1600.0
                    },
                    "revenueChart": [{"month": "2026-07", "revenue": 1500.0, "eventCount": 2}],
                    "eventsByStatus": [{"status": "confirmed", "count": 4}],
                    "topClients": [{"id": "00000000-0000-0000-0000-000000000001", "name": "Alice", "totalSpent": 20000.0, "totalEvents": 5}],
                    "productDemand": [{"id": "00000000-0000-0000-0000-000000000002", "name": "Pastel", "timesUsed": 15, "totalRevenue": 30000.0}],
                    "forecast": [{"month": "2026-08", "confirmedRevenue": 25000.0, "confirmedEvents": 3}]
                }
                """
                return ok(json.data(using: .utf8)!)
            }
            if urlString.contains("/events") || urlString.contains("/clients")
                || urlString.contains("/inventory") || urlString.contains("/payments") {
                return ok(allEvents)
            }
            // Any unexpected endpoint (e.g. /products) → 404. loadDashboard
            // tolerates list failures, but this also documents that /products
            // is no longer in the call set.
            return (HTTPURLResponse(url: request.url!, statusCode: 404, httpVersion: nil,
                                    headerFields: nil)!, Data())
        }

        await viewModel.loadDashboard()

        // Summary fanned out to chart/widget properties.
        XCTAssertEqual(viewModel.kpis?.totalClients, 10)
        XCTAssertEqual(viewModel.kpis?.totalProducts, 8)
        XCTAssertEqual(viewModel.topClients.count, 1)
        XCTAssertEqual(viewModel.topClients.first?.name, "Alice")
        XCTAssertEqual(viewModel.productDemand.count, 1)
        XCTAssertEqual(viewModel.forecast.count, 1)
        XCTAssertEqual(viewModel.eventStatusCounts[.confirmed], 4)
        XCTAssertEqual(viewModel.monthlyRevenueTrend.count, 6) // padded window

        // totalProducts sourced from KPIs (no /products fetch).
        XCTAssertEqual(viewModel.totalProducts, 8)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertTrue(viewModel.hasLoadedOnce)
    }

    // MARK: - 5. Status Update Logic
    @MainActor
    func testUpdateEventStatusSuccess() async {
        let updatedEvent = Event(
            id: "evt-123",
            userId: "user-1",
            clientId: "client-1",
            eventDate: "2026-07-10T12:00:00Z",
            serviceType: "Catering",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 2000.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )

        MockURLProtocol.requestHandler = { request in
            let urlString = request.url?.absoluteString ?? ""
            if request.httpMethod == "PUT" && urlString.contains("/events/evt-123") {
                let data = try! JSONEncoder().encode(updatedEvent)
                let response = HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: ["Content-Type": "application/json"]
                )!
                return (response, data)
            } else if urlString.contains("/dashboard/kpis") {
                let json = """
                {
                    "totalRevenue": 0.0,
                    "eventsThisMonth": 0,
                    "pendingQuotes": 0,
                    "lowStockItems": 0,
                    "upcomingEvents": 0,
                    "totalClients": 0,
                    "totalProducts": 0,
                    "averageEventValue": 0.0,
                    "netSalesThisMonth": 0.0,
                    "cashCollectedThisMonth": 0.0,
                    "vatCollectedThisMonth": 0.0,
                    "vatOutstandingThisMonth": 0.0
                }
                """
                let response = HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: ["Content-Type": "application/json"]
                )!
                return (response, json.data(using: .utf8)!)
            } else if urlString.contains("/dashboard/events-by-status") || urlString.contains("/dashboard/trailing-trend") || urlString.contains("/events") || urlString.contains("/payments") || urlString.contains("/clients") {
                let response = HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: ["Content-Type": "application/json"]
                )!
                return (response, "[]".data(using: .utf8)!)
            } else {
                let response = HTTPURLResponse(
                    url: request.url!,
                    statusCode: 404,
                    httpVersion: nil,
                    headerFields: nil
                )!
                return (response, Data())
            }
        }

        await viewModel.updateEventStatus(eventId: "evt-123", newStatus: .confirmed)

        XCTAssertNil(viewModel.errorMessage)
        XCTAssertNil(viewModel.updatingEventId)
    }
}

// MARK: - Mock URL Protocol for testing network calls

class MockURLProtocol: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool {
        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        guard let handler = MockURLProtocol.requestHandler else {
            return
        }

        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

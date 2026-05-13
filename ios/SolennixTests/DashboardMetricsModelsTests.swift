import XCTest
import Foundation
import SolennixCore

final class DashboardMetricsModelsTests: XCTestCase {

    func testDashboardKPIsInitPreservesAllFields() {
        let kpis = DashboardKPIs(
            totalRevenue: 150000.25,
            eventsThisMonth: 7,
            pendingQuotes: 4,
            lowStockItems: 3,
            upcomingEvents: 5,
            totalClients: 42,
            averageEventValue: 21428.60,
            netSalesThisMonth: 80000,
            cashCollectedThisMonth: 55000,
            vatCollectedThisMonth: 8800,
            vatOutstandingThisMonth: 3200
        )

        XCTAssertEqual(kpis.totalRevenue, 150000.25)
        XCTAssertEqual(kpis.eventsThisMonth, 7)
        XCTAssertEqual(kpis.pendingQuotes, 4)
        XCTAssertEqual(kpis.lowStockItems, 3)
        XCTAssertEqual(kpis.upcomingEvents, 5)
        XCTAssertEqual(kpis.totalClients, 42)
        XCTAssertEqual(kpis.averageEventValue, 21428.60)
        XCTAssertEqual(kpis.netSalesThisMonth, 80000)
        XCTAssertEqual(kpis.cashCollectedThisMonth, 55000)
        XCTAssertEqual(kpis.vatCollectedThisMonth, 8800)
        XCTAssertEqual(kpis.vatOutstandingThisMonth, 3200)
    }

    func testDashboardKPIsDecodeSnakeCasePayload() throws {
        let json = """
        {
          "total_revenue": 1000.5,
          "events_this_month": 2,
          "pending_quotes": 1,
          "low_stock_items": 0,
          "upcoming_events": 3,
          "total_clients": 8,
          "average_event_value": 500.25,
          "net_sales_this_month": 700.0,
          "cash_collected_this_month": 500.0,
          "vat_collected_this_month": 80.0,
          "vat_outstanding_this_month": 20.0
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let decoded = try decoder.decode(DashboardKPIs.self, from: json)

        XCTAssertEqual(decoded.totalRevenue, 1000.5)
        XCTAssertEqual(decoded.eventsThisMonth, 2)
        XCTAssertEqual(decoded.averageEventValue, 500.25)
        XCTAssertEqual(decoded.vatOutstandingThisMonth, 20.0)
    }

    func testDashboardRevenuePointRoundtripSnakeCaseCoding() throws {
        let original = DashboardRevenuePoint(month: "2026-05", revenue: 12000.5, eventCount: 6)

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try decoder.decode(DashboardRevenuePoint.self, from: data)

        XCTAssertEqual(decoded, original)
    }

    func testDashboardEventStatusCountRoundtripCoding() throws {
        let original = DashboardEventStatusCount(status: "quoted", count: 12)

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(DashboardEventStatusCount.self, from: data)

        XCTAssertEqual(decoded, original)
    }

    func testForecastDataPointDecodeSnakeCasePayload() throws {
        let json = """
        {
          "month": "2026-08",
          "confirmed_revenue": 35000.75,
          "confirmed_event_count": 9
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let point = try decoder.decode(ForecastDataPoint.self, from: json)

        XCTAssertEqual(point.month, "2026-08")
        XCTAssertEqual(point.confirmedRevenue, 35000.75)
        XCTAssertEqual(point.confirmedEventCount, 9)
    }

    func testProductDemandItemInitAndIdentity() {
        let item = ProductDemandItem(id: "prd_1", name: "Taco Bar", timesUsed: 15, totalRevenue: 42000)

        XCTAssertEqual(item.id, "prd_1")
        XCTAssertEqual(item.name, "Taco Bar")
        XCTAssertEqual(item.timesUsed, 15)
        XCTAssertEqual(item.totalRevenue, 42000)
    }

    func testProductDemandItemDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "prd_2",
          "name": "Buffet Premium",
          "times_used": 5,
          "total_revenue": 12500.5
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let item = try decoder.decode(ProductDemandItem.self, from: json)

        XCTAssertEqual(item.id, "prd_2")
        XCTAssertEqual(item.timesUsed, 5)
        XCTAssertEqual(item.totalRevenue, 12500.5)
    }
}

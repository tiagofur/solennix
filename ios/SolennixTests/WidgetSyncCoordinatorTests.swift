import XCTest
import SwiftData
import os.signpost
import SolennixCore
@testable import Solennix

/// Tests for `WidgetSyncCoordinator`: trigger wiring (task 2.1) and the
/// `syncAll()` performance budget (NFR-WDS-01). The coordinator's sync backend
/// is injected as a mock so no WidgetKit/App Group I/O runs here.
@MainActor
final class WidgetSyncCoordinatorTests: XCTestCase {

    /// Retains in-memory containers for the test's lifetime (a released
    /// container invalidates its context).
    private var containers: [ModelContainer] = []

    // MARK: - Trigger wiring (task 2.1)

    func testEventUpdatedNotificationTriggersSync() throws {
        let fixture = makeCoordinator(authenticated: true)
        let exp = expectation(description: "upcoming events synced after .solennixEventUpdated")
        fixture.mock.onUpcomingEvents = { exp.fulfill() }

        NotificationCenter.default.post(name: .solennixEventUpdated, object: nil)
        wait(for: [exp], timeout: 2.0)

        XCTAssertEqual(fixture.mock.upcomingEventsCalls.count, 1)
        XCTAssertEqual(fixture.mock.kpisCalls.count, 1)
    }

    func testPaymentRegisteredNotificationTriggersSync() throws {
        let fixture = makeCoordinator(authenticated: true)
        let exp = expectation(description: "sync after .solennixPaymentRegistered")
        fixture.mock.onKPIs = { exp.fulfill() }

        NotificationCenter.default.post(name: .solennixPaymentRegistered, object: nil)
        wait(for: [exp], timeout: 2.0)
        XCTAssertFalse(fixture.mock.kpisCalls.isEmpty)
    }

    func testLocaleChangeTriggersSync() throws {
        let fixture = makeCoordinator(authenticated: true)
        let exp = expectation(description: "sync after locale change")
        fixture.mock.onUpcomingEvents = { exp.fulfill() }

        NotificationCenter.default.post(name: NSLocale.currentLocaleDidChangeNotification, object: nil)
        wait(for: [exp], timeout: 2.0)
    }

    func testSyncTriggerIgnoredWhenNotAuthenticated() throws {
        let fixture = makeCoordinator(authenticated: false)
        let exp = expectation(description: "should not sync when logged out")
        exp.isInverted = true
        fixture.mock.onUpcomingEvents = { exp.fulfill() }

        NotificationCenter.default.post(name: .solennixEventUpdated, object: nil)
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(fixture.mock.upcomingEventsCalls.isEmpty)
    }

    // MARK: - Derived payload values (closes PR1 gate warning #1)

    /// `deriveKPIs` previously had tests asserting only call COUNTS, never the
    /// derived VALUES. This pins the derivation on the shared fixture so a
    /// regression in filtering (confirmed/quoted), date math, or the
    /// paid-subtraction is caught (REQ from PR1 gate triage #3142).
    func testDeriveKPIsProducesCorrectValues() throws {
        let fixture = makeCoordinator(authenticated: true)
        fixture.coordinator.syncAll()

        // Upcoming events: confirmed-only, today-or-future, ≤5 (issue #802).
        // e_1 (confirmed, +3d) is the only match; e_2 (quoted) is excluded,
        // e_3 (completed, past) is excluded.
        XCTAssertEqual(fixture.mock.upcomingEventsCalls.count, 1)
        XCTAssertEqual(fixture.mock.upcomingEventsCalls[0].count, 1,
                       "only e_1 (confirmed, future) qualifies; quoted e_2 and past e_3 excluded")
        XCTAssertEqual(fixture.mock.upcomingEventsCalls[0][0].id, "e_1")

        let kpis = try XCTUnwrap(fixture.mock.kpisCalls.first)
        XCTAssertEqual(kpis.confirmedEvents, 1, "only e_1 is confirmed")
        // e_1 is a confirmed event inside the 7-day window (amount 1000) with
        // 300 already paid → pending must be 700, proving payments are subtracted.
        XCTAssertEqual(kpis.pendingPayments, 700, accuracy: 0.001,
                       "pendingPayments must subtract cached payments (1000 - 300)")
    }

    /// Regression for #714: production `event.eventDate` is a date-only
    /// `yyyy-MM-dd` string. The buggy `ISO8601DateFormatter().date(from:)`
    /// (default `.withInternetDateTime`) returned `nil` for bare dates, so the
    /// silent `guard … else { return false }` dropped EVERY event from
    /// `eventsThisMonth` / `eventsThisWeek` / `pendingPayments` → those KPIs
    /// rendered 0. The value test above used full-ISO fixtures and so never
    /// caught it; this one pins date-only strings.
    func testDeriveKPIsParsesDateOnlyEventDateStrings() throws {
        let fixture = makeCoordinatorWithDateOnlyEvents(authenticated: true)
        fixture.coordinator.syncAll()

        let kpis = try XCTUnwrap(fixture.mock.kpisCalls.first)

        // Status counts have NO date filter → worked before and after the fix.
        XCTAssertEqual(kpis.confirmedEvents, 2, "two .confirmed events (e_a, e_b)")
        XCTAssertEqual(kpis.quotedEvents, 1, "one .quoted event (e_quoted)")

        // Date-filtered KPIs were structurally 0 with the bug; now non-zero.
        XCTAssertGreaterThan(kpis.eventsThisMonth, 0,
            "eventsThisMonth was 0 when date-only strings failed to parse")
        XCTAssertGreaterThan(kpis.eventsThisWeek, 0,
            "eventsThisWeek was 0 when date-only strings failed to parse")

        // monthlyRevenue cache fallback now sums confirmed + completed events
        // in this month (issue #802): e_a (1000) + e_b (2000) + e_completed
        // (500) = 3500. (e_quoted is excluded; was 500 under the old
        // completed-only filter.)
        XCTAssertEqual(kpis.monthlyRevenue, 3500, accuracy: 0.001,
            "monthlyRevenue must sum this-month confirmed + completed events")

        // e_a (today, 1000) + e_b (+3d, 2000), both .confirmed in the 7-day
        // window with no payments → pendingPayments = 3000.
        XCTAssertEqual(kpis.pendingPayments, 3000, accuracy: 0.001,
            "confirmed events in the 7-day window must surface their full amount")
    }

    // MARK: - WidgetEventData date parsing (hotfix #712)

    /// Regression for #712: `event.eventDate` (a `yyyy-MM-dd` server string) MUST
    /// parse to a `Date` whose LOCAL calendar components match the server string,
    /// regardless of the device timezone. Previously parsed as UTC midnight
    /// (`ISO8601DateFormatter.withFullDate`), which made the widget display one
    /// day earlier for users west of UTC. We assert via `Calendar.current` — the
    /// exact calendar the widget uses to render (`WidgetModels.formattedDate`) —
    /// so this mirrors the user-facing contract. (Fails against the buggy code on
    /// any negative-offset device, e.g. UTC-3 Argentina; passes everywhere once
    /// fixed, because parse-local + `Calendar.current` always agree.)
    func testWidgetEventDataParsesServerDayAsLocalCalendarDay() {
        let event = makeEvent(id: "e_date", clientId: "c_1", status: .confirmed,
                              totalAmount: 1000, eventDate: "2026-07-01")
        let widgetEvent = WidgetEventData.from(event: event, clientName: "Alfa")
        let calendar = Calendar.current

        XCTAssertEqual(calendar.component(.day, from: widgetEvent.eventDate), 1,
                       "server day '2026-07-01' must read as day 1 in the local calendar")
        XCTAssertEqual(calendar.component(.month, from: widgetEvent.eventDate), 7,
                       "server day '2026-07-01' must read as month 7 in the local calendar")
        XCTAssertEqual(calendar.component(.year, from: widgetEvent.eventDate), 2026,
                       "server day '2026-07-01' must read as year 2026 in the local calendar")
    }

    /// Year-boundary companion to #712: the local-midnight parse must also hold
    /// for the last day of the year (no wrap into the next year's components).
    func testWidgetEventDataParsesServerDayAsLocalCalendarDayAtYearBoundary() {
        let event = makeEvent(id: "e_nye", clientId: "c_1", status: .confirmed,
                              totalAmount: 1000, eventDate: "2026-12-31")
        let widgetEvent = WidgetEventData.from(event: event, clientName: "Alfa")
        let calendar = Calendar.current

        XCTAssertEqual(calendar.component(.day, from: widgetEvent.eventDate), 31,
                       "server day '2026-12-31' must read as day 31 in the local calendar")
        XCTAssertEqual(calendar.component(.month, from: widgetEvent.eventDate), 12,
                       "server day '2026-12-31' must read as month 12 in the local calendar")
        XCTAssertEqual(calendar.component(.year, from: widgetEvent.eventDate), 2026)
    }

    // MARK: - Issue #802: server KPI override + calendar week + upcoming parity

    /// Server-aggregated KPIs posted via `.solennixDashboardKPIsRefreshed` must
    /// override the cache-derived values for revenue, month count, and low stock
    /// so the widget matches the dashboard (issue #802, divergences #1/#4).
    func testServerKPIsOverrideCacheDerivation() throws {
        let fixture = makeCoordinatorWithDateOnlyEvents(authenticated: true)

        // Post server KPIs with deliberately different values than the cache.
        let server = DashboardKPIs(
            totalRevenue: 99999, eventsThisMonth: 42, pendingQuotes: 0,
            lowStockItems: 7, upcomingEvents: 0, totalClients: 0,
            averageEventValue: 0, netSalesThisMonth: 12345.0,
            cashCollectedThisMonth: 0, vatCollectedThisMonth: 0,
            vatOutstandingThisMonth: 0
        )
        let exp = expectation(description: "sync after server KPIs")
        fixture.mock.onKPIs = { exp.fulfill() }
        NotificationCenter.default.post(
            name: .solennixDashboardKPIsRefreshed, object: nil,
            userInfo: ["kpis": server]
        )
        wait(for: [exp], timeout: 2.0)

        let kpis = try XCTUnwrap(fixture.mock.kpisCalls.last)
        XCTAssertEqual(kpis.monthlyRevenue, 12345.0, accuracy: 0.001,
                       "server netSalesThisMonth must override cache sum")
        XCTAssertEqual(kpis.eventsThisMonth, 42,
                       "server eventsThisMonth must override cache count")
        XCTAssertEqual(kpis.lowStockCount, 7,
                       "server lowStockItems must override cache count")
    }

    /// Server-KPI trigger ignored when logged out (auth gate parity).
    func testServerKPIsIgnoredWhenNotAuthenticated() throws {
        let fixture = makeCoordinator(authenticated: false)
        let exp = expectation(description: "no sync when logged out")
        exp.isInverted = true
        fixture.mock.onKPIs = { exp.fulfill() }

        let server = DashboardKPIs(
            totalRevenue: 0, eventsThisMonth: 0, pendingQuotes: 0,
            lowStockItems: 0, upcomingEvents: 0, totalClients: 0,
            averageEventValue: 0, netSalesThisMonth: 0,
            cashCollectedThisMonth: 0, vatCollectedThisMonth: 0,
            vatOutstandingThisMonth: 0
        )
        NotificationCenter.default.post(
            name: .solennixDashboardKPIsRefreshed, object: nil,
            userInfo: ["kpis": server]
        )
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(fixture.mock.kpisCalls.isEmpty)
    }

    /// `eventsThisWeek` must use a true calendar-week interval (issue #802,
    /// divergence #2), not the old rolling 7-day window. An event 6 days ago
    /// but still within the same calendar week counts; an event yesterday that
    /// fell into the previous week does not.
    func testEventsThisWeekUsesCalendarWeek() throws {
        let cache = try makeCacheManager()
        try cache.cacheClients([
            Client(id: "c_1", userId: "u_1", name: "Alfa", phone: "55",
                   createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z")
        ])
        let calendar = Calendar.current
        let weekInterval = calendar.dateInterval(of: .weekOfYear, for: Date())!
        let inWeekOffset = weekInterval.end.timeIntervalSinceNow > 0
            ? min(3 * 24 * 3600.0, weekInterval.end.timeIntervalSinceNow - 1)
            : 24 * 3600.0
        let inWeekDate = Date().addingTimeInterval(inWeekOffset)
        // An event dated 10 days out — definitely outside the calendar week.
        let outOfWeekDate = calendar.date(byAdding: .day, value: 10, to: Date())!
        try cache.cacheEvents([
            makeEvent(id: "e_in", clientId: "c_1", status: .confirmed,
                      totalAmount: 100, eventDate: localDayStringFromDate(inWeekDate)),
            makeEvent(id: "e_out", clientId: "c_1", status: .confirmed,
                      totalAmount: 200, eventDate: localDayStringFromDate(outOfWeekDate))
        ])
        let mock = MockWidgetSyncing()
        let coordinator = WidgetSyncCoordinator(sync: mock)
        coordinator.start(cache: cache, isAuthorized: { true })
        coordinator.syncAll()

        let kpis = try XCTUnwrap(mock.kpisCalls.first)
        XCTAssertEqual(kpis.eventsThisWeek, 1,
                       "only the in-calendar-week event counts; 10-day-out event excluded")
    }

    /// Upcoming events must be confirmed-only, today-or-future, sorted ascending
    /// by date, and capped at 5 — matching the dashboard (issue #802, #3).
    func testUpcomingEventsConfirmedOnlyFutureSortedCapped() throws {
        let cache = try makeCacheManager()
        try cache.cacheClients([
            Client(id: "c_1", userId: "u_1", name: "Alfa", phone: "55",
                   createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z")
        ])
        try cache.cacheEvents([
            // Past confirmed — excluded by the future filter.
            makeEvent(id: "e_past", clientId: "c_1", status: .confirmed,
                      totalAmount: 100, eventDate: localDayString(offset: -3)),
            // Quoted future — excluded by the confirmed-only filter.
            makeEvent(id: "e_quoted", clientId: "c_1", status: .quoted,
                      totalAmount: 100, eventDate: localDayString(offset: 2)),
            // Confirmed future, deliberately out of date order in the array.
            makeEvent(id: "e_c", clientId: "c_1", status: .confirmed,
                      totalAmount: 100, eventDate: localDayString(offset: 9)),
            makeEvent(id: "e_a", clientId: "c_1", status: .confirmed,
                      totalAmount: 100, eventDate: localDayString(offset: 1)),
            makeEvent(id: "e_b", clientId: "c_1", status: .confirmed,
                      totalAmount: 100, eventDate: localDayString(offset: 5)),
        ])
        let mock = MockWidgetSyncing()
        let coordinator = WidgetSyncCoordinator(sync: mock)
        coordinator.start(cache: cache, isAuthorized: { true })
        coordinator.syncAll()

        let upcoming = try XCTUnwrap(mock.upcomingEventsCalls.first)
        XCTAssertEqual(upcoming.map(\.id), ["e_a", "e_b", "e_c"],
                       "confirmed-only, future, ascending by date; e_past and e_quoted excluded")
    }

    // MARK: - Performance (NFR-WDS-01)

    /// `syncAll()` p95 wall-clock must stay under 50ms. It reads the local
    /// SwiftData main context only (no network), so the budget is deterministic.
    /// `os.signpost` wraps each iteration for Instruments cross-check (D14).
    func testSyncAllP95Under50ms() throws {
        let fixture = makeCoordinator(authenticated: true)
        let signposter = OSSignposter(subsystem: "com.solennix.app", category: "WidgetSyncPerf")

        for _ in 0..<5 { fixture.coordinator.syncAll() } // warmup

        let iterations = 30
        var samples: [TimeInterval] = []
        for index in 0..<iterations {
            let id = signposter.makeSignpostID()
            let state = signposter.beginInterval("syncAll", id: id, "iter-\(index)")
            let start = Date()
            fixture.coordinator.syncAll()
            samples.append(Date().timeIntervalSince(start))
            signposter.endInterval("syncAll", state)
        }

        samples.sort()
        let p95Index = min(Int(Double(iterations) * 0.95), iterations - 1)
        let p95ms = samples[p95Index] * 1000
        XCTAssertLessThan(p95ms, 50.0, "syncAll() p95=\(p95ms)ms exceeds 50ms budget (NFR-WDS-01)")
    }

    /// Xcode-integrated wall-clock recording (`XCTClockMetric` is the wall-clock
    /// metric; `XCTMetric(.wallClockKey)` is not constructable in this toolchain).
    func testSyncAllWallClockMetric() throws {
        let fixture = makeCoordinator(authenticated: true)
        let options = XCTMeasureOptions()
        options.iterationCount = 15
        measure(metrics: [XCTClockMetric()], options: options) {
            fixture.coordinator.syncAll()
        }
    }

    // MARK: - Helpers

    private func makeCoordinator(authenticated: Bool) -> CoordinatorFixture {
        let cache = try! makeCacheManagerWithData()
        let mock = MockWidgetSyncing()
        let coordinator = WidgetSyncCoordinator(sync: mock)
        coordinator.start(cache: cache, isAuthorized: { authenticated })
        return CoordinatorFixture(coordinator: coordinator, mock: mock, cache: cache)
    }

    private func makeCacheManagerWithData() throws -> CacheManager {
        let cache = try makeCacheManager()
        try cache.cacheClients([
            Client(id: "c_1", userId: "u_1", name: "Alfa", phone: "55", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z"),
            Client(id: "c_2", userId: "u_1", name: "Beta", phone: "56", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z")
        ])
        let now = Date()
        let calendar = Calendar.current
        let formatter = ISO8601DateFormatter()
        func dateStr(dayOffset: Int) -> String {
            formatter.string(from: calendar.date(byAdding: .day, value: dayOffset, to: now)!)
        }
        try cache.cacheEvents([
            makeEvent(id: "e_1", clientId: "c_1", status: .confirmed, totalAmount: 1000, eventDate: dateStr(dayOffset: 3)),
            makeEvent(id: "e_2", clientId: "c_2", status: .quoted, totalAmount: 2000, eventDate: dateStr(dayOffset: 10)),
            makeEvent(id: "e_3", clientId: "c_1", status: .completed, totalAmount: 5000, eventDate: dateStr(dayOffset: -5))
        ])
        // A cached payment against e_1 so deriveKPIs value tests can prove the
        // pending-payments figure SUBTRACTS what is already paid (PR1 gate
        // warning #1). e_1 = 1000, paid 300 → pending 700.
        try cache.cachePayments([
            Payment(id: "p_1", eventId: "e_1", userId: "u_1", amount: 300,
                    paymentDate: dateStr(dayOffset: 1), paymentMethod: "cash",
                    createdAt: "2026-01-01T00:00:00Z")
        ])
        return cache
    }

    private func makeCoordinatorWithDateOnlyEvents(authenticated: Bool) -> CoordinatorFixture {
        let cache = try! makeCacheManagerWithDateOnlyEvents()
        let mock = MockWidgetSyncing()
        let coordinator = WidgetSyncCoordinator(sync: mock)
        coordinator.start(cache: cache, isAuthorized: { authenticated })
        return CoordinatorFixture(coordinator: coordinator, mock: mock, cache: cache)
    }

    /// Production-shaped fixture: `event.eventDate` is a date-only `yyyy-MM-dd`
    /// string (LOCAL-anchored, the shape `Date.fromServerDayLocal` parses and
    /// the shape the buggy `ISO8601DateFormatter()` returned nil for).
    private func makeCacheManagerWithDateOnlyEvents() throws -> CacheManager {
        let cache = try makeCacheManager()
        try cache.cacheClients([
            Client(id: "c_1", userId: "u_1", name: "Alfa", phone: "55",
                   createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z")
        ])
        try cache.cacheEvents([
            makeEvent(id: "e_a",         clientId: "c_1", status: .confirmed, totalAmount: 1000, eventDate: localDayString(offset: 0)),
            makeEvent(id: "e_b",         clientId: "c_1", status: .confirmed, totalAmount: 2000, eventDate: localDayString(offset: 3)),
            makeEvent(id: "e_completed", clientId: "c_1", status: .completed, totalAmount: 500,  eventDate: localDayString(offset: 0)),
            makeEvent(id: "e_quoted",    clientId: "c_1", status: .quoted,    totalAmount: 3000, eventDate: localDayString(offset: 10))
        ])
        return cache
    }

    /// `yyyy-MM-dd` string for `offset` days from now in the LOCAL timezone.
    private func localDayString(offset: Int) -> String {
        let dayFormatter = DateFormatter()
        dayFormatter.locale = Locale(identifier: "en_US_POSIX")
        dayFormatter.dateFormat = "yyyy-MM-dd"
        dayFormatter.timeZone = .current
        let date = Calendar.current.date(byAdding: .day, value: offset, to: Date())!
        return dayFormatter.string(from: date)
    }

    /// `yyyy-MM-dd` string for an absolute `Date` in the LOCAL timezone.
    private func localDayStringFromDate(_ date: Date) -> String {
        let dayFormatter = DateFormatter()
        dayFormatter.locale = Locale(identifier: "en_US_POSIX")
        dayFormatter.dateFormat = "yyyy-MM-dd"
        dayFormatter.timeZone = .current
        return dayFormatter.string(from: date)
    }

    private func makeCacheManager() throws -> CacheManager {
        let schema = Schema([
            CachedClient.self,
            CachedEvent.self,
            CachedProduct.self,
            CachedInventoryItem.self,
            CachedPayment.self
        ])
        let configuration = ModelConfiguration(
            "WidgetSyncCoordinatorTests-\(UUID().uuidString)",
            schema: schema,
            isStoredInMemoryOnly: true
        )
        let container = try ModelContainer(for: schema, configurations: [configuration])
        containers.append(container)
        return CacheManager(modelContext: container.mainContext)
    }

    private func makeEvent(
        id: String,
        clientId: String,
        status: EventStatus,
        totalAmount: Double,
        eventDate: String
    ) -> Event {
        Event(
            id: id, userId: "u_1", clientId: clientId, eventDate: eventDate,
            startTime: "18:00", endTime: "23:00", serviceType: "Boda", numPeople: 100,
            status: status, discount: 0, discountType: .percent, requiresInvoice: false,
            taxRate: 0, taxAmount: 0, totalAmount: totalAmount, location: "Salón",
            createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z"
        )
    }
}

// MARK: - Fixtures

@MainActor
private final class CoordinatorFixture {
    let coordinator: WidgetSyncCoordinator
    let mock: MockWidgetSyncing
    /// Retained for the test's lifetime because the coordinator holds it weakly.
    private let cache: CacheManager
    init(coordinator: WidgetSyncCoordinator, mock: MockWidgetSyncing, cache: CacheManager) {
        self.coordinator = coordinator
        self.mock = mock
        self.cache = cache
    }
    // Observers use [weak self] on the coordinator, so when the fixture (and its
    // coordinator) dealloc the observer blocks become no-ops; there is no
    // retain cycle. `stop()` is intentionally not called from deinit because
    // deinit is nonisolated and `stop()` is main-actor-isolated.
}

@MainActor
private final class MockWidgetSyncing: WidgetSyncing {
    var upcomingEventsCalls: [[WidgetEventData]] = []
    var kpisCalls: [WidgetKPIData] = []
    var onUpcomingEvents: (() -> Void)?
    var onKPIs: (() -> Void)?

    func syncUpcomingEvents(_ events: [WidgetEventData]) {
        upcomingEventsCalls.append(events)
        onUpcomingEvents?()
    }
    func syncKPIs(_ kpis: WidgetKPIData) {
        kpisCalls.append(kpis)
        onKPIs?()
    }
    func syncUserPlan(_ planRawValue: String?) {}
    func setAuthState(_ state: WidgetAuthState) {}
    func clearWidgetData() {}
    func reloadEventWidgets() {}
    func reloadKPIWidgets() {}
}

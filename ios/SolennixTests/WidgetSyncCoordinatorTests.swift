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
        return cache
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

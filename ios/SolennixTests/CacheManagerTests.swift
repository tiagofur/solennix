import XCTest
import SwiftData
import SolennixCore

@MainActor
final class CacheManagerTests: XCTestCase {

    private var userDefaults: UserDefaults!
    private var userDefaultsSuiteName: String!
    private var containers: [ModelContainer]!

    override func setUp() {
        super.setUp()
        userDefaultsSuiteName = "CacheManagerTests-\(UUID().uuidString)"
        userDefaults = UserDefaults(suiteName: userDefaultsSuiteName)!
        userDefaults.removePersistentDomain(forName: userDefaultsSuiteName)
        containers = []
    }

    override func tearDown() {
        if let userDefaults {
            userDefaults.removePersistentDomain(forName: userDefaultsSuiteName)
        }
        userDefaults = nil
        userDefaultsSuiteName = nil
        containers = nil
        super.tearDown()
    }

    private func makeManager() throws -> CacheManager {
        let schema = Schema([
            CachedClient.self,
            CachedEvent.self,
            CachedProduct.self,
            CachedInventoryItem.self,
            CachedPayment.self
        ])
        let configuration = ModelConfiguration(
            "CacheManagerTests-\(UUID().uuidString)",
            schema: schema,
            isStoredInMemoryOnly: true
        )
        let container = try ModelContainer(for: schema, configurations: [configuration])
        containers.append(container)
        return CacheManager(modelContext: container.mainContext, userDefaults: userDefaults)
    }

    func testCacheClientsReplacesAndSortsByName() throws {
        let manager = try makeManager()

        let clients = [
            Client(id: "c_2", userId: "u_1", name: "Zeta", phone: "2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z"),
            Client(id: "c_1", userId: "u_1", name: "Alfa", phone: "1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z")
        ]

        try manager.cacheClients(clients)
        let cached = try manager.getCachedClients()

        XCTAssertEqual(cached.map(\.name), ["Alfa", "Zeta"])
        XCTAssertEqual(cached.map(\.id), ["c_1", "c_2"])
    }

    func testCachePaymentsFiltersByEventAndSortsNewestFirst() throws {
        let manager = try makeManager()

                let paymentJSON = [
                        """
                        {
                            "id": "p_1",
                            "event_id": "ev_1",
                            "user_id": "u_1",
                            "amount": 100,
                            "payment_date": "2026-03-01",
                            "payment_method": "transfer",
                            "notes": null,
                            "created_at": "2026-03-01T00:00:00Z"
                        }
                        """,
                        """
                        {
                            "id": "p_2",
                            "event_id": "ev_2",
                            "user_id": "u_1",
                            "amount": 200,
                            "payment_date": "2026-03-03",
                            "payment_method": "cash",
                            "notes": "out",
                            "created_at": "2026-03-03T00:00:00Z"
                        }
                        """,
                        """
                        {
                            "id": "p_3",
                            "event_id": "ev_1",
                            "user_id": "u_1",
                            "amount": 300,
                            "payment_date": "2026-03-05",
                            "payment_method": "card",
                            "notes": "in",
                            "created_at": "2026-03-05T00:00:00Z"
                        }
                        """
                ]

                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                let payments = try paymentJSON.map { try decoder.decode(Payment.self, from: Data($0.utf8)) }

        try manager.cachePayments(payments)
        let cached = try manager.getCachedPayments(eventId: "ev_1")

        XCTAssertEqual(cached.map(\.id), ["p_3", "p_1"])
        XCTAssertEqual(cached.map(\.paymentMethod), ["card", "transfer"])
    }

    func testGetCachedClientsRespectsMaxAge() throws {
        let manager = try makeManager()

                let clientJSON = """
                {
                    "id": "c_1",
                    "user_id": "u_1",
                    "name": "Ana",
                    "phone": "1",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-02T00:00:00Z"
                }
                """.data(using: .utf8)!

                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                let client = try decoder.decode(Client.self, from: clientJSON)

                try manager.cacheClients([client])

        userDefaults.set(Date(timeIntervalSince1970: 0), forKey: "solennix.cache.updatedAt.clients")

        let cached = try manager.getCachedClients(maxAge: 60)

        XCTAssertTrue(cached.isEmpty)
    }

    func testClearAllRemovesStoredModels() throws {
        let manager = try makeManager()

        try manager.cacheProducts([
            Product(id: "prd_1", userId: "u_1", name: "Paquete", category: "Servicio", basePrice: 1000, recipe: nil, imageUrl: nil, staffTeamId: nil, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z")
        ])

        try manager.clearAll()
        let cached = try manager.getCachedProducts()

        XCTAssertTrue(cached.isEmpty)
    }

    // MARK: - Single-payment mutations (#803)

    /// `upsertCachedPayment` must insert a new payment without wiping
    /// pre-existing ones, and updating the same id must mutate in place
    /// rather than creating a duplicate row. This is the foreground path
    /// `EventDetailViewModel.addPayment` relies on so the widget sees the
    /// payment immediately (before the background refresh does a full
    /// `cachePayments` wipe+insert).
    func testUpsertCachedPaymentInsertsThenUpdates() throws {
        let manager = try makeManager()

        // Seed a payment for a different event; the upsert must NOT drop it.
        let other = Payment(id: "p_other", eventId: "ev_2", userId: "u_1",
                            amount: 200, paymentDate: "2026-03-03",
                            paymentMethod: "cash", createdAt: "2026-03-03T00:00:00Z")
        try manager.cachePayments([other])

        // Insert a new payment for ev_1.
        let payment = Payment(id: "p_1", eventId: "ev_1", userId: "u_1",
                              amount: 300, paymentDate: "2026-03-05",
                              paymentMethod: "cash", createdAt: "2026-03-05T00:00:00Z")
        try manager.upsertCachedPayment(payment)

        var ev1 = try manager.getCachedPayments(eventId: "ev_1")
        XCTAssertEqual(ev1.count, 1, "upsert must insert a single payment")
        XCTAssertEqual(try XCTUnwrap(ev1.first?.amount), 300, accuracy: 0.001)
        XCTAssertEqual(try manager.getCachedPayments(eventId: "ev_2").count, 1,
                       "upsert must not wipe payments for other events")

        // Update the same id: amount changes, no duplicate row.
        let updated = Payment(id: payment.id, eventId: payment.eventId,
                              userId: payment.userId, amount: 500,
                              paymentDate: payment.paymentDate,
                              paymentMethod: payment.paymentMethod,
                              createdAt: payment.createdAt)
        try manager.upsertCachedPayment(updated)

        ev1 = try manager.getCachedPayments(eventId: "ev_1")
        XCTAssertEqual(ev1.count, 1, "upsert must update in place, not duplicate")
        XCTAssertEqual(try XCTUnwrap(ev1.first?.amount), 500, accuracy: 0.001,
                       "upsert must reflect the new amount")
    }

    /// `deleteCachedPayment` must remove only the targeted id and leave other
    /// payments intact — the contract `EventDetailViewModel.deletePayment`
    /// depends on so the widget drops a deleted payment immediately.
    func testDeleteCachedPaymentRemovesOnlyTargetId() throws {
        let manager = try makeManager()

        let p1 = Payment(id: "p_1", eventId: "ev_1", userId: "u_1",
                         amount: 300, paymentDate: "2026-03-05",
                         paymentMethod: "cash", createdAt: "2026-03-05T00:00:00Z")
        let p2 = Payment(id: "p_2", eventId: "ev_1", userId: "u_1",
                         amount: 700, paymentDate: "2026-03-06",
                         paymentMethod: "card", createdAt: "2026-03-06T00:00:00Z")
        try manager.cachePayments([p1, p2])

        try manager.deleteCachedPayment(id: "p_1")

        let remaining = try manager.getCachedPayments(eventId: "ev_1")
        XCTAssertEqual(remaining.map(\.id), ["p_2"], "only the targeted id is removed")
        XCTAssertEqual(try XCTUnwrap(remaining.first?.amount), 700, accuracy: 0.001)
    }

    /// Deleting an unknown id is a no-op (the widget cache may not yet have
    /// been populated by the background refresh).
    func testDeleteCachedPaymentUnknownIdIsNoOp() throws {
        let manager = try makeManager()

        let p1 = Payment(id: "p_1", eventId: "ev_1", userId: "u_1",
                         amount: 300, paymentDate: "2026-03-05",
                         paymentMethod: "cash", createdAt: "2026-03-05T00:00:00Z")
        try manager.cachePayments([p1])

        try manager.deleteCachedPayment(id: "p_unknown")

        XCTAssertEqual(try manager.getCachedPayments(eventId: "ev_1").count, 1)
    }
}

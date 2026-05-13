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
}

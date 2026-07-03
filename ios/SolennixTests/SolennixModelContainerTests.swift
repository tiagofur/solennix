import XCTest
import SwiftData
@testable import SolennixCore

final class SolennixModelContainerTests: XCTestCase {

    /// The versioned schema must be usable for a real round-trip (insert +
    /// fetch) on an in-memory store, proving SchemaV1 matches the live
    /// `@Model`s and the migration plan is valid for container init.
    func testSchemaV1_supportsRoundTripInMemory() throws {
        let config = ModelConfiguration(
            "SolennixCacheTest",
            schema: SchemaV1.schema,
            isStoredInMemoryOnly: true
        )
        let container = try ModelContainer(
            for: SchemaV1.schema,
            migrationPlan: SolennixMigrationPlan.self,
            configurations: [config]
        )
        let context = ModelContext(container)
        let now = ISO8601DateFormatter().string(from: Date())
        let cached = CachedEvent(
            id: "evt-test",
            userId: "u", clientId: "c", eventDate: "2026-07-03",
            serviceType: "Boda", numPeople: 10,
            statusRawValue: "quoted",
            discount: 0, discountTypeRawValue: "fixed",
            requiresInvoice: false, taxRate: 0, taxAmount: 0, totalAmount: 1000,
            createdAt: now, updatedAt: now
        )
        context.insert(cached)
        try context.save()
        let fetched = try context.fetch(FetchDescriptor<CachedEvent>())
        XCTAssertEqual(fetched.count, 1)
        XCTAssertEqual(fetched.first?.id, "evt-test")
    }

    /// `SchemaV1` must enumerate exactly the five cached models — keeps the
    /// versioned schema in sync if a model is added/removed.
    func testSchemaV1_listsFiveCachedModels() {
        let names = Set(SchemaV1.models.map { String(describing: $0) })
        XCTAssertEqual(names, [
            "CachedClient", "CachedEvent", "CachedProduct",
            "CachedInventoryItem", "CachedPayment"
        ])
    }

    /// The migration plan is single-version (V1 → V1) with no stages today;
    /// adding a model change without bumping the plan would silently fail to
    /// migrate. Lock the current shape so a future change is intentional.
    func testMigrationPlan_isSingleVersionWithNoStages() {
        XCTAssertEqual(SolennixMigrationPlan.schemas.count, 1)
        XCTAssertTrue(SolennixMigrationPlan.stages.isEmpty)
    }
}

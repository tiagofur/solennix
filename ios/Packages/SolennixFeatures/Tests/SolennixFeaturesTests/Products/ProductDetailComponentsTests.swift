import XCTest
import SwiftUI
import SnapshotTesting
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Snapshot tests for the pure presentational sub-components decomposed out of
/// `ProductDetailView` (ADR-8 seam-based testing). These structs take only
/// plain props (no ViewModel, no network) — pinning their layout guards against
/// accidental visual regressions when the parent view is edited.
///
/// First run WRITES the reference snapshot (`__Snapshots__/.../<name>.png`);
/// subsequent runs assert against it. `ProductIngredient` is decoded from JSON
/// because its memberwise init is internal to `SolennixCore`.
final class ProductDetailComponentsTests: XCTestCase {

    private func ingredients(_ json: String) -> [ProductIngredient] {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try! decoder.decode([ProductIngredient].self, from: Data(json.utf8))
    }

    // MARK: - ProductDetailCompositionSection

    func testCompositionSectionWithItemsAndTotalFooter() {
        // ingredient 2u @ $10, supply 4u @ $5 -> total cost 40.
        let items = ingredients("""
        [
            {"id":"i1","product_id":"p1","inventory_id":"inv-1","quantity_required":2,"created_at":"2026-01-01T00:00:00Z","unit_cost":10,"type":"ingredient","ingredient_name":"Harina","unit":"kg"},
            {"id":"i2","product_id":"p1","inventory_id":"inv-2","quantity_required":4,"created_at":"2026-01-01T00:00:00Z","unit_cost":5,"type":"supply","ingredient_name":"Servilletas","unit":"pza"}
        ]
        """)
        let section = ProductDetailCompositionSection(
            title: "Composición",
            icon: "leaf.fill",
            iconColor: .green,
            items: items,
            dynamicTypeSize: .large,
            showCost: true,
            badge: "2 ítems",
            totalLabel: "Costo estimado",
            totalValue: 40
        )
        assertSnapshot(
            of: section.padding(),
            as: .image(layout: .fixed(width: 360, height: 360)),
            testName: "composition-with-total"
        )
    }

    func testCompositionSectionWithoutCostOrFooter() {
        // Minimal variant: no cost column, no badge, no footer.
        let items = ingredients("""
        [
            {"id":"i1","product_id":"p1","inventory_id":"inv-1","quantity_required":1.5,"created_at":"2026-01-01T00:00:00Z","type":"ingredient","ingredient_name":"Azúcar","unit":"kg"}
        ]
        """)
        let section = ProductDetailCompositionSection(
            title: "Ingredientes",
            icon: "cart.fill",
            iconColor: .orange,
            items: items,
            dynamicTypeSize: .large
        )
        assertSnapshot(
            of: section.padding(),
            as: .image(layout: .fixed(width: 360, height: 220)),
            testName: "composition-minimal"
        )
    }

    // MARK: - ProductDetailSmartAlert

    func testSmartAlertUrgentVariantWithRevenue() {
        // High demand (demand7Days > 0) + positive revenue -> urgent banner.
        let alert = ProductDetailSmartAlert(
            demand7Days: 25,
            hasDemand: true,
            estimatedRevenue7Days: 3750,
            totalDemand: 40,
            eventCount: 3
        )
        assertSnapshot(
            of: alert.padding(),
            as: .image(layout: .fixed(width: 360, height: 120)),
            testName: "smart-alert-urgent"
        )
    }

    func testSmartAlertOkVariantNoDemand() {
        // No upcoming demand, no events -> calm "ok" banner.
        let alert = ProductDetailSmartAlert(
            demand7Days: 0,
            hasDemand: false,
            estimatedRevenue7Days: 0,
            totalDemand: 0,
            eventCount: 0
        )
        assertSnapshot(
            of: alert.padding(),
            as: .image(layout: .fixed(width: 360, height: 120)),
            testName: "smart-alert-ok"
        )
    }
}

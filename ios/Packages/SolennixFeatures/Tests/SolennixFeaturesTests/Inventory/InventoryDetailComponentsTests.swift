import XCTest
import SwiftUI
import SnapshotTesting
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Snapshot tests for the pure presentational sub-components decomposed out of
/// `InventoryDetailView` (ADR-8). Each struct takes only plain props — no
/// ViewModel, no network. Pinning layout guards against accidental visual
/// regressions when the parent view is edited.
///
/// First run WRITES the reference snapshot; subsequent runs assert against it.
final class InventoryDetailComponentsTests: XCTestCase {

    // MARK: - InventoryKPICard

    func testKPICardWithValueVariant() {
        let card = InventoryKPICard(
            icon: "dollarsign.circle.fill",
            iconColor: .blue,
            label: "Costo unitario",
            value: "$10.00",
            subtitle: "Por kg",
            a11yLabel: "Costo unitario: $10.00"
        )
        assertSnapshot(
            of: card.padding(),
            as: .image(layout: .fixed(width: 360, height: 110)),
            testName: "kpi-card-value"
        )
    }

    func testKPICardWithDashVariant() {
        // EmDash variant used when unitCost is nil.
        let card = InventoryKPICard(
            icon: "chart.bar.fill",
            iconColor: .blue,
            label: "Valor inventario",
            value: "—",
            subtitle: "Valor total",
            a11yLabel: "Valor inventario: no disponible"
        )
        assertSnapshot(
            of: card.padding(),
            as: .image(layout: .fixed(width: 360, height: 110)),
            testName: "kpi-card-dash"
        )
    }

    // MARK: - InventoryHealthBar

    func testHealthBarFullFraction() {
        let bar = InventoryHealthBar(
            label: "Stock vs mínimo",
            value: "120%",
            fraction: 1.0,
            color: .green
        )
        assertSnapshot(
            of: bar.padding(),
            as: .image(layout: .fixed(width: 360, height: 70)),
            testName: "health-bar-full"
        )
    }

    func testHealthBarLowFraction() {
        let bar = InventoryHealthBar(
            label: "Stock vs mínimo",
            value: "30%",
            fraction: 0.3,
            color: .red
        )
        assertSnapshot(
            of: bar.padding(),
            as: .image(layout: .fixed(width: 360, height: 70)),
            testName: "health-bar-low"
        )
    }

    // MARK: - InventoryDemandRow

    func testDemandRowWithinWeek() {
        // A healthy row (running balance positive) within the 7-day window.
        let entry = InventoryDemandEntry(
            id: "e1",
            eventDate: Date.fromServerDay("2026-07-31")!,
            eventName: "Boda García",
            quantity: 4,
            unit: "kg"
        )
        let row = DemandRowData(entry: entry, runningBalance: 6, isInsufficient: false, diffDays: 2)
        assertSnapshot(
            of: InventoryDemandRow(row: row).padding(),
            as: .image(layout: .fixed(width: 360, height: 90)),
            testName: "demand-row-within-week"
        )
    }

    func testDemandRowInsufficient() {
        // Negative running balance -> error styling.
        let entry = InventoryDemandEntry(
            id: "e2",
            eventDate: Date.fromServerDay("2026-08-01")!,
            eventName: "Cumpleaños López",
            quantity: 8,
            unit: "kg"
        )
        let row = DemandRowData(entry: entry, runningBalance: -2, isInsufficient: true, diffDays: 1)
        assertSnapshot(
            of: InventoryDemandRow(row: row).padding(),
            as: .image(layout: .fixed(width: 360, height: 90)),
            testName: "demand-row-insufficient"
        )
    }
}

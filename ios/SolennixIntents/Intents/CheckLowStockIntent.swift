import AppIntents
import SwiftUI

// MARK: - Check Low Stock Intent

struct CheckLowStockIntent: AppIntent {

    static var title: LocalizedStringResource = "Revisar Stock Bajo"
    static var description = IntentDescription("Muestra los items de inventario con stock bajo")

    static var openAppWhenRun: Bool = false

    nonisolated init() {}

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        guard IntentSharedDataStore.hasProAccess else {
            return .result(
                dialog: "Plan Pro requerido para usar este atajo.",
                view: PlanRequiredSnippetView()
            )
        }

        let lowStockCount = await fetchLowStockCount()

        if lowStockCount == 0 {
            return .result(
                dialog: "Todo tu inventario esta en orden. No hay items con stock bajo.",
                view: AllStockOKView()
            )
        }

        let itemWord = lowStockCount == 1 ? "item" : "items"
        return .result(
            dialog: "Tienes \(lowStockCount) \(itemWord) con stock bajo que necesitan atencion.",
            view: LowStockSummarySnippetView(count: lowStockCount)
        )
    }

    private func fetchLowStockCount() async -> Int {
        IntentSharedDataStore.loadKPIs()?.lowStockCount ?? 0
    }
}

// MARK: - Low Stock Item Model

struct LowStockItem: Identifiable {
    let id: String
    let name: String
    let currentStock: Int
    let minimumStock: Int
    let unit: String

    var percentageRemaining: Double {
        guard minimumStock > 0 else { return 0 }
        return Double(currentStock) / Double(minimumStock)
    }

    var isCritical: Bool {
        percentageRemaining < 0.25
    }
}

// MARK: - Snippet Views

struct LowStockSummarySnippetView: View {
    let count: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
                Text("Stock Bajo")
                    .font(.headline)
                Spacer()
                Text("\(count)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red)
                    .clipShape(Capsule())
            }

            Text("Abrite Inventario en Solennix para revisar el detalle por item y reponer stock.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding()
    }
}

struct AllStockOKView: View {
    @ScaledMetric(relativeTo: .body) private var successIconSize: CGFloat = 48
    private var cappedSuccessIconSize: CGFloat { min(successIconSize, 64) }

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: cappedSuccessIconSize))
                .foregroundStyle(.green)

            Text("Inventario OK")
                .font(.headline)

            Text("Todos los items estan por encima del minimo")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

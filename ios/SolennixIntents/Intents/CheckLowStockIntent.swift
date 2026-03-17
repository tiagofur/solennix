import AppIntents
import SwiftUI

// MARK: - Check Low Stock Intent

struct CheckLowStockIntent: AppIntent {

    static var title: LocalizedStringResource = "Revisar Stock Bajo"
    static var description = IntentDescription("Muestra los items de inventario con stock bajo")

    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        let lowStockItems = await fetchLowStockItems()

        if lowStockItems.isEmpty {
            return .result(
                dialog: "Todo tu inventario esta en orden. No hay items con stock bajo.",
                view: AllStockOKView()
            )
        }

        let itemWord = lowStockItems.count == 1 ? "item" : "items"
        return .result(
            dialog: "Tienes \(lowStockItems.count) \(itemWord) con stock bajo que necesitan atencion.",
            view: LowStockSnippetView(items: lowStockItems)
        )
    }

    private func fetchLowStockItems() async -> [LowStockItem] {
        // Mock data - in production, read from shared App Group or API
        return [
            LowStockItem(id: "1", name: "Servilletas", currentStock: 50, minimumStock: 100, unit: "paquetes"),
            LowStockItem(id: "2", name: "Copas de vino", currentStock: 80, minimumStock: 200, unit: "piezas"),
            LowStockItem(id: "3", name: "Manteles blancos", currentStock: 5, minimumStock: 20, unit: "piezas")
        ]
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

struct LowStockSnippetView: View {
    let items: [LowStockItem]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
                Text("Stock Bajo")
                    .font(.headline)
                Spacer()
                Text("\(items.count)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red)
                    .clipShape(Capsule())
            }

            ForEach(items) { item in
                HStack(spacing: 12) {
                    // Progress indicator
                    ZStack {
                        Circle()
                            .stroke(Color.gray.opacity(0.2), lineWidth: 3)
                            .frame(width: 32, height: 32)

                        Circle()
                            .trim(from: 0, to: item.percentageRemaining)
                            .stroke(item.isCritical ? Color.red : Color.orange, lineWidth: 3)
                            .frame(width: 32, height: 32)
                            .rotationEffect(.degrees(-90))

                        Text("\(Int(item.percentageRemaining * 100))%")
                            .font(.system(size: 8, weight: .bold))
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.subheadline)
                            .fontWeight(.medium)

                        Text("\(item.currentStock) / \(item.minimumStock) \(item.unit)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if item.isCritical {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundStyle(.red)
                    }
                }
                .padding(.vertical, 4)

                if item.id != items.last?.id {
                    Divider()
                }
            }
        }
        .padding()
    }
}

struct AllStockOKView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 48))
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

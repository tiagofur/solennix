import AppIntents
import SwiftUI

// MARK: - Check Low Stock Intent

struct CheckLowStockIntent: AppIntent {

    static var title: LocalizedStringResource = "intent.lowstock.title"
    static var description = IntentDescription("intent.lowstock.desc")

    static var openAppWhenRun: Bool = false

    nonisolated init() {}

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        guard IntentSharedDataStore.hasProAccess else {
            return .result(
                dialog: IntentDialog(stringLiteral: String(localized: "intent.dialog.pro_required")),
                view: PlanRequiredSnippetView()
            )
        }

        let lowStockCount = await fetchLowStockCount()

        if lowStockCount == 0 {
            return .result(
                dialog: IntentDialog(stringLiteral: String(localized: "intent.lowstock.dialog.ok")),
                view: AllStockOKView()
            )
        }

        if lowStockCount == 1 {
            return .result(
                dialog: IntentDialog(stringLiteral: String(localized: "intent.lowstock.dialog.one")),
                view: LowStockSummarySnippetView(count: lowStockCount)
            )
        }
        return .result(
            dialog: IntentDialog(stringLiteral: String(format: String(localized: "intent.lowstock.dialog.many_fmt"), lowStockCount)),
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
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(.red, .white)
                Text("intent.lowstock.snippet.title")
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

            Text("intent.lowstock.snippet.detail")
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

            Text("intent.lowstock.snippet.ok")
                .font(.headline)

            Text("intent.lowstock.snippet.ok_detail")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Supplies Detail View

public struct EventSuppliesDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Insumos del Evento")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadData(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.supplies.isEmpty {
                    EmptyStateView(
                        icon: "drop",
                        title: "Sin Insumos",
                        message: "Este evento no tiene insumos asignados"
                    )
                } else {
                    // Cost summary
                    let totalCost = viewModel.supplies.reduce(0.0) { $0 + ($1.quantity * $1.unitCost) }
                    let stockCount = viewModel.supplies.filter { $0.source == .stock }.count
                    let purchaseCount = viewModel.supplies.filter { $0.source == .purchase }.count

                    HStack(spacing: Spacing.md) {
                        VStack(spacing: 2) {
                            Text("\(viewModel.supplies.count)")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.warning)
                            Text("Total")
                                .font(.caption2)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 2) {
                            Text("\(stockCount)")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.success)
                            Text("Del Stock")
                                .font(.caption2)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 2) {
                            Text("\(purchaseCount)")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.error)
                            Text("Compra")
                                .font(.caption2)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 2) {
                            Text(totalCost.asMXN)
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.warning)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                            Text("Costo")
                                .font(.caption2)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.warningBg)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))

                    ForEach(viewModel.supplies) { supply in
                        supplyRow(supply)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
    }

    private func supplyRow(_ supply: EventSupply) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(supply.supplyName ?? "Insumo")
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                sourceBadge(supply.source)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: Spacing.xxs) {
                Text((supply.quantity * supply.unitCost).asMXN)
                    .font(.body)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                Text("\(formatQuantity(supply.quantity)) x \(supply.unitCost.asMXN)")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .shadowSm()
    }

    private func sourceBadge(_ source: SupplySource) -> some View {
        let label = source == .stock ? "Almacen" : "Compra"
        let color = source == .stock ? SolennixColors.success : SolennixColors.warning
        return Text(label)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, Spacing.xs)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }

    private func formatQuantity(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", value)
            : String(format: "%.2f", value)
    }
}

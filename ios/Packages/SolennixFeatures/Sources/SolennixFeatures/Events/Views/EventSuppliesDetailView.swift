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
            if viewModel.isLoading && viewModel.supplies.isEmpty {
                ProgressView(tr("events.detail.supplies.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("events.detail.supplies.title", "Insumos del Evento"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(value: Route.eventForm(id: eventId, step: 4)) {
                    Image(systemName: "pencil")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(tr("events.detail.supplies.edit_a11y", "Editar insumos"))
                }
            }
        }
        .task { await viewModel.loadSuppliesOnly(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.supplies.isEmpty {
                    EmptyStateView(
                        icon: "drop",
                        title: tr("events.detail.supplies.empty.title", "Sin Insumos"),
                        message: tr("events.detail.supplies.empty.message", "Este evento no tiene insumos asignados.")
                    )
                    NavigationLink(value: Route.eventForm(id: eventId, step: 4)) {
                        Text(tr("events.detail.supplies.empty.cta", "Agregar insumos"))
                            .font(.headline)
                            .foregroundStyle(SolennixColors.onPrimary)
                            .padding(.horizontal, Spacing.xl)
                            .padding(.vertical, 16)
                            .background(SolennixColors.primary)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
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
                            Text(tr("events.detail.supplies.stat.total", "Total"))
                                .font(.caption2)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 2) {
                            Text("\(stockCount)")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.success)
                            Text(tr("events.detail.supplies.stat.stock", "Del Stock"))
                                .font(.caption2)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 2) {
                            Text("\(purchaseCount)")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.error)
                            Text(tr("events.detail.supplies.stat.purchase", "Compra"))
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
                            Text(tr("events.detail.supplies.stat.cost", "Costo"))
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
                Text(supply.supplyName ?? tr("events.detail.supplies.row.fallback", "Insumo"))
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
        let label = source == .stock
            ? tr("events.detail.supplies.source.stock", "Almacén")
            : tr("events.detail.supplies.source.purchase", "Compra")
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

    // MARK: - Localization

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}

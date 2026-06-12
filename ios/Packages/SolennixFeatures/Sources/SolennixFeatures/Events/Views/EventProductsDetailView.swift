import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Products Detail View

public struct EventProductsDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.products.isEmpty {
                ProgressView(tr("events.detail.products.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("events.detail.products.title", "Productos"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadProductsOnly(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.products.isEmpty {
                    EmptyStateView(
                        icon: "bag",
                        title: tr("events.detail.products.empty.title", "Sin Productos"),
                        message: tr("events.detail.products.empty.message", "Este evento no tiene productos asignados")
                    )
                } else {
                    // Summary
                    let subtotal = viewModel.products.reduce(0.0) { $0 + ($1.quantity * $1.unitPrice) }
                    HStack {
                        Text("\(viewModel.products.count) productos")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Spacer()
                        Text("Subtotal: \(subtotal.asMXN)")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.primary)
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.primaryLight)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))

                    ForEach(viewModel.products) { product in
                        productRow(product)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
    }

    // MARK: - Localization

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    private func productRow(_ product: EventProduct) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(viewModel.productName(for: product.productId))
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                Text("\(product.formattedQuantity) x \(product.unitPrice.asMXN)")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()

            Text((product.quantity * product.unitPrice).asMXN)
                .font(.body)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .shadowSm()
    }
}

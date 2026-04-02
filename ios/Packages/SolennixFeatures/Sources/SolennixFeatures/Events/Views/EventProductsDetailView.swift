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
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Productos")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadData(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.products.isEmpty {
                    EmptyStateView(
                        icon: "bag",
                        title: "Sin Productos",
                        message: "Este evento no tiene productos asignados"
                    )
                } else {
                    // Summary
                    let subtotal = viewModel.products.reduce(0.0) { $0 + (Double($1.quantity) * $1.unitPrice) }
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

    private func productRow(_ product: EventProduct) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(viewModel.productName(for: product.productId))
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                Text("\(product.quantity) x \(product.unitPrice.asMXN)")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()

            Text((Double(product.quantity) * product.unitPrice).asMXN)
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

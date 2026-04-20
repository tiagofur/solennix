import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Step 2: Products

struct Step2ProductsView: View {

    @Bindable var viewModel: EventFormViewModel
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var showProductPicker = false
    @State private var productSearch = ""

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Add product button
                Button {
                    showProductPicker = true
                } label: {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(SolennixColors.primary)

                        Text("Agregar Producto")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.primary)

                        Spacer()
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.primaryLight)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.primary.opacity(0.3), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)

                // Selected products
                if viewModel.selectedProducts.isEmpty {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "cart")
                            .font(.largeTitle)
                            .foregroundStyle(SolennixColors.textTertiary)

                        Text("Sin productos")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)

                        Text("Agrega productos al evento")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxxl)
                } else {
                    let columns: [GridItem] = sizeClass == .regular
                        ? [GridItem(.flexible(), spacing: Spacing.md), GridItem(.flexible(), spacing: Spacing.md)]
                        : [GridItem(.flexible())]

                    LazyVGrid(columns: columns, spacing: Spacing.md) {
                        ForEach(Array(viewModel.selectedProducts.enumerated()), id: \.element.id) { index, item in
                            productRow(item: item, index: index)
                                .draggable(item.id.uuidString) {
                                    // Drag preview
                                    Text(item.product?.name ?? "Producto")
                                        .padding(Spacing.sm)
                                        .background(SolennixColors.card)
                                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                                }
                                .dropDestination(for: String.self) { droppedItems, _ in
                                    guard let sourceId = droppedItems.first,
                                          let sourceIndex = viewModel.selectedProducts.firstIndex(where: { $0.id.uuidString == sourceId }) else { return false }
                                    viewModel.moveProduct(from: sourceIndex, to: index)
                                    return true
                                }
                        }
                    }
                }

                // Subtotal
                if !viewModel.selectedProducts.isEmpty {
                    HStack {
                        Text("Subtotal Productos")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.textSecondary)

                        Spacer()

                        Text(formatCurrency(viewModel.productsSubtotal))
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
            }
            .padding(Spacing.md)
        }
        .sheet(isPresented: $showProductPicker) {
            productPickerSheet
        }
    }

    // MARK: - Product Row

    private func productRow(item: SelectedProduct, index: Int) -> some View {
        VStack(spacing: Spacing.sm) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: Spacing.xs) {
                        Text(item.product?.name ?? "Producto")
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.text)

                        if let teamId = item.product?.staffTeamId, !teamId.isEmpty {
                            HStack(spacing: 2) {
                                Image(systemName: "person.3.fill")
                                    .font(.caption2)
                                Text("Incluye equipo")
                                    .font(.caption2)
                                    .fontWeight(.medium)
                            }
                            .foregroundStyle(SolennixColors.primary)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 2)
                            .background(SolennixColors.primaryLight)
                            .clipShape(Capsule())
                        }
                    }

                    Text("$\(String(format: "%.2f", item.unitPrice)) c/u")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                Spacer()

                Button {
                    viewModel.removeProduct(at: index)
                } label: {
                    Image(systemName: "trash")
                        .font(.body)
                        .foregroundStyle(SolennixColors.error)
                }
                .buttonStyle(.plain)
            }

            // Quantity controls
            HStack(spacing: Spacing.md) {
                Text("Cantidad:")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                Button {
                    let newQty = max(1, item.quantity - 1)
                    viewModel.updateProductQuantity(at: index, quantity: newQty)
                } label: {
                    Image(systemName: "minus.circle")
                        .font(.title3)
                        .foregroundStyle(item.quantity > 1 ? SolennixColors.primary : SolennixColors.textTertiary)
                }
                .buttonStyle(.plain)
                .disabled(item.quantity <= 1)

                Text("\(Int(item.quantity))")
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                    .frame(minWidth: 30)

                Button {
                    viewModel.updateProductQuantity(at: index, quantity: item.quantity + 1)
                } label: {
                    Image(systemName: "plus.circle")
                        .font(.title3)
                        .foregroundStyle(SolennixColors.primary)
                }
                .buttonStyle(.plain)

                Spacer()

                Text(formatCurrency(item.quantity * item.unitPrice * (1 - item.discount / 100)))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
    }

    // MARK: - Product Picker Sheet

    private var productPickerSheet: some View {
        NavigationStack {
            List {
                ForEach(filteredProducts) { product in
                    Button {
                        viewModel.addProduct(product)
                        showProductPicker = false
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(product.name)
                                    .font(.body)
                                    .foregroundStyle(SolennixColors.text)

                                Text(product.category)
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }

                            Spacer()

                            Text(formatCurrency(product.basePrice))
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(SolennixColors.primary)

                            if viewModel.selectedProducts.contains(where: { $0.productId == product.id }) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(SolennixColors.success)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .searchable(text: $productSearch, prompt: "Buscar producto")
            .navigationTitle("Agregar Producto")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cerrar") {
                        showProductPicker = false
                    }
                    .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
    }

    private var filteredProducts: [Product] {
        if productSearch.isEmpty { return viewModel.products }
        return viewModel.products.filter {
            $0.name.localizedCaseInsensitiveContains(productSearch)
            || $0.category.localizedCaseInsensitiveContains(productSearch)
        }
    }

    // MARK: - Helpers

    private func formatCurrency(_ value: Double) -> String {
        "$\(String(format: "%.2f", value))"
    }
}

// MARK: - Preview

#Preview("Step 2 - Products") {
    Step2ProductsView(viewModel: EventFormViewModel(apiClient: APIClient()))
}

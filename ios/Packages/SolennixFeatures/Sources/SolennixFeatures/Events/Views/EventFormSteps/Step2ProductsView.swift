import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

private func trf(_ key: String, _ value: String, _ arg: String) -> String {
    String(format: tr(key, value), locale: FeatureL10n.locale, arg)
}

// MARK: - Step 2: Products

struct Step2ProductsView: View {

    @Bindable var viewModel: EventFormViewModel
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var showProductPicker = false
    @State private var productSearch = ""
    @State private var pendingDeleteIndex: Int?

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

                        Text(tr("events.form.products.add", "Agregar producto"))
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
                        // shippingbox = mismo concepto visual que Android
                        // (Inventory2 outlined) — paquete/producto genérico.
                        Image(systemName: "shippingbox")
                            .font(.largeTitle)
                            .foregroundStyle(SolennixColors.textTertiary)

                        Text(tr("events.form.products.empty_title", "Sin productos"))
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)

                        Text(tr("events.form.products.empty_desc", "Agrega productos al evento"))
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
                                    Text(item.product?.name ?? tr("events.detail.product_fallback", "Producto"))
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
                        Text(tr("events.form.products.subtotal", "Subtotal productos"))
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
        .confirmationDialog(
            deleteDialogTitle,
            isPresented: deleteDialogBinding,
            titleVisibility: .visible
        ) {
            Button(tr("events.list.delete_confirm.confirm", "Eliminar"), role: .destructive) {
                if let idx = pendingDeleteIndex {
                    viewModel.removeProduct(at: idx)
                }
                pendingDeleteIndex = nil
            }
            Button(tr("events.form.cancel", "Cancelar"), role: .cancel) {
                pendingDeleteIndex = nil
            }
        }
    }

    private var deleteDialogBinding: Binding<Bool> {
        Binding(
            get: { pendingDeleteIndex != nil },
            set: { if !$0 { pendingDeleteIndex = nil } }
        )
    }

    private var deleteDialogTitle: String {
        guard let idx = pendingDeleteIndex,
              viewModel.selectedProducts.indices.contains(idx) else {
            return tr("events.form.products.delete_title", "¿Eliminar producto?")
        }
        let name = viewModel.selectedProducts[idx].product?.name ?? tr("events.form.products.delete_fallback", "este producto")
        return trf("events.form.products.delete_named", "¿Eliminar %@?", name)
    }

    // MARK: - Product Row

    private func productRow(item: SelectedProduct, index: Int) -> some View {
        let effectivePrice = item.unitPrice - item.discount
        let lineTotal = effectivePrice * item.quantity

        return VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header: ordinal + trash rojo alineado a la derecha. Paridad
            // visual con Step 3 (Extras) — el trash vive en su propia fila
            // separado del contenido editable.
            HStack {
                Text(trf("events.form.products.row_title", "Producto %@", String(index + 1)))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                Button {
                    pendingDeleteIndex = index
                } label: {
                    Image(systemName: "trash")
                        .font(.body)
                        .foregroundStyle(SolennixColors.error)
                }
                .buttonStyle(.plain)
            }

            // Producto + stepper.
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.product?.name ?? tr("events.detail.product_fallback", "Producto"))
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    // Precio unitario en primary — parity con Android.
                    Text(trf("events.form.products.unit_price", "%@ c/u", formatCurrency(item.unitPrice)))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.primary)

                    if let teamId = item.product?.staffTeamId, !teamId.isEmpty {
                        HStack(spacing: 2) {
                            Image(systemName: "person.3.fill")
                                .font(.caption2)
                            Text(tr("events.form.products.includes_team", "Incluye equipo"))
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

                Spacer()

                // Stepper con hit area de 44x44pt (Apple HIG mínimo). Glyph
                // .title2 (~22pt) — visible sin saturar. Cantidad con ancho
                // fijo de 36pt + monospacedDigit para que 1, 99, 999 ocupen
                // exactamente lo mismo y los botones no se muevan.
                HStack(spacing: 0) {
                    Button {
                        let newQty = max(1, item.quantity - 1)
                        viewModel.updateProductQuantity(at: index, quantity: newQty)
                    } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(item.quantity > 1 ? SolennixColors.primary : SolennixColors.textTertiary)
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .disabled(item.quantity <= 1)

                    EditableQuantityText(
                        quantity: Binding<Int>(
                            get: { Int(item.quantity) },
                            set: { viewModel.updateProductQuantity(at: index, quantity: Double($0)) }
                        ),
                        minValue: 1,
                        id: item.id,
                        width: 44
                    )

                    Button {
                        viewModel.updateProductQuantity(at: index, quantity: item.quantity + 1)
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(SolennixColors.primary)
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }

            // Descuento + Total — parity con Android. Descuento como monto
            // por unidad ($ subtraído, no %) — igual que backend/web/Android.
            HStack(alignment: .center, spacing: Spacing.sm) {
                ProductDiscountField(viewModel: viewModel, index: index, itemId: item.id)

                Spacer()

                Text(trf("events.form.products.total", "Total: %@", formatCurrency(lineTotal)))
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(item.discount > 0 ? SolennixColors.success : SolennixColors.text)
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
            .searchable(text: $productSearch, prompt: tr("events.form.products.search", "Buscar producto"))
            .navigationTitle(tr("events.form.products.add", "Agregar producto"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(tr("events.detail.share.close", "Cerrar")) {
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

// MARK: - Product Discount Field
//
// Subview con @State local de discountText: autoritativo mientras el usuario
// tipia. Bindear el TextField directo al Double del modelo rompía decimales
// ("2." o "0.5") porque Double parsea incompleto y el get re-formateaba al
// valor normalizado en cada keystroke. Se hidrata del modelo SOLO onAppear
// + onChange del itemId (rebind a otro producto).
private struct ProductDiscountField: View {

    @Bindable var viewModel: EventFormViewModel
    let index: Int
    let itemId: UUID

    @State private var discountText: String = ""

    var body: some View {
        SolennixTextField(
            label: tr("events.form.finances.discount", "Descuento"),
            text: $discountText,
            placeholder: "0",
            keyboardType: .decimalPad
        )
        .frame(maxWidth: 140)
        .onChange(of: discountText) { _, newValue in
            let d = Double(newValue.replacingOccurrences(of: ",", with: ".")) ?? 0
            viewModel.updateProductDiscount(at: index, discount: d)
        }
        .onAppear { hydrate() }
        .onChange(of: itemId) { _, _ in hydrate() }
    }

    private func hydrate() {
        guard viewModel.selectedProducts.indices.contains(index) else { return }
        let discount = viewModel.selectedProducts[index].discount
        discountText = discount > 0 ? String(format: "%g", discount) : ""
    }

}

// MARK: - Preview

#Preview("Step 2 - Products") {
    Step2ProductsView(viewModel: EventFormViewModel(apiClient: APIClient()))
}

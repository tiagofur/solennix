import SwiftUI
import SolennixCore
import SolennixDesign

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

private func trf(_ key: String, _ value: String, _ arg: String) -> String {
    String(format: tr(key, value), locale: FeatureL10n.locale, arg)
}

// MARK: - Supply Row
//
// Subview con `item` por valor + callbacks. No indexa el array del VM en
// sus modifiers (.onChange, $bindings subscript), evita el crash de out-
// of-bounds que ocurria al tocar el trash - SwiftUI re-samplea esas
// expresiones antes de desmontar el view y el index quedaba stale.
struct SupplyRowView: View {

    let item: SelectedSupplyItem
    let index: Int
    let unit: String
    let onRemove: () -> Void
    let onQuantityChange: (Double) -> Void
    let onSourceChange: (SupplySource) -> Void
    let onExcludeCostChange: (Bool) -> Void

    @State private var qtyText: String = ""

    private var isInteger: Bool {
        Step4SuppliesEquipmentView.isIntegerUnit(unit)
    }

    var body: some View {
        VStack(spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    Text(trf("events.form.inventory.unit_cost", "%@/u", formatCurrency(item.unitCost)))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.primary)
                }

                Spacer()

                Button {
                    onRemove()
                } label: {
                    Image(systemName: "trash")
                        .font(.body)
                        .foregroundStyle(SolennixColors.error)
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(tr("events.form.inventory.quantity", "Cantidad"))
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)

                    if isInteger {
                        integerStepper
                    } else {
                        decimalField
                    }
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(tr("events.form.inventory.source", "Fuente"))
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)

                    Picker(
                        "",
                        selection: Binding<SupplySource>(
                            get: { item.source },
                            set: { onSourceChange($0) }
                        )
                    ) {
                        Text(tr("events.form.inventory.source_stock", "Stock")).tag(SupplySource.stock)
                        Text(tr("events.form.inventory.source_purchase", "Compra")).tag(SupplySource.purchase)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 140)
                }

                Spacer()
            }

            if item.source == .stock {
                Toggle(isOn: Binding<Bool>(
                    get: { item.excludeCost },
                    set: { onExcludeCostChange($0) }
                )) {
                    Text(tr("events.form.inventory.exclude_cost", "Sin costo (reaprovechado)"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .tint(SolennixColors.primary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
        .onAppear { hydrate() }
        .onChange(of: item.id) { _, _ in hydrate() }
    }

    // MARK: - Subviews

    private var integerStepper: some View {
        let intValue = Int(item.quantity.rounded())
        let intBinding = Binding<Int>(
            get: { intValue },
            set: { onQuantityChange(Double($0)) }
        )
        return HStack(spacing: 0) {
            Button {
                if item.quantity > 1 {
                    onQuantityChange((item.quantity - 1).rounded())
                }
            } label: {
                Image(systemName: "minus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(item.quantity > 1 ? SolennixColors.primary : SolennixColors.textTertiary)
                    .frame(width: 36, height: 36)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(item.quantity <= 1)

            EditableQuantityText(
                quantity: intBinding,
                minValue: 1,
                id: item.id,
                width: 32
            )

            Button {
                onQuantityChange((item.quantity + 1).rounded())
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(SolennixColors.primary)
                    .frame(width: 36, height: 36)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var decimalField: some View {
        TextField(tr("events.form.inventory.quantity_placeholder", "0"), text: $qtyText)
            .keyboardType(.decimalPad)
            .font(.body)
            .foregroundStyle(SolennixColors.text)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 6)
            .background(SolennixColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .stroke(SolennixColors.border, lineWidth: 1)
            )
            .frame(width: 80)
            .onChange(of: qtyText) { _, newValue in
                let normalized = newValue.replacingOccurrences(of: ",", with: ".")
                if let d = Double(normalized) {
                    onQuantityChange(d)
                }
            }
    }

    private func hydrate() {
        if isInteger {
            qtyText = String(Int(item.quantity.rounded()))
        } else {
            qtyText = item.quantity > 0 ? String(format: "%g", item.quantity) : ""
        }
    }

    private func formatCurrency(_ value: Double) -> String {
        "$\(String(format: "%.2f", value))"
    }
}

// MARK: - Equipment Row

struct EquipmentRowView: View {

    let item: SelectedEquipmentItem
    let index: Int
    let stock: Double
    let unit: String
    let onRemove: () -> Void
    let onQuantityChange: (Int) -> Void

    private var overstock: Bool {
        Double(item.quantity) > stock && stock > 0
    }

    var body: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                HStack(spacing: Spacing.xs) {
                    if overstock {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.error)
                    }
                    Text(Step4SuppliesEquipmentView.stockLabel(stock: stock, unit: unit))
                        .font(.caption)
                        .foregroundStyle(overstock ? SolennixColors.error : SolennixColors.textSecondary)
                }
            }

            Spacer()

            HStack(spacing: 0) {
                Button {
                    if item.quantity > 1 { onQuantityChange(item.quantity - 1) }
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
                        get: { item.quantity },
                        set: { onQuantityChange($0) }
                    ),
                    minValue: 1,
                    id: item.id,
                    width: 44,
                    colorOverride: overstock ? SolennixColors.error : nil
                )

                Button {
                    onQuantityChange(item.quantity + 1)
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(SolennixColors.primary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }

            Button {
                onRemove()
            } label: {
                Image(systemName: "trash")
                    .font(.body)
                    .foregroundStyle(SolennixColors.error)
            }
            .buttonStyle(.plain)
            .padding(.leading, Spacing.xs)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrangeSubviews(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxRowWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += rowHeight + spacing
                rowHeight = 0
            }

            positions.append(CGPoint(x: currentX, y: currentY))
            rowHeight = max(rowHeight, size.height)
            currentX += size.width + spacing
            maxRowWidth = max(maxRowWidth, currentX)
        }

        return (CGSize(width: maxRowWidth, height: currentY + rowHeight), positions)
    }
}

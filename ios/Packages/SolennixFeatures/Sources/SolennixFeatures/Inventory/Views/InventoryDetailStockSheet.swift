import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Stock Adjustment Sheet

struct InventoryStockAdjustmentSheet: View {
    let item: InventoryItem?
    @Binding var adjustmentQuantity: Double
    @Binding var isPresented: Bool
    let onSave: () -> Void

    private let quickDeltas: [Int] = [-10, -1, 1, 10]

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                if let item {
                    Text(item.ingredientName)
                        .font(.title3)
                        .fontWeight(.semibold)

                    Text(InventoryStrings.stockActual(Int(item.currentStock), unit: item.unit))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Divider()

                    HStack {
                        Text(InventoryStrings.newStock)
                        TextField("0", value: $adjustmentQuantity, format: .number)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 100)
                        Text(item.unit)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    HStack(spacing: Spacing.md) {
                        ForEach(quickDeltas, id: \.self) { delta in
                            Button {
                                adjustmentQuantity = max(0, adjustmentQuantity + Double(delta))
                            } label: {
                                Text(delta > 0 ? "+\(delta)" : "\(delta)")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(delta > 0 ? SolennixColors.success : SolennixColors.error)
                                    .padding(.horizontal, Spacing.md)
                                    .padding(.vertical, Spacing.sm)
                                    .background(SolennixColors.surface)
                                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                Spacer()
            }
            .padding(Spacing.lg)
            .keyboardDoneToolbar()
            .navigationTitle(InventoryStrings.adjustStock)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(InventoryStrings.cancel) { isPresented = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(InventoryStrings.save) {
                        onSave()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}

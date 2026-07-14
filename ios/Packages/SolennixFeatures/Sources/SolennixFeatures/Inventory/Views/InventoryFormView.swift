import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Inventory Form View

public struct InventoryFormView: View {

    @State private var viewModel: InventoryFormViewModel
    @State private var scoped: ViewScopedTask?
    @State private var showDiscardDialog: Bool = false
    @Environment(\.dismiss) private var dismiss

    public init(apiClient: APIClient, itemId: String? = nil) {
        _viewModel = State(initialValue: InventoryFormViewModel(apiClient: apiClient, itemId: itemId))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else {
                formContent
            }
        }
        .navigationTitle(viewModel.isEditing ? InventoryStrings.editItemTitle : InventoryStrings.newItemTitle)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                SolennixCancelButton(title: InventoryStrings.cancel) {
                    if viewModel.isDirty {
                        showDiscardDialog = true
                    } else {
                        dismiss()
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                SolennixSaveButton(
                    title: InventoryStrings.save,
                    action: {
                        scoped?.start {
                            let success = await viewModel.save()
                            if success {
                                dismiss()
                            }
                        }
                    },
                    isValid: viewModel.isValid,
                    isSaving: viewModel.isSaving
                )
            }
        }
        .interactiveDismissDisabled(viewModel.isDirty && !viewModel.isSaving)
        .confirmationDialog(
            FeatureL10n.text("common.discard_changes.title", "¿Descartar cambios?"),
            isPresented: $showDiscardDialog,
            titleVisibility: .visible
        ) {
            Button(FeatureL10n.text("common.discard_changes.confirm", "Descartar"), role: .destructive) {
                dismiss()
            }
            Button(FeatureL10n.text("common.discard_changes.cancel", "Cancelar"), role: .cancel) {}
        }
        .sensoryFeedback(.success, trigger: viewModel.saveSuccessCounter)
        .sensoryFeedback(.error, trigger: viewModel.saveErrorCounter)
        .alert(InventoryStrings.errorTitle, isPresented: .init(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(InventoryStrings.ok, role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .task { await viewModel.loadData() }
        .viewScopedTask(scoped: $scoped)
    }

    // MARK: - Form Content (native Apple Form — no custom chrome)

    private var formContent: some View {
        Form {
            // MARK: Información
            Section {
                TextField(InventoryStrings.namePlaceholder, text: $viewModel.ingredientName)
                    .textContentType(.name)
                    .textInputAutocapitalization(.words)
                    .solennixRow()

                if let error = viewModel.nameError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .solennixRow()
                }

                Picker(InventoryStrings.type, selection: $viewModel.type) {
                    Text(InventoryStrings.ingredientType).tag(InventoryType.ingredient)
                    Text(InventoryStrings.equipmentType).tag(InventoryType.equipment)
                    Text(InventoryStrings.supplyType).tag(InventoryType.supply)
                }
                .pickerStyle(.menu)
                .solennixRow()
            } header: {
                Text(InventoryStrings.informationTitle)
            }

            // MARK: Stock
            Section {
                HStack {
                    Text(InventoryStrings.currentStockTitle)
                    Spacer()
                    TextField("0", value: $viewModel.currentStock, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                }
                .solennixRow()

                HStack {
                    Text(InventoryStrings.minimumStockTitle)
                    Spacer()
                    TextField("0", value: $viewModel.minimumStock, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                }
                .solennixRow()

                if let error = viewModel.stockError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .solennixRow()
                }
            } header: {
                Text(InventoryStrings.stockTitle)
            }

            // MARK: Unidad
            Section {
                ForEach(InventoryFormViewModel.unitGroups, id: \.0) { group in
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text(group.0)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        InventoryFlowLayout(spacing: Spacing.xs) {
                            ForEach(group.1, id: \.self) { unit in
                                Button {
                                    viewModel.unit = unit
                                } label: {
                                    Text(unit)
                                        .font(.subheadline)
                                        .padding(.horizontal, Spacing.md)
                                        .padding(.vertical, Spacing.xs)
                                        .background(
                                            viewModel.unit == unit
                                                ? AnyShapeStyle(Color.accentColor.opacity(0.15))
                                                : AnyShapeStyle(Color(.secondarySystemBackground))
                                        )
                                        .foregroundStyle(
                                            viewModel.unit == unit
                                                ? Color.accentColor
                                                : Color.primary
                                        )
                                        .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                    .solennixRow()
                }
            } header: {
                Text(InventoryStrings.unitTitle)
            }

            // MARK: Costo
            Section {
                HStack {
                    Text("$")
                        .foregroundStyle(.secondary)
                    TextField(InventoryStrings.costPlaceholder, value: $viewModel.unitCost, format: .number.precision(.fractionLength(0...2)))
                        .keyboardType(.decimalPad)
                }
                .solennixRow()
            } header: {
                Text(InventoryStrings.costOptionalTitle)
            }
        }
        .solennixListStyle()
    }

}

// MARK: - Flow Layout

/// A simple flow layout for wrapping items
private struct InventoryFlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)

        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }

            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            totalHeight = currentY + lineHeight
        }

        return (CGSize(width: maxWidth, height: totalHeight), positions)
    }
}

// MARK: - Preview

#Preview("New Inventory Item") {
    NavigationStack {
        InventoryFormView(apiClient: APIClient())
    }
}

#Preview("Edit Inventory Item") {
    NavigationStack {
        InventoryFormView(apiClient: APIClient(), itemId: "inv-123")
    }
}

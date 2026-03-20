import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Inventory Form View

public struct InventoryFormView: View {

    @State private var viewModel: InventoryFormViewModel
    @Environment(\.dismiss) private var dismiss

    public init(apiClient: APIClient, itemId: String? = nil) {
        _viewModel = State(initialValue: InventoryFormViewModel(apiClient: apiClient, itemId: itemId))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                formContent
            }
        }
        .navigationTitle(viewModel.isEditing ? "Editar Item" : "Nuevo Item")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                saveButton
            }
        }
        .task { await viewModel.loadData() }
    }

    // MARK: - Form Content

    private var formContent: some View {
        Form {
            // Basic info
            Section("Informacion") {
                // Name
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    TextField("Nombre", text: $viewModel.ingredientName)

                    if let error = viewModel.nameError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                    }
                }

                // Type
                Picker("Tipo", selection: $viewModel.type) {
                    Text("Ingrediente").tag(InventoryType.ingredient)
                    Text("Equipo").tag(InventoryType.equipment)
                    Text("Insumo").tag(InventoryType.supply)
                }
            }

            // Stock
            Section("Stock") {
                HStack {
                    Text("Stock actual")
                    Spacer()
                    TextField("0", value: $viewModel.currentStock, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                }

                if let error = viewModel.stockError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                }

                HStack {
                    Text("Stock minimo")
                    Spacer()
                    TextField("0", value: $viewModel.minimumStock, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                }
            }

            // Unit
            Section("Unidad de Medida") {
                ForEach(InventoryFormViewModel.unitGroups, id: \.0) { group in
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text(group.0)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)

                        FlowLayout(spacing: Spacing.xs) {
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
                                                ? SolennixColors.primary
                                                : SolennixColors.surface
                                        )
                                        .foregroundStyle(
                                            viewModel.unit == unit
                                                ? .white
                                                : SolennixColors.text
                                        )
                                        .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }

            // Cost
            Section("Costo (Opcional)") {
                HStack {
                    Text("$")
                    TextField("Costo por unidad", value: $viewModel.unitCost, format: .number)
                        .keyboardType(.decimalPad)
                }
            }
        }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task {
                let success = await viewModel.save()
                if success {
                    dismiss()
                }
            }
        } label: {
            if viewModel.isSaving {
                ProgressView()
            } else {
                Text("Guardar")
                    .fontWeight(.semibold)
            }
        }
        .disabled(viewModel.isSaving)
    }
}

// MARK: - Flow Layout

/// A simple flow layout for wrapping items
private struct FlowLayout: Layout {
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

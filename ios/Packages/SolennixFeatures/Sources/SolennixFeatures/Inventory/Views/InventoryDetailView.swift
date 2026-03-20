import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Inventory Detail View

public struct InventoryDetailView: View {

    @State private var item: InventoryItem?
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    @State private var showDeleteConfirm: Bool = false
    @State private var showStockAdjustment: Bool = false
    @State private var adjustmentQuantity: Double = 0

    @Environment(\.dismiss) private var dismiss

    private let apiClient: APIClient
    private let itemId: String

    public init(apiClient: APIClient, itemId: String) {
        self.apiClient = apiClient
        self.itemId = itemId
    }

    public var body: some View {
        Group {
            if isLoading {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let item = item {
                detailContent(item)
            } else if let error = errorMessage {
                ContentUnavailableView(
                    "Error",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            }
        }
        .navigationTitle(item?.ingredientName ?? "Item")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        if let item = item {
                            adjustmentQuantity = item.currentStock
                            showStockAdjustment = true
                        }
                    } label: {
                        Label("Ajustar Stock", systemImage: "plusminus")
                    }

                    NavigationLink(value: Route.inventoryForm(id: itemId)) {
                        Label("Editar", systemImage: "pencil")
                    }

                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label("Eliminar", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .confirmationDialog(
            "Eliminar item",
            isPresented: $showDeleteConfirm
        ) {
            Button("Eliminar", role: .destructive) {
                Task { await deleteItem() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Estas seguro de que quieres eliminar \"\(item?.ingredientName ?? "")\"? Esta accion no se puede deshacer.")
        }
        .sheet(isPresented: $showStockAdjustment) {
            stockAdjustmentSheet
        }
        .refreshable { await loadData() }
        .task { await loadData() }
    }

    // MARK: - Data Loading

    @MainActor
    private func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            item = try await apiClient.get(Endpoint.inventoryItem(itemId))
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Error al cargar"
            } else {
                errorMessage = "Error al cargar"
            }
        }

        isLoading = false
    }

    @MainActor
    private func deleteItem() async {
        do {
            try await apiClient.delete(Endpoint.inventoryItem(itemId))
            dismiss()
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription
            }
        }
    }

    @MainActor
    private func saveStockAdjustment() async {
        guard var currentItem = item else { return }

        do {
            let body = ["current_stock": adjustmentQuantity]
            let updated: InventoryItem = try await apiClient.put(Endpoint.inventoryItem(itemId), body: body)
            item = updated
            showStockAdjustment = false
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription
            }
        }
    }

    // MARK: - Detail Content

    private func detailContent(_ item: InventoryItem) -> some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Stock status card
                stockStatusCard(item)

                // Info card
                infoCard(item)

                // Last updated
                HStack {
                    Image(systemName: "clock")
                        .foregroundStyle(SolennixColors.textTertiary)

                    Text("Última actualización")
                        .foregroundStyle(SolennixColors.textSecondary)

                    Spacer()

                    if let date = ISO8601DateFormatter().date(from: item.lastUpdated) {
                        Text(date.formatted(date: .abbreviated, time: .shortened))
                            .foregroundStyle(SolennixColors.text)
                    }
                }
                .padding(Spacing.md)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
            }
            .padding(Spacing.lg)
        }
    }

    // MARK: - Stock Status Card

    private func stockStatusCard(_ item: InventoryItem) -> some View {
        let isLow = item.currentStock < item.minimumStock
        let percentage = item.minimumStock > 0 ? min(1.0, item.currentStock / item.minimumStock) : 1.0

        return VStack(spacing: Spacing.md) {
            HStack {
                Image(systemName: isLow ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(isLow ? SolennixColors.error : SolennixColors.success)

                Text(isLow ? "Stock Bajo" : "Stock OK")
                    .font(.headline)
                    .foregroundStyle(isLow ? SolennixColors.error : SolennixColors.success)

                Spacer()

                Text(item.type.rawValue.capitalized)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(SolennixColors.surface)
                    .clipShape(Capsule())
            }

            // Stock display
            HStack(alignment: .lastTextBaseline, spacing: Spacing.xs) {
                Text("\(Int(item.currentStock))")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(SolennixColors.text)

                Text(item.unit)
                    .font(.title3)
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Mínimo")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)

                    Text("\(Int(item.minimumStock)) \(item.unit)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.surface)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(isLow ? SolennixColors.error : SolennixColors.success)
                        .frame(width: geo.size.width * percentage, height: 8)
                }
            }
            .frame(height: 8)

            // Quick adjust button
            Button {
                adjustmentQuantity = item.currentStock
                showStockAdjustment = true
            } label: {
                HStack {
                    Image(systemName: "plusminus")
                    Text("Ajustar Stock")
                }
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.sm)
                .background(SolennixColors.primaryLight)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .buttonStyle(.plain)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    // MARK: - Info Card

    private func infoCard(_ item: InventoryItem) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Información")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            if let cost = item.unitCost, cost > 0 {
                HStack {
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundStyle(SolennixColors.primary)

                    Text("Costo por unidad")
                        .foregroundStyle(SolennixColors.textSecondary)

                    Spacer()

                    Text(cost.formatted(.currency(code: "MXN")))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)
                }

                Divider()

                // Total value
                HStack {
                    Image(systemName: "chart.bar.fill")
                        .foregroundStyle(SolennixColors.textTertiary)

                    Text("Valor total en stock")
                        .foregroundStyle(SolennixColors.textSecondary)

                    Spacer()

                    Text((cost * item.currentStock).formatted(.currency(code: "MXN")))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)
                }
            } else {
                Text("No se ha definido un costo por unidad")
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .italic()
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    // MARK: - Stock Adjustment Sheet

    private var stockAdjustmentSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                if let item = item {
                    Text(item.ingredientName)
                        .font(.title3)
                        .fontWeight(.semibold)

                    Text("Stock actual: \(Int(item.currentStock)) \(item.unit)")
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Divider()

                    HStack {
                        Text("Nuevo stock:")

                        TextField("0", value: $adjustmentQuantity, format: .number)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 100)

                        Text(item.unit)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    // Quick adjustment buttons
                    HStack(spacing: Spacing.md) {
                        ForEach([-10, -1, 1, 10], id: \.self) { delta in
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
            .navigationTitle("Ajustar Stock")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancelar") {
                        showStockAdjustment = false
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Guardar") {
                        Task { await saveStockAdjustment() }
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Preview

#Preview("Inventory Detail") {
    NavigationStack {
        InventoryDetailView(apiClient: APIClient(), itemId: "inv-123")
    }
}

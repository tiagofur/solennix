import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Aggregated Ingredient

struct AggregatedIngredient: Identifiable {
    let id: String
    let name: String
    let unit: String
    var quantityRequired: Double
    var unitCost: Double
    var currentStock: Double

    var totalCost: Double { quantityRequired * unitCost }
    var needsToBuy: Bool { quantityRequired > currentStock }
    var toBuyQuantity: Double { max(quantityRequired - currentStock, 0) }
}

// MARK: - Batch Ingredient Response

struct BatchIngredient: Codable {
    let productId: String
    let inventoryId: String
    let ingredientName: String?
    let unit: String?
    let quantityRequired: Double
    let unitCost: Double?
    let type: String?
    let inventory: IngredientInventory?

    struct IngredientInventory: Codable {
        let ingredientName: String?
        let unit: String?
        let unitCost: Double?
        let currentStock: Double?
    }
}

// MARK: - Event Shopping List View

public struct EventShoppingListView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel
    @State private var ingredients: [AggregatedIngredient] = []
    @State private var isLoadingIngredients = false

    private let apiClient: APIClient

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self.apiClient = apiClient
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if (viewModel.isLoading && viewModel.event == nil) || isLoadingIngredients {
                ProgressView("Cargando lista de compras...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let event = viewModel.event {
                content(event)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "Error",
                    message: viewModel.errorMessage ?? "No se pudo cargar"
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Lista de Compras")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadData(eventId: eventId)
            await loadIngredients()
        }
    }

    private func content(_ event: Event) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Header info
                VStack(spacing: Spacing.xs) {
                    Text("LISTA DE INSUMOS")
                        .font(.caption)
                        .fontWeight(.black)
                        .foregroundStyle(SolennixColors.textTertiary)
                        .textCase(.uppercase)

                    Text(event.serviceType)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Text(formatDate(event.eventDate))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(Spacing.lg)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                .shadowSm()

                // Summary stats
                if !ingredients.isEmpty {
                    let needToBuy = ingredients.filter { $0.needsToBuy }
                    let totalCost = needToBuy.reduce(0.0) { $0 + ($1.toBuyQuantity * $1.unitCost) }

                    HStack(spacing: Spacing.md) {
                        statBadge(
                            value: "\(ingredients.count)",
                            label: "Ingredientes",
                            color: SolennixColors.primary
                        )
                        statBadge(
                            value: "\(needToBuy.count)",
                            label: "Por Comprar",
                            color: needToBuy.isEmpty ? SolennixColors.success : SolennixColors.error
                        )
                        statBadge(
                            value: totalCost.asMXN,
                            label: "Costo Est.",
                            color: SolennixColors.warning
                        )
                    }
                }

                // Ingredients from products
                if !ingredients.isEmpty {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Ingredientes de Productos")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.text)
                            .padding(.horizontal, Spacing.xs)

                        ForEach(ingredients) { ingredient in
                            ingredientRow(ingredient)
                        }
                    }
                }

                // Per-event supplies (purchase)
                let purchaseSupplies = viewModel.supplies.filter { $0.source == .purchase }
                if !purchaseSupplies.isEmpty {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Insumos por Evento — Compra Nueva")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.text)
                            .padding(.horizontal, Spacing.xs)

                        ForEach(purchaseSupplies) { supply in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(supply.supplyName ?? "Insumo")
                                        .font(.body)
                                        .fontWeight(.medium)
                                        .foregroundStyle(SolennixColors.text)

                                    Text("\(formatQuantity(supply.quantity)) unidades")
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                }

                                Spacer()

                                Text((supply.quantity * supply.unitCost).asMXN)
                                    .font(.body)
                                    .fontWeight(.bold)
                                    .foregroundStyle(SolennixColors.warning)
                            }
                            .padding(Spacing.md)
                            .background(SolennixColors.card)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                            .shadowSm()
                        }
                    }
                }

                // Per-event supplies (stock)
                let stockSupplies = viewModel.supplies.filter { $0.source == .stock }
                if !stockSupplies.isEmpty {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Insumos por Evento — Del Stock")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.text)
                            .padding(.horizontal, Spacing.xs)

                        ForEach(stockSupplies) { supply in
                            HStack {
                                Text(supply.supplyName ?? "Insumo")
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundStyle(SolennixColors.text)

                                Spacer()

                                Text("x\(formatQuantity(supply.quantity))")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(SolennixColors.success)
                            }
                            .padding(Spacing.md)
                            .background(SolennixColors.card)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                        }
                    }
                }

                if ingredients.isEmpty && viewModel.supplies.isEmpty {
                    EmptyStateView(
                        icon: "cart",
                        title: "Sin Compras",
                        message: "Este evento no requiere compras adicionales"
                    )
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
    }

    private func ingredientRow(_ ingredient: AggregatedIngredient) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(ingredient.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                HStack(spacing: Spacing.sm) {
                    Text("Necesario: \(formatQuantity(ingredient.quantityRequired)) \(ingredient.unit)")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Text("Stock: \(formatQuantity(ingredient.currentStock))")
                        .font(.caption)
                        .foregroundStyle(ingredient.needsToBuy ? SolennixColors.error : SolennixColors.success)
                }
            }

            Spacer()

            if ingredient.needsToBuy {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Comprar")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.error)

                    Text(formatQuantity(ingredient.toBuyQuantity))
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.error)
                }
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(SolennixColors.errorBg)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            } else {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundStyle(SolennixColors.success)
            }
        }
        .padding(Spacing.md)
        .background(ingredient.needsToBuy ? SolennixColors.errorBg.opacity(0.3) : SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .shadowSm()
    }

    private func statBadge(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            Text(label)
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Load Ingredients

    @MainActor
    private func loadIngredients() async {
        let productIds = viewModel.products.map { $0.productId }
        guard !productIds.isEmpty else { return }

        isLoadingIngredients = true

        do {
            let body = AnyCodable(["product_ids": productIds])
            let batchIngredients: [BatchIngredient] = try await apiClient.post(Endpoint.batchIngredients, body: body)

            let productQuantities = Dictionary(
                viewModel.products.map { ($0.productId, $0.quantity) },
                uniquingKeysWith: { _, last in last }
            )

            var aggregated: [String: AggregatedIngredient] = [:]

            for ing in batchIngredients {
                guard ing.type == "ingredient" else { continue }
                let key = ing.inventoryId
                let qty = productQuantities[ing.productId] ?? 0
                let name = ing.ingredientName ?? ing.inventory?.ingredientName ?? "Insumo"
                let unit = ing.unit ?? ing.inventory?.unit ?? ""
                let unitCost = ing.unitCost ?? ing.inventory?.unitCost ?? 0
                let stock = ing.inventory?.currentStock ?? 0

                if var existing = aggregated[key] {
                    existing.quantityRequired += ing.quantityRequired * Double(qty)
                    aggregated[key] = existing
                } else {
                    aggregated[key] = AggregatedIngredient(
                        id: key,
                        name: name,
                        unit: unit,
                        quantityRequired: ing.quantityRequired * Double(qty),
                        unitCost: unitCost,
                        currentStock: stock
                    )
                }
            }

            ingredients = Array(aggregated.values).sorted { $0.needsToBuy && !$1.needsToBuy }
        } catch {
            // Non-fatal: ingredients are supplementary info
        }

        isLoadingIngredients = false
    }

    // MARK: - Helpers

    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "es_MX")
        guard let date = formatter.date(from: String(dateString.prefix(10))) else { return dateString }
        let display = DateFormatter()
        display.dateFormat = "EEEE d 'de' MMMM, yyyy"
        display.locale = Locale(identifier: "es_MX")
        return display.string(from: date).capitalized
    }

    private func formatQuantity(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", value)
            : String(format: "%.2f", value)
    }
}

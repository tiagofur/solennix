import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Product Detail View Model

@Observable
final class ProductDetailViewModel {

    var product: Product?
    var ingredients: [ProductIngredient] = []
    var demandData: [DemandDataPoint] = []
    var isLoading: Bool = true
    var errorMessage: String?
    var showDeleteConfirm: Bool = false

    private let apiClient: APIClient
    let productId: String

    init(apiClient: APIClient, productId: String) {
        self.apiClient = apiClient
        self.productId = productId
    }

    // MARK: - Computed KPIs

    var ingredientItems: [ProductIngredient] {
        ingredients.filter { $0.type == .ingredient }
    }

    var supplyItems: [ProductIngredient] {
        ingredients.filter { $0.type == .supply }
    }

    var equipmentItems: [ProductIngredient] {
        ingredients.filter { $0.type == .equipment }
    }

    var unitCost: Double {
        ingredientItems.reduce(0) { $0 + $1.quantityRequired * ($1.unitCost ?? 0) }
    }

    var perEventCost: Double {
        supplyItems.reduce(0) { $0 + $1.quantityRequired * ($1.unitCost ?? 0) }
    }

    var margin: Double {
        guard let price = product?.basePrice, price > 0 else { return 0 }
        return ((price - unitCost) / price) * 100
    }

    var demand7Days: Int {
        let today = Calendar.current.startOfDay(for: Date())
        let in7Days = Calendar.current.date(byAdding: .day, value: 7, to: today) ?? today
        return demandData.filter { $0.eventDate >= today && $0.eventDate <= in7Days }
            .reduce(0) { $0 + $1.quantity }
    }

    var totalDemand: Int {
        demandData.reduce(0) { $0 + $1.quantity }
    }

    var estimatedRevenue: Double {
        guard let price = product?.basePrice else { return 0 }
        return Double(totalDemand) * price
    }

    @MainActor
    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            // Load product and ingredients
            async let productTask: Product = apiClient.get(Endpoint.product(productId))
            async let ingredientsTask: [ProductIngredient] = apiClient.get(Endpoint.productIngredients(productId))

            let (loadedProduct, loadedIngredients) = try await (productTask, ingredientsTask)
            product = loadedProduct
            ingredients = loadedIngredients

            // Load demand data (upcoming events using this product)
            await loadDemandData()
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    @MainActor
    private func loadDemandData() async {
        do {
            let events: [Event] = try await apiClient.get(Endpoint.upcomingEvents)

            var demand: [DemandDataPoint] = []
            for event in events.prefix(10) {
                let eventProducts: [EventProduct] = try await apiClient.get(Endpoint.eventProducts(event.id))
                if let ep = eventProducts.first(where: { $0.productId == productId }) {
                    // Fetch client name
                    var clientName = "Cliente"
                    if !event.clientId.isEmpty {
                        do {
                            let client: Client = try await apiClient.get(Endpoint.client(event.clientId))
                            clientName = client.name
                        } catch {
                            // Silently fail
                        }
                    }

                    let point = DemandDataPoint(
                        id: event.id,
                        eventDate: ISO8601DateFormatter().date(from: event.eventDate) ?? Date(),
                        clientName: clientName,
                        quantity: ep.quantity,
                        numPeople: event.numPeople,
                        unitPrice: ep.unitPrice
                    )
                    demand.append(point)
                }
            }
            demandData = demand
        } catch {
            // Silently fail for demand data - not critical
        }
    }

    @MainActor
    func deleteProduct() async -> Bool {
        do {
            try await apiClient.delete(Endpoint.product(productId))
            return true
        } catch {
            errorMessage = mapError(error)
            return false
        }
    }

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? "Ocurrio un error inesperado."
        }
        return "Ocurrio un error inesperado. Intenta de nuevo."
    }
}

// MARK: - Product Detail View

public struct ProductDetailView: View {

    @State private var viewModel: ProductDetailViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(apiClient: APIClient, productId: String) {
        _viewModel = State(initialValue: ProductDetailViewModel(apiClient: apiClient, productId: productId))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.product == nil {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let product = viewModel.product {
                detailContent(product)
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView(
                    "Error",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else {
                ContentUnavailableView(
                    "Producto no encontrado",
                    systemImage: "shippingbox",
                    description: Text("No se pudo cargar la informacion del producto.")
                )
            }
        }
        .navigationTitle(viewModel.product?.name ?? "Producto")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.productForm(id: viewModel.productId)) {
                        Label("Editar", systemImage: "pencil")
                    }

                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label("Eliminar", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .confirmationDialog(
            "Eliminar producto",
            isPresented: $viewModel.showDeleteConfirm
        ) {
            Button("Eliminar", role: .destructive) {
                Task {
                    if await viewModel.deleteProduct() {
                        dismiss()
                    }
                }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Estas seguro de que quieres eliminar \"\(viewModel.product?.name ?? "")\"? Esta accion no se puede deshacer.")
        }
        .refreshable { await viewModel.loadData() }
        .task { await viewModel.loadData() }
    }

    // MARK: - Detail Content

    private func detailContent(_ product: Product) -> some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                AdaptiveDetailLayout {
                    // Left: Product info, image, KPI cards
                    headerSection(product)
                    kpiSection(product)
                    smartAlertSection(product)
                    generalInfoSection(product)
                } right: {
                    // Right: Ingredients/recipe, cost breakdown
                    if !viewModel.ingredientItems.isEmpty {
                        compositionSection(
                            title: "Composicion / Insumos",
                            icon: "square.stack.3d.up.fill",
                            iconColor: SolennixColors.primary,
                            items: viewModel.ingredientItems,
                            showCost: true,
                            totalLabel: "Costo Total por Unidad",
                            totalValue: viewModel.unitCost
                        )
                    }

                    if !viewModel.supplyItems.isEmpty {
                        compositionSection(
                            title: "Insumos por Evento",
                            icon: "flame.fill",
                            iconColor: .orange,
                            items: viewModel.supplyItems,
                            showCost: true,
                            badge: "Costo fijo por evento",
                            badgeColor: .orange,
                            totalLabel: "Costo por Evento",
                            totalValue: viewModel.perEventCost,
                            totalColor: .orange
                        )
                    }

                    if !viewModel.equipmentItems.isEmpty {
                        compositionSection(
                            title: "Equipo Necesario",
                            icon: "wrench.and.screwdriver.fill",
                            iconColor: .blue,
                            items: viewModel.equipmentItems,
                            showCost: false,
                            badge: "Sin costo - Reutilizable",
                            badgeColor: .blue
                        )
                    }
                }

                // Demand forecast (full-width below)
                DemandForecastChart(
                    dataPoints: viewModel.demandData,
                    productName: product.name,
                    basePrice: product.basePrice
                )
            }
            .padding(Spacing.lg)
        }
    }

    // MARK: - Header Section

    private func headerSection(_ product: Product) -> some View {
        VStack(spacing: Spacing.md) {
            if let imageUrl = product.imageUrl, !imageUrl.isEmpty,
               let url = APIClient.resolveURL(imageUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(SolennixColors.surface)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            }

            HStack(spacing: Spacing.sm) {
                Text(product.category)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .textCase(.uppercase)
                    .foregroundStyle(SolennixColors.primary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(SolennixColors.primary.opacity(0.1))
                    .clipShape(Capsule())

                if !product.isActive {
                    Text("Inactivo")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.error)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(SolennixColors.errorBg)
                        .clipShape(Capsule())
                }

                Spacer()
            }
        }
    }

    // MARK: - KPI Section

    private func kpiSection(_ product: Product) -> some View {
        VStack(spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                kpiCard(
                    icon: "dollarsign.circle.fill",
                    iconColor: SolennixColors.primary,
                    label: "Precio Base",
                    value: product.basePrice.formatted(.currency(code: "MXN")),
                    subtitle: "por unidad"
                )
                kpiCard(
                    icon: "square.stack.3d.up.fill",
                    iconColor: SolennixColors.textSecondary,
                    label: "Costo / Unidad",
                    value: viewModel.unitCost.formatted(.currency(code: "MXN")),
                    subtitle: "en insumos"
                )
            }
            HStack(spacing: Spacing.sm) {
                let marginColor: Color = viewModel.margin >= 50 ? .green :
                    (viewModel.margin >= 20 ? SolennixColors.text : .orange)
                kpiCard(
                    icon: "arrow.up.right",
                    iconColor: marginColor,
                    label: "Margen Est.",
                    value: String(format: "%.1f%%", viewModel.margin),
                    subtitle: "utilidad estimada",
                    valueColor: marginColor
                )
                kpiCard(
                    icon: "calendar",
                    iconColor: SolennixColors.primary,
                    label: "Prox. Eventos",
                    value: "\(viewModel.demandData.count)",
                    subtitle: "confirmados"
                )
            }
        }
    }

    private func kpiCard(
        icon: String,
        iconColor: Color,
        label: String,
        value: String,
        subtitle: String,
        valueColor: Color = SolennixColors.text
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                    .foregroundStyle(iconColor)
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .textCase(.uppercase)
            }
            Text(value)
                .font(.title2)
                .fontWeight(.black)
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    // MARK: - Smart Alert Section

    private func smartAlertSection(_ product: Product) -> some View {
        let isHighDemand = viewModel.demand7Days > 0

        return HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: isHighDemand ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .foregroundStyle(isHighDemand ? SolennixColors.primary : .green)
                .font(.title3)

            VStack(alignment: .leading, spacing: 2) {
                Text(isHighDemand
                     ? "\(viewModel.demand7Days) unidades en los proximos 7 dias"
                     : viewModel.demandData.isEmpty ? "Sin eventos proximos" : "Sin demanda inmediata"
                )
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(isHighDemand ? SolennixColors.primary : .green)

                if isHighDemand {
                    if viewModel.estimatedRevenue > 0 {
                        Text("Alta demanda esta semana. Ingreso estimado total: \(viewModel.estimatedRevenue.formatted(.currency(code: "MXN")))")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    } else {
                        Text("Alta demanda esta semana.")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                } else if !viewModel.demandData.isEmpty {
                    Text("\(viewModel.totalDemand) unidades en \(viewModel.demandData.count) evento\(viewModel.demandData.count != 1 ? "s" : "") proximos.")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                } else {
                    Text("No hay eventos confirmados que incluyan este producto.")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(isHighDemand ? SolennixColors.primary.opacity(0.08) : SolennixColors.card)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .stroke(isHighDemand ? SolennixColors.primary.opacity(0.2) : SolennixColors.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - General Info Section

    private func generalInfoSection(_ product: Product) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("INFORMACION GENERAL")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.textSecondary)

            // Category
            HStack(spacing: Spacing.md) {
                Image(systemName: "tag.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Categoria")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(product.category)
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }

            Divider()

            // Price
            HStack(spacing: Spacing.md) {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Precio Base")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(product.basePrice.formatted(.currency(code: "MXN")))
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }

            Divider()

            // Composition summary
            HStack(spacing: Spacing.md) {
                Image(systemName: "square.stack.3d.up.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Composicion")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    let compositionText: String = {
                        var parts: [String] = []
                        parts.append("\(viewModel.ingredientItems.count) insumos")
                        if !viewModel.supplyItems.isEmpty {
                            parts.append("\(viewModel.supplyItems.count) insumo(s) por evento")
                        }
                        if !viewModel.equipmentItems.isEmpty {
                            parts.append("\(viewModel.equipmentItems.count) equipo(s)")
                        }
                        return parts.joined(separator: ", ")
                    }()

                    Text(compositionText)
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    // MARK: - Composition Section

    private func compositionSection(
        title: String,
        icon: String,
        iconColor: Color,
        items: [ProductIngredient],
        showCost: Bool,
        badge: String? = nil,
        badgeColor: Color = SolennixColors.primary,
        totalLabel: String? = nil,
        totalValue: Double? = nil,
        totalColor: Color = SolennixColors.text
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: icon)
                        .foregroundStyle(iconColor)
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)
                }

                Spacer()

                if let badge {
                    Text(badge)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundStyle(badgeColor)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(badgeColor.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            .padding(Spacing.md)

            Divider()

            // Table header
            HStack {
                Text("INSUMO")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
                Text("CANTIDAD")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
                if showCost {
                    Text("COSTO EST.")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .frame(width: 80, alignment: .trailing)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(SolennixColors.surface)

            // Items
            ForEach(items) { ingredient in
                Divider().opacity(0.5)
                HStack {
                    Text(ingredient.ingredientName ?? "Insumo")
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.text)
                    Spacer()
                    Text("\(Int(ingredient.quantityRequired)) \(ingredient.unit ?? "und")")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)
                    if showCost {
                        let cost = ingredient.quantityRequired * (ingredient.unitCost ?? 0)
                        Text(cost > 0 ? cost.formatted(.currency(code: "MXN")) : "—")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(totalColor == .orange ? .orange : SolennixColors.text)
                            .frame(width: 80, alignment: .trailing)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
            }

            // Total footer
            if let totalLabel, let totalValue {
                Divider()
                HStack {
                    Text(totalLabel)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Spacer()
                    Text(totalValue.formatted(.currency(code: "MXN")))
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundStyle(totalColor)
                }
                .padding(Spacing.md)
            }
        }
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - Preview

#Preview("Product Detail") {
    NavigationStack {
        ProductDetailView(apiClient: APIClient(), productId: "prod-123")
    }
}

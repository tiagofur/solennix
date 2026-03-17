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
    var isLoading: Bool = false
    var errorMessage: String?
    var showDeleteConfirm: Bool = false

    private let apiClient: APIClient
    let productId: String

    init(apiClient: APIClient, productId: String) {
        self.apiClient = apiClient
        self.productId = productId
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
        // Load upcoming events and filter by this product
        do {
            let events: [Event] = try await apiClient.get(Endpoint.upcomingEvents)

            // For each event, check if it uses this product
            var demand: [DemandDataPoint] = []
            for event in events.prefix(10) {
                let eventProducts: [EventProduct] = try await apiClient.get(Endpoint.eventProducts(event.id))
                if let ep = eventProducts.first(where: { $0.productId == productId }) {
                    let point = DemandDataPoint(
                        id: event.id,
                        eventDate: ISO8601DateFormatter().date(from: event.eventDate) ?? Date(),
                        clientName: "Cliente", // Would need to fetch client name
                        quantity: ep.quantity,
                        numPeople: event.numPeople
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

    public init(apiClient: APIClient, productId: String) {
        _viewModel = State(initialValue: ProductDetailViewModel(apiClient: apiClient, productId: productId))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
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
                // Header with image
                headerSection(product)

                // Info section
                infoSection(product)

                // Recipe section
                if !viewModel.ingredients.isEmpty {
                    recipeSection
                }

                // Demand forecast
                DemandForecastChart(
                    dataPoints: viewModel.demandData,
                    productName: product.name
                )
            }
            .padding(Spacing.lg)
        }
    }

    // MARK: - Header Section

    private func headerSection(_ product: Product) -> some View {
        VStack(spacing: Spacing.md) {
            // Product image
            if let imageUrl = product.imageUrl, !imageUrl.isEmpty,
               let url = URL(string: imageUrl) {
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

            // Status badges
            HStack(spacing: Spacing.sm) {
                // Category badge
                Text(product.category)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .textCase(.uppercase)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(SolennixColors.surface)
                    .clipShape(Capsule())

                // Active/Inactive badge
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

    // MARK: - Info Section

    private func infoSection(_ product: Product) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Información")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            // Price
            HStack {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundStyle(SolennixColors.primary)

                Text("Precio Base")
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                Text(product.basePrice.formatted(.currency(code: "MXN")))
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
            }

            Divider()

            // Created date
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(SolennixColors.textTertiary)

                Text("Creado")
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                if let date = ISO8601DateFormatter().date(from: product.createdAt) {
                    Text(date.formatted(date: .abbreviated, time: .omitted))
                        .foregroundStyle(SolennixColors.text)
                }
            }

            Divider()

            // Updated date
            HStack {
                Image(systemName: "clock")
                    .foregroundStyle(SolennixColors.textTertiary)

                Text("Actualizado")
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                if let date = ISO8601DateFormatter().date(from: product.updatedAt) {
                    Text(date.formatted(date: .abbreviated, time: .omitted))
                        .foregroundStyle(SolennixColors.text)
                }
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    // MARK: - Recipe Section

    private var recipeSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: "list.bullet.clipboard.fill")
                    .foregroundStyle(SolennixColors.primary)

                Text("Receta")
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
            }

            ForEach(viewModel.ingredients) { ingredient in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(ingredient.ingredientName ?? "Item")
                            .font(.body)
                            .foregroundStyle(SolennixColors.text)

                        Text(ingredient.type?.rawValue.capitalized ?? "Ingrediente")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }

                    Spacer()

                    Text("\(Int(ingredient.quantityRequired)) \(ingredient.unit ?? "und")")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.primary)
                }
                .padding(.vertical, Spacing.xs)

                if ingredient.id != viewModel.ingredients.last?.id {
                    Divider()
                }
            }
        }
        .padding(Spacing.md)
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

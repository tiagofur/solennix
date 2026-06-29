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

    /// Unit cost = ingredient items + supply items (both carry quantityRequired × unitCost).
    var unitCost: Double {
        let ingredientCost = ingredientItems.reduce(0) { $0 + $1.quantityRequired * ($1.unitCost ?? 0) }
        let supplyCost = supplyItems.reduce(0) { $0 + $1.quantityRequired * ($1.unitCost ?? 0) }
        return ingredientCost + supplyCost
    }

    var perEventCost: Double {
        supplyItems.reduce(0) { $0 + $1.quantityRequired * ($1.unitCost ?? 0) }
    }

    /// Returns nil when there are no recipe items (no basis for margin).
    var margin: Double? {
        let hasRecipe = !ingredientItems.isEmpty || !supplyItems.isEmpty
        guard hasRecipe else { return nil }
        guard let price = product?.basePrice, price > 0 else { return 0 }
        return ((price - unitCost) / price) * 100
    }

    // MARK: - Demand

    /// Today as UTC-midnight Date for stable day comparisons (same technique as EventCountdownChip).
    /// Initialized eagerly so KPIs never see a nil window; refreshed on each loadDemandData
    /// so all window calculations within one load share the same anchor.
    private var todayUTC: Date? = Date.fromServerDay(Date.localTodayString())

    /// A UTC-pinned calendar for day-diff arithmetic (avoids UTC-negative timezone shifts).
    private static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    var demand7Days: Int {
        guard let todayUTC else { return 0 }
        let in7 = Self.utcCalendar.date(byAdding: .day, value: 7, to: todayUTC) ?? todayUTC
        return demandData.filter { $0.eventDate >= todayUTC && $0.eventDate <= in7 }
            .reduce(0) { $0 + $1.quantity }
    }

    var totalDemand: Int {
        demandData.reduce(0) { $0 + $1.quantity }
    }

    /// Revenue computed over the 7-day window only, consistent with demand7Days / smart alert.
    var estimatedRevenue7Days: Double {
        guard let price = product?.basePrice, let todayUTC else { return 0 }
        let in7 = Self.utcCalendar.date(byAdding: .day, value: 7, to: todayUTC) ?? todayUTC
        let window = demandData.filter { $0.eventDate >= todayUTC && $0.eventDate <= in7 }
        return window.reduce(0) { acc, dp in
            let unitPrice = dp.unitPrice > 0 ? dp.unitPrice : price
            return acc + Double(dp.quantity) * unitPrice
        }
    }

    @MainActor
    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let productTask: Product = apiClient.get(Endpoint.product(productId))
            async let ingredientsTask: [ProductIngredient] = apiClient.get(Endpoint.productIngredients(productId))

            let (loadedProduct, loadedIngredients) = try await (productTask, ingredientsTask)
            product = loadedProduct
            ingredients = loadedIngredients

            await loadDemandData()
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Parallelized demand loading (fault-isolated: one 404/timeout won't discard collected points)

    private struct DemandFetchResult {
        let point: DemandDataPoint?
        let fetchFailed: Bool
    }

    @MainActor
    private func loadDemandData() async {
        // Anchor today once for the entire load; window KPIs read this stored value.
        todayUTC = Date.fromServerDay(Date.localTodayString())

        do {
            let events: [Event] = try await apiClient.getAll(Endpoint.upcomingEvents)
            let eventsSlice = Array(events.prefix(10))

            var collected: [DemandDataPoint] = []
            var fetchFailedCount = 0
            var successfulFetchCount = 0

            // Non-throwing group: each child isolates its own errors so a single
            // 404/timeout does not discard points already collected from other events.
            await withTaskGroup(of: DemandFetchResult.self) { group in
                for event in eventsSlice {
                    group.addTask {
                        do {
                            // Parse date first — skip if unparseable (no fabricated Date()).
                            guard let eventDate = Date.fromServerDay(event.eventDate) else {
                                return DemandFetchResult(point: nil, fetchFailed: false)
                            }

                            async let epTask: [EventProduct] = self.apiClient.get(Endpoint.eventProducts(event.id))

                            // Client fetch is independent — run concurrently with eventProducts.
                            var clientName = FeatureL10n.text("clients.title_singular", "Cliente")
                            if !event.clientId.isEmpty {
                                async let clientTask: Client = self.apiClient.get(Endpoint.client(event.clientId))
                                let (eps, maybeClient) = try await (epTask, clientTask)
                                clientName = maybeClient.name
                                // Product not in this event is a legitimate success (zero demand).
                                guard let ep = eps.first(where: { $0.productId == self.productId }) else {
                                    return DemandFetchResult(point: nil, fetchFailed: false)
                                }
                                return DemandFetchResult(
                                    point: DemandDataPoint(
                                        id: event.id,
                                        eventDate: eventDate,
                                        clientName: clientName,
                                        quantity: Int(ep.quantity),
                                        numPeople: event.numPeople,
                                        unitPrice: ep.unitPrice
                                    ),
                                    fetchFailed: false
                                )
                            } else {
                                let eps = try await epTask
                                // Product not in this event is a legitimate success (zero demand).
                                guard let ep = eps.first(where: { $0.productId == self.productId }) else {
                                    return DemandFetchResult(point: nil, fetchFailed: false)
                                }
                                return DemandFetchResult(
                                    point: DemandDataPoint(
                                        id: event.id,
                                        eventDate: eventDate,
                                        clientName: clientName,
                                        quantity: Int(ep.quantity),
                                        numPeople: event.numPeople,
                                        unitPrice: ep.unitPrice
                                    ),
                                    fetchFailed: false
                                )
                            }
                        } catch {
                            // Network/auth failure — counts against fetch failures.
                            return DemandFetchResult(point: nil, fetchFailed: true)
                        }
                    }
                }

                for await result in group {
                    if result.fetchFailed {
                        fetchFailedCount += 1
                    } else {
                        successfulFetchCount += 1
                        if let point = result.point { collected.append(point) }
                    }
                }
            }

            // Surface an error only when every fetch genuinely failed (network/auth),
            // not when the product simply has no demand in upcoming events.
            if fetchFailedCount > 0 && successfulFetchCount == 0 && !eventsSlice.isEmpty {
                errorMessage = ProductStrings.unexpectedRetryError
            }

            // Sort by event date ascending so chart renders chronologically.
            demandData = collected.sorted { $0.eventDate < $1.eventDate }
        } catch {
            // Upcoming events fetch itself failed — keep demandData empty (non-critical).
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
            return apiError.errorDescription ?? ProductStrings.unexpectedError
        }
        return ProductStrings.unexpectedRetryError
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
            if viewModel.isLoading && viewModel.product == nil {
                ProductDetailSkeleton()
            } else if let product = viewModel.product {
                hubScrollView(product)
            } else {
                ContentUnavailableView {
                    Label(ProductStrings.errorTitle, systemImage: "exclamationmark.triangle")
                } description: {
                    Text(viewModel.errorMessage ?? ProductStrings.notFoundMessage)
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(viewModel.product?.name ?? ProductStrings.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.productForm(id: viewModel.productId)) {
                        Label(ProductStrings.edit, systemImage: "pencil")
                    }

                    Divider()

                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label(ProductStrings.deleteAction, systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(ProductStrings.moreActions)
                }
            }
        }
        .confirmationDialog(
            ProductStrings.deleteTitle,
            isPresented: $viewModel.showDeleteConfirm
        ) {
            Button(ProductStrings.deleteAction, role: .destructive) {
                Task {
                    if await viewModel.deleteProduct() {
                        dismiss()
                    }
                }
            }
            Button(ProductStrings.cancel, role: .cancel) {}
        } message: {
            Text(ProductStrings.deletePrompt(viewModel.product?.name ?? ""))
        }
        // Gate alert: only present when the main entity is loaded — first-load failures
        // stay in the empty-state branch only (prevents double error UI).
        .alert(ProductStrings.errorTitle, isPresented: Binding(
            get: { viewModel.errorMessage != nil && viewModel.product != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(ProductStrings.ok, role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .task { await viewModel.loadData() }
    }

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)

    @ScaledMetric(relativeTo: .body) private var scaledImageHeight: CGFloat = 280
    private var cappedImageHeight: CGFloat { min(scaledImageHeight, 400) }

    // MARK: - Hub ScrollView

    private func hubScrollView(_ product: Product) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                // Hero Image at the very top (ignores safe area top)
                heroHeaderView(product)

                VStack(spacing: Spacing.md) {
                    // Category & Status Kicker + Title inside a card
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        HStack(spacing: Spacing.xs) {
                            Text(product.category)
                                .font(.caption.weight(.bold))
                                .textCase(.uppercase)
                                .foregroundStyle(SolennixColors.primary)

                            if !product.isActive {
                                Text("•")
                                    .foregroundStyle(SolennixColors.textSecondary)
                                Text(ProductStrings.inactive)
                                    .font(.caption.weight(.bold))
                                    .textCase(.uppercase)
                                    .foregroundStyle(SolennixColors.error)
                            }
                        }

                        Text(product.name)
                            .font(.title.weight(.bold))
                            .foregroundStyle(SolennixColors.text)
                    }
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .shadow(color: Color.black.opacity(0.04), radius: 10, y: 5)
                    .padding(.horizontal, Spacing.md)

                    // Smart alert banner (Translucent iOS style)
                    smartAlertRow(product)

                    // KPI grid card
                    kpiSection(product)

                    // Demand chart card
                    DemandForecastChart(
                        dataPoints: viewModel.demandData,
                        productName: product.name,
                        basePrice: product.basePrice
                    )
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // Composition / Recipe sections
                    if !viewModel.ingredientItems.isEmpty {
                        compositionSection(
                            title: ProductStrings.compositionTitle,
                            icon: "square.stack.3d.up.fill",
                            iconColor: SolennixColors.primary,
                            items: viewModel.ingredientItems,
                            showCost: true,
                            totalLabel: ProductStrings.totalUnitCost,
                            totalValue: viewModel.unitCost
                        )
                    }

                    if !viewModel.supplyItems.isEmpty {
                        compositionSection(
                            title: ProductStrings.suppliesTitle,
                            icon: "flame.fill",
                            iconColor: SolennixColors.warning,
                            items: viewModel.supplyItems,
                            showCost: true,
                            badge: ProductStrings.fixedCostPerEvent,
                            badgeColor: SolennixColors.warning,
                            totalLabel: ProductStrings.costPerEvent,
                            totalValue: viewModel.perEventCost,
                            totalColor: SolennixColors.warning
                        )
                    }

                    if !viewModel.equipmentItems.isEmpty {
                        compositionSection(
                            title: ProductStrings.equipmentTitle,
                            icon: "wrench.and.screwdriver.fill",
                            iconColor: SolennixColors.primary,
                            items: viewModel.equipmentItems,
                            showCost: false,
                            badge: ProductStrings.reusableNoCost,
                            badgeColor: SolennixColors.info
                        )
                    }

                    // General info
                    generalInfoSection(product)

                    Color.clear.frame(height: Spacing.xl)
                }
                .padding(.top, -24)
                .zIndex(1)
            }
        }
        .ignoresSafeArea(.container, edges: .top)
        .background(SolennixColors.surfaceGrouped)
        .softScrollEdgeEffectIfAvailable()
        .refreshable {
            await viewModel.loadData()
        }
    }

    // MARK: - Hero Header View

    private func heroHeaderView(_ product: Product) -> some View {
        GeometryReader { geometry in
            let minY = geometry.frame(in: .global).minY
            let height = cappedImageHeight + (minY > 0 ? minY : 0)

            Group {
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
                } else {
                    Rectangle()
                        .fill(SolennixColors.surface)
                        .overlay {
                            Image(systemName: "photo")
                                .font(.title)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                }
            }
            .frame(width: geometry.size.width, height: height)
            .clipped()
            .offset(y: minY > 0 ? -minY : 0)
        }
        .frame(height: cappedImageHeight)
    }

    // MARK: - KPI Section

    private func kpiSection(_ product: Product) -> some View {
        let marginValue = viewModel.margin
        let marginColor: Color = {
            guard let m = marginValue else { return SolennixColors.textSecondary }
            return m >= 50 ? SolennixColors.success : (m >= 20 ? SolennixColors.text : SolennixColors.warning)
        }()
        let marginDisplay = marginValue.map { String(format: "%.1f%%", $0) } ?? "—"
        let marginSubtitle = marginValue != nil ? ProductStrings.profitEstimated : ProductStrings.noRecipe

        return VStack(spacing: 0) {
            HStack(spacing: 0) {
                kpiCard(
                    icon: "dollarsign.circle.fill",
                    iconColor: SolennixColors.primary,
                    label: ProductStrings.basePrice,
                    value: product.basePrice.formatted(.currency(code: "MXN")),
                    subtitle: ProductStrings.perUnit,
                    a11yLabel: "\(ProductStrings.basePrice): \(product.basePrice.formatted(.currency(code: "MXN")))"
                )

                Divider()
                    .frame(height: 70)

                kpiCard(
                    icon: "square.stack.3d.up.fill",
                    iconColor: SolennixColors.textSecondary,
                    label: ProductStrings.unitCost,
                    value: viewModel.unitCost.formatted(.currency(code: "MXN")),
                    subtitle: ProductStrings.inSupplies,
                    a11yLabel: "\(ProductStrings.unitCost): \(viewModel.unitCost.formatted(.currency(code: "MXN")))"
                )
            }

            Divider()
                .padding(.horizontal, Spacing.md)

            HStack(spacing: 0) {
                kpiCard(
                    icon: "arrow.up.right",
                    iconColor: marginColor,
                    label: ProductStrings.marginEstimated,
                    value: marginDisplay,
                    subtitle: marginSubtitle,
                    valueColor: marginColor,
                    a11yLabel: "\(ProductStrings.marginEstimated): \(marginDisplay)"
                )

                Divider()
                    .frame(height: 70)

                kpiCard(
                    icon: "calendar",
                    iconColor: SolennixColors.primary,
                    label: ProductStrings.upcomingEvents,
                    value: "\(viewModel.demandData.count)",
                    subtitle: ProductStrings.confirmed,
                    a11yLabel: "\(ProductStrings.upcomingEvents): \(viewModel.demandData.count)"
                )
            }
        }
        .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
        .padding(.horizontal, Spacing.md)
    }

    private func kpiCard(
        icon: String,
        iconColor: Color,
        label: String,
        value: String,
        subtitle: String,
        valueColor: Color = SolennixColors.text,
        a11yLabel: String
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
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(a11yLabel)
    }

    // MARK: - Smart Alert Row

    private func smartAlertRow(_ product: Product) -> some View {
        let isHighDemand = viewModel.demand7Days > 0

        return HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: isHighDemand ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .foregroundStyle(isHighDemand ? SolennixColors.primary : SolennixColors.success)
                .font(.title3)

            VStack(alignment: .leading, spacing: 4) {
                Text(isHighDemand
                     ? ProductStrings.unitsNext7Days(viewModel.demand7Days)
                     : viewModel.demandData.isEmpty ? ProductStrings.noUpcomingEvents : ProductStrings.noImmediateDemand
                )
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(isHighDemand ? SolennixColors.primary : SolennixColors.success)

                Group {
                    if isHighDemand {
                        if viewModel.estimatedRevenue7Days > 0 {
                            Text(ProductStrings.revenueMessage(viewModel.estimatedRevenue7Days.formatted(.currency(code: "MXN"))))
                        } else {
                            Text(ProductStrings.highDemandWeek)
                        }
                    } else if !viewModel.demandData.isEmpty {
                        Text(ProductStrings.demandSummary(units: viewModel.totalDemand, events: viewModel.demandData.count))
                    } else {
                        Text(ProductStrings.noConfirmedEvents)
                    }
                }
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(isHighDemand ? SolennixColors.primary.opacity(0.2) : Color.primary.opacity(0.06), lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.03), radius: 6, y: 3)
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - General Info Section

    private func generalInfoSection(_ product: Product) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(ProductStrings.generalInfo)
                .font(.caption.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            HStack(spacing: Spacing.md) {
                Image(systemName: "tag.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ProductStrings.category)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(product.category)
                        .font(.subheadline.weight(.medium))
                }
            }

            Divider()

            HStack(spacing: Spacing.md) {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ProductStrings.basePrice)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(product.basePrice.formatted(.currency(code: "MXN")))
                        .font(.subheadline.weight(.medium))
                }
            }

            Divider()

            HStack(spacing: Spacing.md) {
                Image(systemName: "square.stack.3d.up.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ProductStrings.composition)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(ProductStrings.compositionSummary(
                        ingredients: viewModel.ingredientItems.count,
                        supplies: viewModel.supplyItems.count,
                        equipment: viewModel.equipmentItems.count
                    ))
                    .font(.subheadline.weight(.medium))
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
        .padding(.horizontal, Spacing.md)
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
                        .font(.caption2.weight(.medium))
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
                Text(ProductStrings.ingredientHeader)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
                Text(ProductStrings.quantityHeader)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(SolennixColors.textSecondary)
                if showCost {
                    Text(ProductStrings.estimatedCostHeader)
                        .font(.caption2.weight(.semibold))
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
                let qtyFormatted = ingredient.quantityRequired.formatted(.number.precision(.fractionLength(0...2)))
                HStack {
                    Text(ingredient.ingredientName ?? ProductStrings.unknownItem)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.text)
                    Spacer()
                    Text("\(qtyFormatted) \(ingredient.unit ?? ProductStrings.unitFallback)")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(SolennixColors.text)
                    if showCost {
                        let cost = ingredient.quantityRequired * (ingredient.unitCost ?? 0)
                        Text(cost > 0 ? cost.formatted(.currency(code: "MXN")) : "—")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(totalColor)
                            .frame(width: 80, alignment: .trailing)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
                .accessibilityElement(children: .combine)
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
                        .font(.title3.weight(.bold))
                        .foregroundStyle(totalColor)
                }
                .padding(Spacing.md)
            }
        }
        .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
        .padding(.horizontal, Spacing.md)
    }
}

// MARK: - Product Detail Skeleton (in-ScrollView placeholder)

struct ProductDetailSkeleton: View {
    @ScaledMetric(relativeTo: .body) private var scaledImageHeight: CGFloat = 280
    private var cappedImageHeight: CGFloat { min(scaledImageHeight, 400) }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Stretchy Header placeholder (flat because loading, but matches height)
                Rectangle()
                    .fill(SolennixColors.surface)
                    .frame(height: cappedImageHeight)

                VStack(spacing: Spacing.md) {
                    // Title & Category skeleton card
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        SkeletonLine(width: 80, height: 14)
                        SkeletonLine(width: 200, height: 24)
                    }
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // Smart Alert Skeleton
                    HStack(alignment: .top, spacing: Spacing.md) {
                        SkeletonLine(width: 22, height: 22)
                            .clipShape(Circle())
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            SkeletonLine(width: 180, height: 14)
                            SkeletonLine(width: 120, height: 12)
                        }
                        Spacer()
                    }
                    .padding(Spacing.md)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .padding(.horizontal, Spacing.md)

                    // KPI Skeleton (2x2 grid inside a single card)
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            kpiSkeletonCard()
                            Divider().frame(height: 70)
                            kpiSkeletonCard()
                        }
                        Divider().padding(.horizontal, Spacing.md)
                        HStack(spacing: 0) {
                            kpiSkeletonCard()
                            Divider().frame(height: 70)
                            kpiSkeletonCard()
                        }
                    }
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // Chart skeleton
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SkeletonLine(width: 160, height: 18)
                        SkeletonLine(height: 200)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .padding(Spacing.md)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // Recipe composition skeleton
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: Spacing.sm) {
                            SkeletonLine(width: 16, height: 16)
                            SkeletonLine(width: 140, height: 16)
                            Spacer()
                        }
                        .padding(Spacing.md)

                        Divider()

                        HStack {
                            SkeletonLine(width: 60, height: 10)
                            Spacer()
                            SkeletonLine(width: 60, height: 10)
                            SkeletonLine(width: 70, height: 10)
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .background(SolennixColors.surface)

                        ForEach(0..<3, id: \.self) { _ in
                            Divider().opacity(0.5)
                            HStack {
                                SkeletonLine(width: 100, height: 14)
                                Spacer()
                                SkeletonLine(width: 50, height: 14)
                                SkeletonLine(width: 60, height: 14)
                            }
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .frame(minHeight: 44)
                        }
                    }
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // General info skeleton
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SkeletonLine(width: 140, height: 10)

                        HStack(spacing: Spacing.md) {
                            SkeletonLine(width: 18, height: 18)
                            VStack(alignment: .leading, spacing: 4) {
                                SkeletonLine(width: 60, height: 10)
                                SkeletonLine(width: 100, height: 14)
                            }
                        }

                        Divider()

                        HStack(spacing: Spacing.md) {
                            SkeletonLine(width: 18, height: 18)
                            VStack(alignment: .leading, spacing: 4) {
                                SkeletonLine(width: 60, height: 10)
                                SkeletonLine(width: 80, height: 14)
                            }
                        }

                        Divider()

                        HStack(spacing: Spacing.md) {
                            SkeletonLine(width: 18, height: 18)
                            VStack(alignment: .leading, spacing: 4) {
                                SkeletonLine(width: 80, height: 10)
                                SkeletonLine(width: 140, height: 14)
                            }
                        }
                    }
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    Color.clear.frame(height: Spacing.xl)
                }
                .padding(.top, -24)
                .zIndex(1)
            }
        }
        .ignoresSafeArea(.container, edges: .top)
    }

    private func kpiSkeletonCard() -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            SkeletonLine(width: 40, height: 10)
            SkeletonLine(width: 60, height: 22)
            SkeletonLine(width: 30, height: 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
    }
}

// MARK: - Preview

#Preview("Product Detail") {
    NavigationStack {
        ProductDetailView(apiClient: APIClient(), productId: "prod-123")
    }
}

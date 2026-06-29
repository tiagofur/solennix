import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Inventory Demand Entry

struct InventoryDemandEntry: Identifiable {
    let id: String
    let eventDate: Date
    let eventName: String
    let quantity: Double
    let unit: String
}

// MARK: - Demand Row Display Data (precomputed outside ForEach — fix #7)

struct DemandRowData {
    let entry: InventoryDemandEntry
    let runningBalance: Double
    let isInsufficient: Bool
    let diffDays: Int
}

// MARK: - Inventory Detail View Model

@Observable
final class InventoryDetailViewModel {

    var item: InventoryItem?
    var demandEntries: [InventoryDemandEntry] = []
    var isLoading: Bool = true
    var errorMessage: String?
    var showDeleteConfirm: Bool = false
    var showStockAdjustment: Bool = false
    var adjustmentQuantity: Double = 0
    var stockSavedCounter: Int = 0
    var stockErrorCounter: Int = 0

    private let apiClient: APIClient
    let itemId: String

    init(apiClient: APIClient, itemId: String) {
        self.apiClient = apiClient
        self.itemId = itemId
    }

    // MARK: - Computed KPIs

    var isLowStock: Bool {
        guard let item else { return false }
        return item.minimumStock > 0 && item.currentStock < item.minimumStock
    }

    var stockValue: Double {
        guard let item, let cost = item.unitCost else { return 0 }
        return cost * item.currentStock
    }

    // MARK: - UTC-pinned window (fix #2 — matches ProductDetail pattern)

    /// Today anchored to UTC midnight for stable day-window comparisons.
    /// Initialized eagerly; refreshed at the top of loadDemandForecast.
    private(set) var todayUTC: Date? = Date.fromServerDay(Date.localTodayString())

    /// UTC-pinned calendar for day-diff arithmetic — avoids timezone shifts.
    static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    var demand7Days: Double {
        guard let todayUTC else { return 0 }
        let in7 = Self.utcCalendar.date(byAdding: .day, value: 7, to: todayUTC) ?? todayUTC
        return demandEntries
            .filter { $0.eventDate >= todayUTC && $0.eventDate <= in7 }
            .reduce(0) { $0 + $1.quantity }
    }

    var stockAfter7Days: Double {
        (item?.currentStock ?? 0) - demand7Days
    }

    // MARK: - Data Loading

    @MainActor
    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            item = try await apiClient.get(Endpoint.inventoryItem(itemId))
            await loadDemandForecast()
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? InventoryStrings.errorLoadingTitle
            } else {
                errorMessage = InventoryStrings.errorLoadingTitle
            }
        }

        isLoading = false
    }

    // MARK: - Parallelized demand loading (fix #3 — withTaskGroup, fault-isolated)

    private struct DemandFetchResult {
        let entry: InventoryDemandEntry?
        let fetchFailed: Bool
    }

    @MainActor
    private func loadDemandForecast() async {
        guard let item else { return }

        // Anchor today once for the whole load (fix #2).
        todayUTC = Date.fromServerDay(Date.localTodayString())

        // Snapshot properties accessed inside child tasks to satisfy Swift 6 capture hygiene.
        let itemType = item.type
        let itemUnit = item.unit

        do {
            let events: [Event] = try await apiClient.getAll(Endpoint.upcomingEvents)
            let eventsSlice = Array(events.prefix(15))

            var collected: [InventoryDemandEntry] = []
            var fetchFailedCount = 0
            var successfulFetchCount = 0

            await withTaskGroup(of: DemandFetchResult.self) { group in
                for event in eventsSlice {
                    group.addTask { [apiClient, itemId] in
                        do {
                            // Parse date first — skip if unparseable, never fabricate.
                            guard let eventDate = Date.fromServerDay(event.eventDate) else {
                                return DemandFetchResult(entry: nil, fetchFailed: false)
                            }

                            let eventProducts: [EventProduct] = try await apiClient.get(Endpoint.eventProducts(event.id))

                            // Compute demand for this item across all products concurrently.
                            var eventDemand: Double = 0
                            await withTaskGroup(of: Double.self) { ingredientGroup in
                                for ep in eventProducts {
                                    ingredientGroup.addTask {
                                        do {
                                            let ingredients: [ProductIngredient] = try await apiClient.get(Endpoint.productIngredients(ep.productId))
                                            if let matching = ingredients.first(where: { $0.inventoryId == itemId }) {
                                                if itemType == .supply {
                                                    return matching.quantityRequired
                                                } else {
                                                    return matching.quantityRequired * ep.quantity
                                                }
                                            }
                                            return 0
                                        } catch {
                                            return 0
                                        }
                                    }
                                }
                                for await qty in ingredientGroup {
                                    eventDemand += qty
                                }
                            }

                            // Zero demand is a legitimate success — this event just doesn't use the item.
                            guard eventDemand > 0 else {
                                return DemandFetchResult(entry: nil, fetchFailed: false)
                            }

                            // Client fetch runs sequentially after the ingredient group completes.
                            var eventName = InventoryStrings.defaultEventName(serviceType: event.serviceType)
                            if !event.clientId.isEmpty {
                                if let client = try? await apiClient.get(Endpoint.client(event.clientId)) as Client {
                                    eventName = InventoryStrings.eventWithClient(client.name)
                                }
                            }

                            return DemandFetchResult(
                                entry: InventoryDemandEntry(
                                    id: event.id,
                                    eventDate: eventDate,
                                    eventName: eventName,
                                    quantity: eventDemand,
                                    unit: itemUnit
                                ),
                                fetchFailed: false
                            )
                        } catch {
                            return DemandFetchResult(entry: nil, fetchFailed: true)
                        }
                    }
                }

                for await result in group {
                    if result.fetchFailed {
                        fetchFailedCount += 1
                    } else {
                        successfulFetchCount += 1
                        if let entry = result.entry { collected.append(entry) }
                    }
                }
            }

            // Surface an error only when every fetch genuinely failed (network/auth),
            // not when items simply have zero demand in upcoming events.
            if fetchFailedCount > 0 && successfulFetchCount == 0 && !eventsSlice.isEmpty {
                errorMessage = InventoryStrings.unexpectedRetryError
            }

            demandEntries = collected.sorted { $0.eventDate < $1.eventDate }
        } catch {
            // Upcoming events fetch itself failed — demand section stays empty (non-critical).
        }
    }

    @MainActor
    func deleteItem() async -> Bool {
        do {
            try await apiClient.delete(Endpoint.inventoryItem(itemId))
            return true
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? InventoryStrings.unexpectedError
            } else {
                errorMessage = InventoryStrings.unexpectedError
            }
            return false
        }
    }

    @MainActor
    func saveStockAdjustment() async {
        guard let currentItem = item else { return }
        do {
            let body = InventoryItem(
                id: currentItem.id,
                userId: currentItem.userId,
                ingredientName: currentItem.ingredientName,
                currentStock: max(0, adjustmentQuantity),
                minimumStock: currentItem.minimumStock,
                unit: currentItem.unit,
                unitCost: currentItem.unitCost,
                lastUpdated: currentItem.lastUpdated,
                type: currentItem.type
            )
            let updated: InventoryItem = try await apiClient.put(Endpoint.inventoryItem(itemId), body: body)
            item = updated
            showStockAdjustment = false
            stockSavedCounter &+= 1
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? InventoryStrings.unexpectedError
            } else {
                errorMessage = InventoryStrings.unexpectedError
            }
            stockErrorCounter &+= 1
        }
    }

    // MARK: - Precomputed demand row data (fix #7 — no mutable accumulator inside ForEach)

    func makeDemandRows() -> [DemandRowData] {
        guard let todayUTC else { return demandEntries.map {
            DemandRowData(entry: $0, runningBalance: 0, isInsufficient: false, diffDays: 999)
        }}
        var balance = item?.currentStock ?? 0
        return demandEntries.map { entry in
            balance -= entry.quantity
            let diff = Self.utcCalendar.dateComponents([.day], from: todayUTC, to: entry.eventDate).day ?? 999
            return DemandRowData(
                entry: entry,
                runningBalance: balance,
                isInsufficient: balance < 0,
                diffDays: diff
            )
        }
    }
}

// MARK: - Inventory Detail View

public struct InventoryDetailView: View {

    @State private var viewModel: InventoryDetailViewModel
    @Environment(\.dismiss) private var dismiss

    // MARK: - @ScaledMetric sizes (capped — fix #10)
    @ScaledMetric(relativeTo: .largeTitle) private var stockFontSize: CGFloat = 48
    private var cappedStockFontSize: CGFloat { min(stockFontSize, 64) }

    @ScaledMetric(relativeTo: .body) private var emptyIconSize: CGFloat = 28
    private var cappedEmptyIconSize: CGFloat { min(emptyIconSize, 56) }

    public init(apiClient: APIClient, itemId: String) {
        _viewModel = State(initialValue: InventoryDetailViewModel(apiClient: apiClient, itemId: itemId))
    }

    public var body: some View {
        Group {
            // Fix #5 + #6: skeleton guard is isLoading && item == nil
            if viewModel.isLoading && viewModel.item == nil {
                List {
                    InventoryDetailSkeleton()
                }
                .listStyle(.insetGrouped)
                .solennixListStyle()
            } else if let item = viewModel.item {
                hubList(item)
            } else {
                ContentUnavailableView {
                    Label(InventoryStrings.errorTitle, systemImage: "exclamationmark.triangle")
                } description: {
                    Text(viewModel.errorMessage ?? InventoryStrings.errorLoadingTitle)
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(viewModel.item?.ingredientName ?? InventoryStrings.itemFallback)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                // Fix #8: only Edit + Delete in toolbar Menu; "Ajustar Stock" stays in body
                Menu {
                    NavigationLink(value: Route.inventoryForm(id: viewModel.itemId)) {
                        Label(InventoryStrings.edit, systemImage: "pencil")
                    }

                    Divider()

                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label(InventoryStrings.deleteAction, systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(InventoryStrings.moreActions)
                }
            }
        }
        .confirmationDialog(
            InventoryStrings.deleteTitle,
            isPresented: $viewModel.showDeleteConfirm
        ) {
            Button(InventoryStrings.deleteAction, role: .destructive) {
                Task {
                    if await viewModel.deleteItem() {
                        dismiss()
                    }
                }
            }
            Button(InventoryStrings.cancel, role: .cancel) {}
        } message: {
            Text(InventoryStrings.permanentDeletePrompt(viewModel.item?.ingredientName ?? ""))
        }
        // Gate alert: only present when the main entity is loaded — first-load failures
        // stay in the empty-state branch only (prevents double error UI).
        .alert(InventoryStrings.errorTitle, isPresented: Binding(
            get: { viewModel.errorMessage != nil && viewModel.item != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(InventoryStrings.ok, role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sheet(isPresented: $viewModel.showStockAdjustment) {
            stockAdjustmentSheet
        }
        .sensoryFeedback(.success, trigger: viewModel.stockSavedCounter)
        .sensoryFeedback(.error, trigger: viewModel.stockErrorCounter)
        .task { await viewModel.loadData() }
    }

    // MARK: - Hub List (fix #4 — List insetGrouped, no shadows, no AdaptiveDetailLayout)

    private func hubList(_ item: InventoryItem) -> some View {
        List {
            // Stock status hero
            Section {
                stockStatusCard(item)
            }
            .listRowSeparator(.hidden)

            // KPI row
            Section {
                kpiSection(item)
            }
            .listRowSeparator(.hidden)

            // Smart alert
            Section {
                smartAlertSection(item)
            }
            .listRowSeparator(.hidden)

            // Stock health bars
            Section {
                stockHealthBars(item)
            }
            .listRowSeparator(.hidden)

            // Info card
            Section {
                infoCard(item)
            }
            .listRowSeparator(.hidden)

            // Demand forecast
            Section {
                demandForecastSection(item)
            }
            .listRowSeparator(.hidden)
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
        .softScrollEdgeEffectIfAvailable()
        // Fix #6: refreshable keeps content visible (does NOT clear item/arrays)
        .refreshable {
            await viewModel.loadData()
        }
    }

    // MARK: - Stock Status Card

    private func stockStatusCard(_ item: InventoryItem) -> some View {
        let percentage = item.minimumStock > 0 ? min(1.0, item.currentStock / item.minimumStock) : 1.0
        let stockFormatted = item.currentStock.formatted(.number.precision(.fractionLength(0...2)))

        return VStack(spacing: Spacing.md) {
            HStack {
                Image(systemName: viewModel.isLowStock ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(viewModel.isLowStock ? SolennixColors.error : SolennixColors.success)
                Text(viewModel.isLowStock ? InventoryStrings.stockLow : InventoryStrings.stockOk)
                    .font(.headline)
                    .foregroundStyle(viewModel.isLowStock ? SolennixColors.error : SolennixColors.success)
                Spacer()
                
                HStack(spacing: Spacing.xs) {
                    Text(localizedTypeName(item.type))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(SolennixColors.surface)
                        .clipShape(Capsule())

                    Button {
                        viewModel.adjustmentQuantity = item.currentStock
                        viewModel.showStockAdjustment = true
                    } label: {
                        Text(InventoryStrings.adjustStock)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(SolennixColors.primary)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xs)
                            .background(SolennixColors.primaryLight)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            HStack(alignment: .lastTextBaseline, spacing: Spacing.xs) {
                Text(stockFormatted)
                    .font(.system(size: cappedStockFontSize, weight: .bold, design: .rounded))
                    .foregroundStyle(SolennixColors.text)
                Text(item.unit)
                    .font(.title3)
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(InventoryStrings.minimumShort)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                    Text(InventoryStrings.minimumValue(Int(item.minimumStock), unit: item.unit))
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(InventoryStrings.stockStatusA11y(
                stock: stockFormatted,
                unit: item.unit,
                isLow: viewModel.isLowStock,
                minimum: item.minimumStock > 0 ? Int(item.minimumStock) : nil
            ))

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(SolennixColors.surface)
                        .frame(height: 4)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(viewModel.isLowStock ? SolennixColors.error : SolennixColors.success)
                        .frame(width: geo.size.width * percentage, height: 4)
                }
            }
            .frame(height: 4)
            .accessibilityHidden(true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }

    // MARK: - KPI Section

    private func kpiSection(_ item: InventoryItem) -> some View {
        HStack(spacing: 0) {
            kpiCard(
                icon: "dollarsign.circle.fill",
                iconColor: SolennixColors.primary,
                label: InventoryStrings.unitCost,
                value: (item.unitCost ?? 0) > 0
                    ? (item.unitCost ?? 0).formatted(.currency(code: "MXN"))
                    : "—",
                subtitle: InventoryStrings.perUnit(item.unit),
                a11yLabel: "\(InventoryStrings.unitCost): \((item.unitCost ?? 0) > 0 ? (item.unitCost ?? 0).formatted(.currency(code: "MXN")) : "—")"
            )

            Divider()
                .frame(height: 50)

            kpiCard(
                icon: "chart.bar.fill",
                iconColor: SolennixColors.primary,
                label: InventoryStrings.stockValue,
                value: item.unitCost != nil
                    ? viewModel.stockValue.formatted(.currency(code: "MXN"))
                    : "—",
                subtitle: InventoryStrings.totalValue,
                a11yLabel: "\(InventoryStrings.stockValue): \(item.unitCost != nil ? viewModel.stockValue.formatted(.currency(code: "MXN")) : "—")"
            )
        }
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }

    private func kpiCard(
        icon: String,
        iconColor: Color,
        label: String,
        value: String,
        subtitle: String,
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
                .foregroundStyle(SolennixColors.text)
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

    // MARK: - Smart Alert

    private func smartAlertSection(_ item: InventoryItem) -> some View {
        let demand = viewModel.demand7Days
        let stockAfter = viewModel.stockAfter7Days
        let isCritical = demand > 0 && stockAfter < 0
        let isWarning = demand > 0 && stockAfter >= 0 && stockAfter < item.minimumStock
        let isLowOnly = viewModel.isLowStock && demand == 0

        let alertColor: Color = isCritical || isLowOnly ? SolennixColors.error :
            (isWarning ? SolennixColors.warning : SolennixColors.success)
        let alertIcon = (isCritical || isWarning || isLowOnly) ? "exclamationmark.triangle.fill" : "checkmark.circle.fill"

        return HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: alertIcon)
                .foregroundStyle(alertColor)
                .font(.title3)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text({
                    if isCritical { return InventoryStrings.critical7Days }
                    if isWarning { return InventoryStrings.belowMinAfterEvents }
                    if isLowOnly { return InventoryStrings.belowMinRecommended }
                    if demand > 0 { return InventoryStrings.enough7Days }
                    if !viewModel.demandEntries.isEmpty { return InventoryStrings.noDemand7Days }
                    return InventoryStrings.noUpcomingEvents
                }())
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(alertColor)

                if isCritical {
                    Text(InventoryStrings.shortageMessage(
                        demand: Int(demand),
                        stock: Int(item.currentStock),
                        missing: Int(-stockAfter),
                        unit: item.unit
                    ))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                } else if isLowOnly {
                    Text(InventoryStrings.lowStockMessage(
                        stock: Int(item.currentStock),
                        unit: item.unit,
                        minimum: Int(item.minimumStock)
                    ))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            Spacer()
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }

    // MARK: - Stock Health Bars

    private func stockHealthBars(_ item: InventoryItem) -> some View {
        let demand = viewModel.demand7Days
        let maxBar = max(item.currentStock, item.minimumStock, demand, 1)

        return VStack(alignment: .leading, spacing: Spacing.md) {
            Text(InventoryStrings.stockHealthTitle)
                .font(.caption.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            healthBar(
                label: InventoryStrings.currentStock,
                value: InventoryStrings.quantityWithUnit(Int(item.currentStock), unit: item.unit),
                fraction: item.currentStock / maxBar,
                color: viewModel.isLowStock ? SolennixColors.error : SolennixColors.primary
            )
            healthBar(
                label: InventoryStrings.recommendedMinimum,
                value: InventoryStrings.quantityWithUnit(Int(item.minimumStock), unit: item.unit),
                fraction: item.minimumStock / maxBar,
                color: SolennixColors.warning
            )
            if demand > 0 {
                healthBar(
                    label: InventoryStrings.demandNext7Days,
                    value: InventoryStrings.quantityWithUnit(Int(demand), unit: item.unit),
                    fraction: demand / maxBar,
                    color: viewModel.stockAfter7Days < 0 ? SolennixColors.error : SolennixColors.warning
                )
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }

    private func healthBar(label: String, value: String, fraction: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
                Text(value)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.surface)
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(color)
                        .frame(width: geo.size.width * min(1.0, fraction), height: 8)
                }
            }
            .frame(height: 8)
            .accessibilityHidden(true)
        }
    }

    // MARK: - Info Card

    private func infoCard(_ item: InventoryItem) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(InventoryStrings.information)
                .font(.caption.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            if let cost = item.unitCost, cost > 0 {
                HStack(spacing: Spacing.md) {
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundStyle(SolennixColors.primary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(InventoryStrings.costPerUnit)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Text(cost.formatted(.currency(code: "MXN")))
                            .font(.subheadline.weight(.medium))
                    }
                }

                Divider()

                HStack(spacing: Spacing.md) {
                    Image(systemName: "chart.bar.fill")
                        .foregroundStyle(SolennixColors.textTertiary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(InventoryStrings.totalStockValue)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Text((cost * item.currentStock).formatted(.currency(code: "MXN")))
                            .font(.subheadline.weight(.medium))
                    }
                }
            } else {
                Text(InventoryStrings.noUnitCost)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .italic()
            }

            // Fix #1: lastUpdated display via cached Date.from(isoString:) helper — no per-render allocation
            if let lastUpdated = Date.from(isoString: item.lastUpdated) {
                Divider()

                HStack(spacing: Spacing.md) {
                    Image(systemName: "clock")
                        .foregroundStyle(SolennixColors.textTertiary)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(InventoryStrings.lastUpdated)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Text(lastUpdated.formattedServerDayTemplate("dMMMyyyy HH:mm", locale: Date.mexicanLocale))
                            .font(.subheadline.weight(.medium))
                    }
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }

    // MARK: - Demand Forecast

    private func demandForecastSection(_ item: InventoryItem) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(SolennixColors.primary)
                    .accessibilityHidden(true)
                Text(InventoryStrings.demandByDate)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Text(InventoryStrings.confirmedEvents)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if viewModel.demandEntries.isEmpty {
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: cappedEmptyIconSize))
                        .foregroundStyle(SolennixColors.textTertiary)
                        .accessibilityHidden(true)
                    Text(InventoryStrings.noConfirmedEvents)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.lg)
                .accessibilityElement(children: .combine)
            } else {
                // Fix #7: precomputed rows OUTSIDE ForEach — no mutable accumulator inside body
                let rows = viewModel.makeDemandRows()

                ForEach(rows, id: \.entry.id) { row in
                    demandRow(row)
                }

                Divider()
                HStack {
                    Text(InventoryStrings.totalDemand)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Spacer()
                    let total = viewModel.demandEntries.reduce(0) { $0 + $1.quantity }
                    Text(total.formatted(.number.precision(.fractionLength(0...2))) + " \(item.unit)")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }

    private func demandRow(_ row: DemandRowData) -> some View {
        let entry = row.entry
        // Fix #2: diffDays already computed with utcCalendar against todayUTC
        let diffDays = row.diffDays
        let isWithinWeek = diffDays >= 0 && diffDays <= 7

        return HStack {
            Circle()
                .fill(row.isInsufficient ? SolennixColors.error : (isWithinWeek ? SolennixColors.warning : SolennixColors.primary.opacity(0.4)))
                .frame(width: 8, height: 8)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    // Fix #1: entry.eventDate already parsed with fromServerDay; format with UTC formatter
                    Text(entry.eventDate.formattedServerDay(style: "d MMM"))
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)

                    if diffDays == 0 {
                        badgeLabel(InventoryStrings.today, color: SolennixColors.primary)
                    } else if diffDays == 1 {
                        badgeLabel(InventoryStrings.tomorrow, color: SolennixColors.warning)
                    } else if diffDays > 1 && diffDays <= 7 {
                        Text(InventoryStrings.inDays(diffDays))
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }
                Text(entry.eventName)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)
            }

            Spacer()

            // Fix #10: .formatted instead of Int() truncation
            Text(entry.quantity.formatted(.number.precision(.fractionLength(0...2))) + " \(entry.unit)")
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(row.isInsufficient ? SolennixColors.error : SolennixColors.text)
        }
        .padding(.vertical, Spacing.xs)
        // Fix #10: a11y combined label for demand rows
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(InventoryStrings.demandRowA11y(
            name: entry.eventName,
            quantity: entry.quantity.formatted(.number.precision(.fractionLength(0...2))),
            unit: entry.unit,
            diffDays: diffDays,
            isInsufficient: row.isInsufficient
        ))
    }

    private func badgeLabel(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    // MARK: - Stock Adjustment Sheet

    private var stockAdjustmentSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                if let item = viewModel.item {
                    Text(item.ingredientName)
                        .font(.title3)
                        .fontWeight(.semibold)

                    Text(InventoryStrings.stockActual(Int(item.currentStock), unit: item.unit))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Divider()

                    HStack {
                        Text(InventoryStrings.newStock)
                        TextField("0", value: $viewModel.adjustmentQuantity, format: .number)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 100)
                        Text(item.unit)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    HStack(spacing: Spacing.md) {
                        ForEach([-10, -1, 1, 10], id: \.self) { delta in
                            Button {
                                viewModel.adjustmentQuantity = max(0, viewModel.adjustmentQuantity + Double(delta))
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
                    Button(InventoryStrings.cancel) { viewModel.showStockAdjustment = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(InventoryStrings.save) {
                        Task { await viewModel.saveStockAdjustment() }
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Helpers

    private func localizedTypeName(_ type: InventoryType) -> String {
        switch type {
        case .ingredient: return InventoryStrings.ingredientType
        case .equipment:  return InventoryStrings.equipmentType
        case .supply:     return InventoryStrings.supplyType
        }
    }
}

// MARK: - Inventory Detail Skeleton (in-List, fix #5)

struct InventoryDetailSkeleton: View {

    @ScaledMetric(relativeTo: .body) private var scaledIconSize: CGFloat = 48
    private var cappedIconSize: CGFloat { min(scaledIconSize, 64) }

    var body: some View {
        // Stock hero
        Section {
            VStack(spacing: Spacing.md) {
                HStack {
                    SkeletonLine(width: 22, height: 22).clipShape(Circle())
                    SkeletonLine(width: 80, height: 16)
                    Spacer()
                    
                    HStack(spacing: Spacing.xs) {
                        SkeletonLine(width: 60, height: 20).clipShape(Capsule())
                        SkeletonLine(width: 70, height: 20).clipShape(Capsule())
                    }
                }
                HStack(alignment: .lastTextBaseline, spacing: Spacing.xs) {
                    SkeletonLine(width: 80, height: CGFloat(cappedIconSize))
                    SkeletonLine(width: 40, height: 20)
                    Spacer()
                }
                SkeletonLine(height: 4).clipShape(RoundedRectangle(cornerRadius: 2))
            }
            .padding(Spacing.md)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // KPI row
        Section {
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 40, height: 10)
                    SkeletonLine(width: 60, height: 22)
                    SkeletonLine(width: 30, height: 10)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.md)

                Divider()
                    .frame(height: 50)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 40, height: 10)
                    SkeletonLine(width: 60, height: 22)
                    SkeletonLine(width: 30, height: 10)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.md)
            }
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // Smart alert
        Section {
            HStack(alignment: .top, spacing: Spacing.md) {
                SkeletonLine(width: 22, height: 22).clipShape(Circle())
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 180, height: 14)
                    SkeletonLine(width: 120, height: 12)
                }
                Spacer()
            }
            .padding(Spacing.md)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // Stock health bars
        Section {
            VStack(alignment: .leading, spacing: Spacing.md) {
                SkeletonLine(width: 100, height: 10)
                ForEach(0..<3, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            SkeletonLine(width: 80, height: 10)
                            Spacer()
                            SkeletonLine(width: 50, height: 10)
                        }
                        SkeletonLine(height: 8).clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
            }
            .padding(Spacing.md)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // Info card
        Section {
            VStack(alignment: .leading, spacing: Spacing.md) {
                SkeletonLine(width: 100, height: 10)
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
                        SkeletonLine(width: 80, height: 10)
                        SkeletonLine(width: 120, height: 14)
                    }
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // Demand forecast skeleton
        Section {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    SkeletonLine(width: 16, height: 16)
                    SkeletonLine(width: 140, height: 16)
                    Spacer()
                    SkeletonLine(width: 80, height: 10)
                }
                ForEach(0..<3, id: \.self) { _ in
                    HStack {
                        SkeletonLine(width: 8, height: 8).clipShape(Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            SkeletonLine(width: 60, height: 14)
                            SkeletonLine(width: 100, height: 10)
                        }
                        Spacer()
                        SkeletonLine(width: 50, height: 14)
                    }
                    .padding(.vertical, Spacing.xs)
                }
            }
            .padding(Spacing.md)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }
}

// MARK: - Preview

#Preview("Inventory Detail") {
    NavigationStack {
        InventoryDetailView(apiClient: APIClient(), itemId: "inv-123")
    }
}

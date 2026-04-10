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

// MARK: - Inventory Detail View

public struct InventoryDetailView: View {

    @State private var item: InventoryItem?
    @State private var demandEntries: [InventoryDemandEntry] = []
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    @State private var showDeleteConfirm: Bool = false
    @State private var showStockAdjustment: Bool = false
    @State private var adjustmentQuantity: Double = 0

    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    private let apiClient: APIClient
    private let itemId: String

    public init(apiClient: APIClient, itemId: String) {
        self.apiClient = apiClient
        self.itemId = itemId
    }

    // MARK: - Computed

    private var isLowStock: Bool {
        guard let item else { return false }
        return item.minimumStock > 0 && item.currentStock < item.minimumStock
    }

    private var stockValue: Double {
        guard let item, let cost = item.unitCost else { return 0 }
        return cost * item.currentStock
    }

    private var demand7Days: Double {
        let today = Calendar.current.startOfDay(for: Date())
        let in7Days = Calendar.current.date(byAdding: .day, value: 7, to: today) ?? today
        return demandEntries.filter { $0.eventDate >= today && $0.eventDate <= in7Days }
            .reduce(0) { $0 + $1.quantity }
    }

    private var stockAfter7Days: Double {
        (item?.currentStock ?? 0) - demand7Days
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
        .background(SolennixColors.surfaceGrouped)
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
            await loadDemandForecast()
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
    private func loadDemandForecast() async {
        guard let item else { return }

        do {
            let events: [Event] = try await apiClient.getAll(Endpoint.upcomingEvents)
            var entries: [InventoryDemandEntry] = []

            for event in events.prefix(15) {
                let eventProducts: [EventProduct] = try await apiClient.get(Endpoint.eventProducts(event.id))
                var eventDemand: Double = 0

                for ep in eventProducts {
                    do {
                        let ingredients: [ProductIngredient] = try await apiClient.get(Endpoint.productIngredients(ep.productId))
                        if let matching = ingredients.first(where: { $0.inventoryId == itemId }) {
                            // Supplies have fixed per-event quantity, not scaled by product qty
                            if item.type == .supply {
                                eventDemand += matching.quantityRequired
                            } else {
                                eventDemand += matching.quantityRequired * Double(ep.quantity)
                            }
                        }
                    } catch {
                        // Skip failed ingredient fetches
                    }
                }

                if eventDemand > 0 {
                    // Try to get client name
                    var eventName = event.serviceType ?? "Evento"
                    if !event.clientId.isEmpty {
                        do {
                            let client: Client = try await apiClient.get(Endpoint.client(event.clientId))
                            eventName = "Evento - \(client.name)"
                        } catch {}
                    }

                    entries.append(InventoryDemandEntry(
                        id: event.id,
                        eventDate: ISO8601DateFormatter().date(from: event.eventDate) ?? Date(),
                        eventName: eventName,
                        quantity: eventDemand,
                        unit: item.unit
                    ))
                }
            }

            demandEntries = entries.sorted { $0.eventDate < $1.eventDate }
        } catch {
            // Demand forecast is supplementary
        }
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
                AdaptiveDetailLayout {
                    // Left: Item info, KPI cards
                    stockStatusCard(item)
                    kpiSection(item)
                    smartAlertSection(item)
                    infoCard(item)
                } right: {
                    // Right: Stock health, demand forecast
                    stockHealthBars(item)
                    demandForecastSection(item)
                }

                // Last updated (full-width below)
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
        let percentage = item.minimumStock > 0 ? min(1.0, item.currentStock / item.minimumStock) : 1.0

        return VStack(spacing: Spacing.md) {
            HStack {
                Image(systemName: isLowStock ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(isLowStock ? SolennixColors.error : SolennixColors.success)
                Text(isLowStock ? "Stock Bajo" : "Stock OK")
                    .font(.headline)
                    .foregroundStyle(isLowStock ? SolennixColors.error : SolennixColors.success)
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

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.surface)
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(isLowStock ? SolennixColors.error : SolennixColors.success)
                        .frame(width: geo.size.width * percentage, height: 8)
                }
            }
            .frame(height: 8)

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

    // MARK: - KPI Section

    private func kpiSection(_ item: InventoryItem) -> some View {
        HStack(spacing: Spacing.sm) {
            kpiCard(
                icon: "dollarsign.circle.fill",
                iconColor: SolennixColors.primary,
                label: "Costo Unitario",
                value: item.unitCost != nil && item.unitCost! > 0
                    ? item.unitCost!.formatted(.currency(code: "MXN"))
                    : "—",
                subtitle: "por \(item.unit)"
            )
            kpiCard(
                icon: "chart.bar.fill",
                iconColor: SolennixColors.primary,
                label: "Valor en Stock",
                value: item.unitCost != nil
                    ? stockValue.formatted(.currency(code: "MXN"))
                    : "—",
                subtitle: "valor total"
            )
        }
    }

    private func kpiCard(icon: String, iconColor: Color, label: String, value: String, subtitle: String) -> some View {
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
                .fontWeight(.black)
                .foregroundStyle(SolennixColors.text)
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

    // MARK: - Smart Alert

    private func smartAlertSection(_ item: InventoryItem) -> some View {
        let isCritical = demand7Days > 0 && stockAfter7Days < 0
        let isWarning = demand7Days > 0 && stockAfter7Days >= 0 && stockAfter7Days < item.minimumStock
        let isLowOnly = isLowStock && demand7Days == 0

        let alertColor: Color = isCritical || isLowOnly ? SolennixColors.error :
            (isWarning ? .orange : .green)
        let alertIcon = (isCritical || isWarning || isLowOnly) ? "exclamationmark.triangle.fill" : "checkmark.circle.fill"

        return HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: alertIcon)
                .foregroundStyle(alertColor)
                .font(.title3)

            VStack(alignment: .leading, spacing: 2) {
                Text({
                    if isCritical { return "¡Stock insuficiente para los proximos 7 dias!" }
                    if isWarning { return "Stock quedara bajo el minimo tras eventos proximos" }
                    if isLowOnly { return "Stock por debajo del minimo recomendado" }
                    if demand7Days > 0 { return "Stock suficiente para los proximos 7 dias" }
                    if !demandEntries.isEmpty { return "Sin demanda en los proximos 7 dias" }
                    return "Sin eventos proximos"
                }())
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(alertColor)

                if isCritical {
                    Text("Necesitas \(Int(demand7Days)) \(item.unit) en los proximos 7 dias. Tienes \(Int(item.currentStock)) \(item.unit). Faltan \(Int(-stockAfter7Days)) \(item.unit).")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                } else if isLowOnly {
                    Text("Tu stock actual (\(Int(item.currentStock)) \(item.unit)) esta por debajo del minimo recomendado (\(Int(item.minimumStock)) \(item.unit)).")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            Spacer()
        }
        .padding(Spacing.md)
        .background((isCritical || isLowOnly) ? SolennixColors.error.opacity(0.08) :
                        (isWarning ? Color.orange.opacity(0.08) :
                            (demand7Days > 0 ? Color.green.opacity(0.08) : SolennixColors.card)))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .stroke((isCritical || isLowOnly) ? SolennixColors.error.opacity(0.2) :
                            (isWarning ? Color.orange.opacity(0.2) : SolennixColors.border), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Stock Health Bars

    private func stockHealthBars(_ item: InventoryItem) -> some View {
        let maxBar = max(item.currentStock, item.minimumStock, demand7Days, 1)

        return VStack(alignment: .leading, spacing: Spacing.md) {
            healthBar(
                label: "Stock Actual",
                value: "\(Int(item.currentStock)) \(item.unit)",
                fraction: item.currentStock / maxBar,
                color: isLowStock ? SolennixColors.error : SolennixColors.primary
            )
            healthBar(
                label: "Minimo Recomendado",
                value: "\(Int(item.minimumStock)) \(item.unit)",
                fraction: item.minimumStock / maxBar,
                color: .orange
            )
            if demand7Days > 0 {
                healthBar(
                    label: "Demanda proximos 7 dias",
                    value: "\(Int(demand7Days)) \(item.unit)",
                    fraction: demand7Days / maxBar,
                    color: stockAfter7Days < 0 ? SolennixColors.error : .orange
                )
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
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
        }
    }

    // MARK: - Demand Forecast

    private func demandForecastSection(_ item: InventoryItem) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(SolennixColors.primary)
                Text("Demanda por Fecha")
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Text("Eventos confirmados")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if demandEntries.isEmpty {
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 28))
                        .foregroundStyle(SolennixColors.textTertiary)
                    Text("Sin eventos confirmados que usen este item.")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.lg)
            } else {
                let today = Calendar.current.startOfDay(for: Date())
                var accumulated = item.currentStock

                ForEach(demandEntries) { entry in
                    let _ = (accumulated -= entry.quantity)
                    let isInsufficient = accumulated < 0
                    let diffDays = Calendar.current.dateComponents([.day], from: today, to: Calendar.current.startOfDay(for: entry.eventDate)).day ?? 999
                    let isWithinWeek = diffDays >= 0 && diffDays <= 7

                    HStack {
                        Circle()
                            .fill(isInsufficient ? SolennixColors.error : (isWithinWeek ? .orange : SolennixColors.primary.opacity(0.4)))
                            .frame(width: 8, height: 8)

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 4) {
                                Text(entry.eventDate.formatted(.dateTime.day().month(.abbreviated)))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(SolennixColors.text)

                                if diffDays == 0 {
                                    badgeLabel("Hoy", color: SolennixColors.primary)
                                } else if diffDays == 1 {
                                    badgeLabel("Manana", color: .orange)
                                } else if diffDays > 1 && diffDays <= 7 {
                                    Text("en \(diffDays) dias")
                                        .font(.caption2)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                }
                            }
                        }

                        Spacer()

                        Text("\(Int(entry.quantity)) \(entry.unit)")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundStyle(isInsufficient ? SolennixColors.error : SolennixColors.text)
                    }
                    .padding(.vertical, Spacing.xs)
                }

                Divider()
                HStack {
                    Text("Total demanda")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Spacer()
                    let total = demandEntries.reduce(0) { $0 + $1.quantity }
                    Text("\(Int(total)) \(item.unit)")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)
                }
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
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
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { showStockAdjustment = false }
                }
                ToolbarItem(placement: .confirmationAction) {
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

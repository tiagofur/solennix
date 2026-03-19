import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork
import TipKit

// MARK: - Dashboard View

public struct DashboardView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @Environment(\.apiClient) private var apiClient
    @State private var viewModel: DashboardViewModel?
    @State private var showSearch = false
    @State private var showQuickQuote = false

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                // Header
                headerSection

                // Plan Limits Banner
                if !planLimitsManager.canCreateEvent {
                    UpgradeBannerView(
                        type: .limitReached,
                        resource: "Eventos",
                        currentUsage: planLimitsManager.eventsThisMonth,
                        limit: PlanLimitsManager.freePlanEventLimit
                    ) {
                        // Action to go to Pricing — will be implemented via navigation
                    }
                    .padding(.horizontal, Spacing.md)
                } else if planLimitsManager.isBasicPlan {
                    UpgradeBannerView(
                        type: .upsell
                    ) {
                        // Action to go to Pricing
                    }
                    .padding(.horizontal, Spacing.md)
                }

                // Quick Actions
                quickActionsSection

                // KPI Cards
                kpiCardsSection

                // Event Status Chart
                if let vm = viewModel, !vm.eventsThisMonth.isEmpty {
                    EventStatusChart(statusCounts: vm.eventStatusCounts)
                        .padding(.horizontal, Spacing.md)
                }

                // Low Stock Alerts
                if let vm = viewModel, !vm.lowStockItems.isEmpty {
                    lowStockSection(items: vm.lowStockItems)
                }

                // Upcoming Events
                upcomingEventsSection

                Spacer(minLength: Spacing.xxl)
            }
        }
        .refreshable {
            await viewModel?.refresh()
        }
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
        .onAppear {
            if viewModel == nil, let client = authManager.apiClient {
                viewModel = DashboardViewModel(apiClient: client)
            }
            Task { 
                await viewModel?.loadDashboard() 
                await planLimitsManager.checkLimits()
            }
        }
        .sheet(isPresented: $showSearch) {
            NavigationStack {
                SearchView()
            }
        }
        .sheet(isPresented: $showQuickQuote) {
            QuickQuoteView(apiClient: apiClient)
                .presentationDetents([.large])
        }
        .overlay {
            if viewModel?.isLoading == true && viewModel?.eventsThisMonth.isEmpty == true {
                ProgressView()
                    .tint(SolennixColors.primary)
            }
            
            PendingEventsModalView(apiClient: apiClient)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(greetingText)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                Text(currentDateString)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()

            HStack(spacing: Spacing.sm) {
                Button {
                    showQuickQuote = true
                } label: {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.title3)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                        .frame(width: 44, height: 44)
                        .background(SolennixColors.card)
                        .clipShape(Circle())
                        .shadowSm()
                }

                Button {
                    showSearch = true
                } label: {
                    Image(systemName: "magnifyingglass")
                        .font(.title3)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                        .frame(width: 44, height: 44)
                        .background(SolennixColors.card)
                        .clipShape(Circle())
                        .shadowSm()
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.sm)
    }

    private var greetingText: String {
        if case .authenticated(let user) = authManager.authState {
            let firstName = user.name.components(separatedBy: " ").first ?? user.name
            return "Hola, \(firstName)"
        }
        return "Hola"
    }

    private var currentDateString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "es_MX")
        formatter.dateFormat = "EEEE d 'de' MMMM"
        let str = formatter.string(from: Date())
        return str.prefix(1).uppercased() + str.dropFirst()
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        HStack(spacing: Spacing.md) {
            Button {
                HapticsHelper.play(.light)
            } label: {
                if planLimitsManager.canCreateEvent {
                    NavigationLink(value: Route.eventForm()) {
                        quickActionButton(icon: "plus.circle.fill", label: "Nuevo Evento", color: SolennixColors.primary)
                    }
                } else {
                    quickActionButton(icon: "plus.circle.fill", label: "Nuevo Evento", color: SolennixColors.textTertiary)
                        .opacity(0.6)
                }
            }
            .buttonStyle(.plain)

            Button {
                HapticsHelper.play(.light)
            } label: {
                if planLimitsManager.canCreateClient {
                    NavigationLink(value: Route.clientForm()) {
                        quickActionButton(icon: "person.badge.plus", label: "Nuevo Cliente", color: SolennixColors.statusConfirmed)
                    }
                } else {
                    quickActionButton(icon: "person.badge.plus", label: "Nuevo Cliente", color: SolennixColors.textTertiary)
                        .opacity(0.6)
                }
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, Spacing.md)
        .popoverTip(NewEventTip(), arrowEdge: .bottom)
        .popoverTip(QuickQuoteTip(), arrowEdge: .top)
    }

    private func quickActionButton(icon: String, label: String, color: Color) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(color)

            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    // MARK: - KPI Cards

    private var kpiCardsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.md) {
                KPICardView(
                    title: "Ventas Netas",
                    value: viewModel?.netSalesThisMonth.asMXN ?? "$0",
                    icon: "dollarsign.circle",
                    iconColor: SolennixColors.kpiGreen,
                    iconBgColor: SolennixColors.kpiGreenBg
                )

                KPICardView(
                    title: "Cobrado",
                    value: viewModel?.cashCollectedThisMonth.asMXN ?? "$0",
                    icon: "banknote",
                    iconColor: SolennixColors.kpiOrange,
                    iconBgColor: SolennixColors.kpiOrangeBg
                )

                KPICardView(
                    title: "IVA Cobrado",
                    value: viewModel?.vatCollectedThisMonth.asMXN ?? "$0",
                    icon: "percent",
                    iconColor: SolennixColors.kpiBlue,
                    iconBgColor: SolennixColors.kpiBlueBg
                )

                KPICardView(
                    title: "IVA Pendiente",
                    value: viewModel?.vatOutstandingThisMonth.asMXN ?? "$0",
                    icon: "exclamationmark.circle",
                    iconColor: SolennixColors.kpiBlue,
                    iconBgColor: SolennixColors.kpiBlueBg
                )

                KPICardView(
                    title: "Eventos del Mes",
                    value: "\(viewModel?.eventsThisMonth.count ?? 0)",
                    icon: "calendar",
                    iconColor: SolennixColors.kpiOrange,
                    iconBgColor: SolennixColors.kpiOrangeBg
                )

                KPICardView(
                    title: "Stock Bajo",
                    value: "\(viewModel?.lowStockCount ?? 0)",
                    icon: "archivebox",
                    iconColor: (viewModel?.lowStockCount ?? 0) > 0
                        ? SolennixColors.kpiOrange
                        : SolennixColors.kpiGreen,
                    iconBgColor: (viewModel?.lowStockCount ?? 0) > 0
                        ? SolennixColors.kpiOrangeBg
                        : SolennixColors.kpiGreenBg
                )

                KPICardView(
                    title: "Clientes",
                    value: "\(viewModel?.totalClients ?? 0)",
                    icon: "person.2",
                    iconColor: SolennixColors.kpiBlue,
                    iconBgColor: SolennixColors.kpiBlueBg
                )

                KPICardView(
                    title: "Cotizaciones",
                    value: "\(viewModel?.pendingQuotes ?? 0)",
                    icon: "doc.text.badge.clock",
                    iconColor: SolennixColors.kpiOrange,
                    iconBgColor: SolennixColors.kpiOrangeBg
                )
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Low Stock Section

    private func lowStockSection(items: [InventoryItem]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(SolennixColors.warning)
                Text("Alertas de Stock")
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
            }
            .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                ForEach(items) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text(item.ingredientName)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(SolennixColors.text)

                            Text("Stock: \(Int(item.currentStock))/\(Int(item.minimumStock)) \(item.unit)")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        Spacer()

                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(SolennixColors.warning)
                            .font(.body)
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.card)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                    .shadowSm()
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Upcoming Events Section

    private var upcomingEventsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Proximos Eventos")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)
                .padding(.horizontal, Spacing.md)

            if let vm = viewModel, !vm.upcomingEvents.isEmpty {
                VStack(spacing: Spacing.sm) {
                    ForEach(vm.upcomingEvents) { event in
                        NavigationLink(value: Route.eventDetail(id: event.id)) {
                            upcomingEventCard(event: event)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, Spacing.md)
            } else if viewModel?.isLoading == false {
                emptyEventsState
                    .padding(.horizontal, Spacing.md)
            }
        }
    }

    private func upcomingEventCard(event: Event) -> some View {
        HStack(spacing: Spacing.md) {
            // Date box
            dateBox(for: event.eventDate)

            // Event info
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(viewModel?.clientName(for: event.clientId) ?? "Cliente")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                HStack(spacing: Spacing.sm) {
                    Text(event.serviceType)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Text("\(event.numPeople) personas")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }

            Spacer()

            StatusBadge(status: event.status.rawValue)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    private func dateBox(for dateString: String) -> some View {
        let (month, day) = parseDateComponents(dateString)
        return VStack(spacing: Spacing.xxs) {
            Text(month)
                .font(.caption2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.primary)
                .textCase(.uppercase)

            Text(day)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(width: 48, height: 48)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    private func parseDateComponents(_ dateString: String) -> (month: String, day: String) {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: String(dateString.prefix(10))) else {
            return ("---", "--")
        }
        let monthFormatter = DateFormatter()
        monthFormatter.locale = Locale(identifier: "es_MX")
        monthFormatter.dateFormat = "MMM"
        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "d"
        return (monthFormatter.string(from: date), dayFormatter.string(from: date))
    }

    private var emptyEventsState: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 40))
                .foregroundStyle(SolennixColors.textTertiary)

            Text("Sin eventos proximos")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }
}

// MARK: - Preview

#Preview("Dashboard") {
    NavigationStack {
        DashboardView()
    }
    .environment(AuthManager())
}

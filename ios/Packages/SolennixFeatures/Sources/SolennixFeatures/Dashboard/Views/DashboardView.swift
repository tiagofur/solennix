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
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: DashboardViewModel?
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    private var isIPad: Bool { sizeClass == .regular }

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                // Header
                headerSection

                // Inline error banner — sits between header and content so it
                // doesn't float over empty KPI cards.
                if let vm = viewModel,
                   let error = vm.errorMessage,
                   !vm.isLoading {
                    InlineErrorBanner(message: error) {
                        Task { await vm.loadDashboard() }
                    }
                    .padding(.horizontal, Spacing.md)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }

                // Onboarding Checklist
                if let vm = viewModel, !hasCompletedOnboarding {
                    OnboardingChecklistView(
                        hasClients: vm.totalClients > 0,
                        hasProducts: vm.totalProducts > 0,
                        hasEvents: vm.totalEvents > 0,
                        onDismiss: {
                            withAnimation {
                                hasCompletedOnboarding = true
                            }
                        }
                    )
                }

                // Plan Limits Banner
                planLimitsBanner

                // Attention Events
                if let vm = viewModel, !vm.attentionEvents.isEmpty {
                    AttentionEventsCard(events: vm.attentionEvents)
                        .padding(.horizontal, Spacing.md)
                }

                // KPI Cards
                kpiCardsSection

                // Quick Actions
                quickActionsSection

                // Charts
                chartsSection

                // Low Stock Alerts
                if let vm = viewModel, !vm.lowStockItems.isEmpty {
                    lowStockSection(items: vm.lowStockItems)
                }

                // Upcoming Events
                upcomingEventsSection

                Spacer(minLength: Spacing.xxl)
            }
        }
        .navigationTitle("Inicio")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.eventForm()) {
                        Label("Nuevo Evento", systemImage: "calendar.badge.plus")
                    }
                    .disabled(!planLimitsManager.canCreateEvent)

                    NavigationLink(value: Route.quickQuote) {
                        Label("Cotización Rápida", systemImage: "doc.text.magnifyingglass")
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel("Crear evento o cotización")
                }
            }
        }
        .refreshable {
            await viewModel?.refresh()
        }
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
        .onAppear {
            if viewModel == nil {
                viewModel = DashboardViewModel(apiClient: apiClient)
            }
            Task {
                await viewModel?.loadDashboard()
                await planLimitsManager.checkLimits()
            }
        }
        .overlay {
            if viewModel?.isLoading == true && viewModel?.eventsThisMonth.isEmpty == true && viewModel?.errorMessage == nil {
                ProgressView()
                    .tint(SolennixColors.primary)
            }

            PendingEventsModalView(apiClient: apiClient)
        }
        .animation(.easeInOut(duration: 0.25), value: viewModel?.errorMessage)
    }

    // MARK: - Plan Limits Banner

    @ViewBuilder
    private var planLimitsBanner: some View {
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
        Group {
            if isIPad {
                // iPad: expanded grid with primary actions only
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: Spacing.md)], spacing: Spacing.md) {
                    quickActionItem(
                        icon: "plus.circle.fill",
                        label: "Nuevo Evento",
                        color: planLimitsManager.canCreateEvent ? SolennixColors.primary : SolennixColors.textTertiary,
                        enabled: planLimitsManager.canCreateEvent,
                        destination: Route.eventForm()
                    )

                    quickActionItem(
                        icon: "person.badge.plus",
                        label: "Nuevo Cliente",
                        color: planLimitsManager.canCreateClient ? SolennixColors.statusConfirmed : SolennixColors.textTertiary,
                        enabled: planLimitsManager.canCreateClient,
                        destination: Route.clientForm()
                    )
                }
            } else {
                // iPhone: original 2-button layout
                HStack(spacing: Spacing.md) {
                    quickActionItem(
                        icon: "plus.circle.fill",
                        label: "Nuevo Evento",
                        color: planLimitsManager.canCreateEvent ? SolennixColors.primary : SolennixColors.textTertiary,
                        enabled: planLimitsManager.canCreateEvent,
                        destination: Route.eventForm()
                    )

                    quickActionItem(
                        icon: "person.badge.plus",
                        label: "Nuevo Cliente",
                        color: planLimitsManager.canCreateClient ? SolennixColors.statusConfirmed : SolennixColors.textTertiary,
                        enabled: planLimitsManager.canCreateClient,
                        destination: Route.clientForm()
                    )
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .popoverTip(NewEventTip(), arrowEdge: .bottom)
    }

    @ViewBuilder
    private func quickActionItem(icon: String, label: String, color: Color, enabled: Bool, destination: Route) -> some View {
        Button {
            HapticsHelper.play(.light)
        } label: {
            if enabled {
                NavigationLink(value: destination) {
                    quickActionButton(icon: icon, label: label, color: color)
                }
            } else {
                quickActionButton(icon: icon, label: label, color: color)
                    .opacity(0.6)
            }
        }
        .buttonStyle(.plain)
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
        Group {
            if isIPad {
                // iPad: multi-column grid showing all KPI cards at once
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: Spacing.md)], spacing: Spacing.md) {
                    kpiCardItems(flexible: true)
                }
                .padding(.horizontal, Spacing.md)
            } else {
                // iPhone: horizontal scrollable strip
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.md) {
                        kpiCardItems(flexible: false)
                    }
                    .padding(.horizontal, Spacing.md)
                }
            }
        }
    }

    @ViewBuilder
    private func kpiCardItems(flexible: Bool) -> some View {
        KPICardView(
            title: "Ventas Netas",
            value: viewModel?.netSalesThisMonth.asMXN ?? "$0",
            icon: "dollarsign.circle",
            iconColor: SolennixColors.kpiGreen,
            iconBgColor: SolennixColors.kpiGreenBg,
            flexible: flexible
        )

        KPICardView(
            title: "Cobrado",
            value: viewModel?.cashCollectedThisMonth.asMXN ?? "$0",
            icon: "banknote",
            iconColor: SolennixColors.kpiOrange,
            iconBgColor: SolennixColors.kpiOrangeBg,
            flexible: flexible
        )

        KPICardView(
            title: "IVA Cobrado",
            value: viewModel?.vatCollectedThisMonth.asMXN ?? "$0",
            icon: "percent",
            iconColor: SolennixColors.kpiBlue,
            iconBgColor: SolennixColors.kpiBlueBg,
            flexible: flexible
        )

        KPICardView(
            title: "IVA Pendiente",
            value: viewModel?.vatOutstandingThisMonth.asMXN ?? "$0",
            icon: "exclamationmark.circle",
            iconColor: SolennixColors.kpiBlue,
            iconBgColor: SolennixColors.kpiBlueBg,
            flexible: flexible
        )

        KPICardView(
            title: "Eventos del Mes",
            value: "\(viewModel?.eventsThisMonth.count ?? 0)",
            icon: "calendar",
            iconColor: SolennixColors.kpiOrange,
            iconBgColor: SolennixColors.kpiOrangeBg,
            flexible: flexible
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
                : SolennixColors.kpiGreenBg,
            flexible: flexible
        )

        KPICardView(
            title: "Clientes",
            value: "\(viewModel?.totalClients ?? 0)",
            icon: "person.2",
            iconColor: SolennixColors.kpiBlue,
            iconBgColor: SolennixColors.kpiBlueBg,
            flexible: flexible
        )

        KPICardView(
            title: "Cotizaciones",
            value: "\(viewModel?.pendingQuotes ?? 0)",
            icon: "doc.text.magnifyingglass",
            iconColor: SolennixColors.kpiOrange,
            iconBgColor: SolennixColors.kpiOrangeBg,
            flexible: flexible
        )
    }

    // MARK: - Charts Section

    private var chartsSection: some View {
        Group {
            if isIPad {
                // iPad: keep charts side-by-side while moving them after quick actions
                HStack(alignment: .top, spacing: Spacing.md) {
                    if let vm = viewModel, !vm.eventsThisMonth.isEmpty {
                        EventStatusChart(statusCounts: vm.eventStatusCounts)
                            .frame(maxWidth: .infinity)
                    }

                    FinancialComparisonChart(
                        netSales: viewModel?.netSalesThisMonth ?? 0,
                        cashCollected: viewModel?.cashCollectedThisMonth ?? 0,
                        vatOutstanding: viewModel?.vatOutstandingThisMonth ?? 0
                    )
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, Spacing.md)
            } else {
                // iPhone: keep charts stacked vertically
                VStack(spacing: Spacing.lg) {
                    if let vm = viewModel, !vm.eventsThisMonth.isEmpty {
                        EventStatusChart(statusCounts: vm.eventStatusCounts)
                    }

                    FinancialComparisonChart(
                        netSales: viewModel?.netSalesThisMonth ?? 0,
                        cashCollected: viewModel?.cashCollectedThisMonth ?? 0,
                        vatOutstanding: viewModel?.vatOutstandingThisMonth ?? 0
                    )
                }
                .padding(.horizontal, Spacing.md)
            }
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

            Group {
                if isIPad {
                    // iPad: 2-column grid for stock alerts
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.sm), GridItem(.flexible(), spacing: Spacing.sm)], spacing: Spacing.sm) {
                        ForEach(items) { item in
                            lowStockCard(item: item)
                        }
                    }
                } else {
                    // iPhone: single column
                    VStack(spacing: Spacing.sm) {
                        ForEach(items) { item in
                            lowStockCard(item: item)
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    private func lowStockCard(item: InventoryItem) -> some View {
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

    // MARK: - Upcoming Events Section

    private var upcomingEventsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Proximos Eventos")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)
                .padding(.horizontal, isIPad ? 0 : Spacing.md)

            if let vm = viewModel, !vm.upcomingEvents.isEmpty {
                VStack(spacing: Spacing.sm) {
                    ForEach(vm.upcomingEvents) { event in
                        upcomingEventCard(event: event)
                    }
                }
                .padding(.horizontal, isIPad ? 0 : Spacing.md)
            } else if viewModel?.isLoading == false {
                emptyEventsState
                    .padding(.horizontal, isIPad ? 0 : Spacing.md)
            }
        }
    }

    private func upcomingEventCard(event: Event) -> some View {
        HStack(spacing: Spacing.md) {
            NavigationLink(value: Route.eventDetail(id: event.id)) {
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

                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            upcomingEventStatusMenu(event: event)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    private func upcomingEventStatusMenu(event: Event) -> some View {
        let isUpdating = viewModel?.updatingEventId == event.id

        return Menu {
            upcomingEventStatusButton(title: "Cotizado", status: .quoted, event: event)
            upcomingEventStatusButton(title: "Confirmado", status: .confirmed, event: event)
            upcomingEventStatusButton(title: "Completado", status: .completed, event: event)
            upcomingEventStatusButton(title: "Cancelado", status: .cancelled, event: event, role: .destructive)
        } label: {
            HStack(spacing: Spacing.xs) {
                if isUpdating {
                    ProgressView()
                        .controlSize(.small)
                        .tint(SolennixColors.primary)
                }

                StatusBadge(status: event.status.rawValue)

                Image(systemName: "chevron.down")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .buttonStyle(.plain)
        .disabled(isUpdating)
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private func upcomingEventStatusButton(
        title: String,
        status: EventStatus,
        event: Event,
        role: ButtonRole? = nil
    ) -> some View {
        Button(role: role) {
            guard event.status != status else { return }

            HapticsHelper.play(.selection)
            Task {
                await viewModel?.updateEventStatus(eventId: event.id, newStatus: status)
            }
        } label: {
            if event.status == status {
                Label(title, systemImage: "checkmark")
            } else {
                Text(title)
            }
        }
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

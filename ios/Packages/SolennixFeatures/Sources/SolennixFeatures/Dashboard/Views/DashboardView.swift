import SwiftUI
import Charts
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
    @State private var showQuickQuote = false

    private var isIPad: Bool { sizeClass == .regular }
    private var sectionHorizontalPadding: CGFloat { isIPad ? Spacing.xl : Spacing.md }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

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

                // Premium: Monthly Revenue Trend
                premiumReportsCard

                // Forecast
                if let vm = viewModel {
                    ForecastWidgetView(
                        forecast: vm.forecast,
                        isLoading: vm.isLoading
                    )
                    .padding(.horizontal, sectionHorizontalPadding)
                }

                // Low Stock Alerts
                if let vm = viewModel, !vm.lowStockItems.isEmpty {
                    lowStockSection(items: vm.lowStockItems)
                }

                // Upcoming Events
                upcomingEventsSection

                // Analytics Widgets
                if let vm = viewModel {
                    let columns = sizeClass == .regular
                        ? [GridItem(.flexible(), spacing: Spacing.md), GridItem(.flexible(), spacing: Spacing.md)]
                        : [GridItem(.flexible())]
                    
                    LazyVGrid(columns: columns, spacing: Spacing.md) {
                        TopClientsWidgetView(
                            clients: vm.topClients,
                            isLoading: vm.isLoading
                        )

                        ProductDemandWidgetView(
                            products: vm.productDemand,
                            isLoading: vm.isLoading
                        )
                    }
                    .padding(.horizontal, sectionHorizontalPadding)
                }

                Spacer(minLength: Spacing.xxl)
            }
        }
        .softScrollEdgeEffectIfAvailable()
        .navigationTitle(tr("dashboard.title", "Inicio"))
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.eventForm()) {
                        Label(tr("dashboard.quick_new_event", "Nuevo evento"), systemImage: "calendar.badge.plus")
                    }
                    .disabled(!planLimitsManager.canCreateEvent)

                    Button {
                        showQuickQuote = true
                    } label: {
                        Label(tr("dashboard.quick_quote", "Cotización rápida"), systemImage: "doc.text.magnifyingglass")
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(tr("dashboard.create_event_or_quote", "Crear evento o cotización"))
                }
            }
        }
        .refreshable {
            await viewModel?.refresh()
        }
        .background(SolennixColors.surfaceGrouped)
        .task {
            if viewModel == nil {
                viewModel = DashboardViewModel(apiClient: apiClient)
            }
            await viewModel?.loadDashboard()
            await planLimitsManager.checkLimits()
        }
        .sheet(isPresented: $showQuickQuote) {
            QuickQuoteView(apiClient: apiClient)
        }
        .overlay {
            // Non-empty refresh spinner — shown only when dashboard has data
            if viewModel?.isLoading == true && viewModel?.eventsThisMonth.isEmpty == false && viewModel?.errorMessage == nil {
                ProgressView()
                    .tint(SolennixColors.primary)
            }

            PendingEventsModalView(apiClient: apiClient)
        }
        .animation(.easeInOut(duration: 0.25), value: viewModel?.errorMessage)
        .onReceive(NotificationCenter.default.publisher(for: .solennixPaymentRegistered)) { _ in
            Task { await viewModel?.refresh() }
        }
        .onReceive(NotificationCenter.default.publisher(for: .solennixPaymentDeleted)) { _ in
            Task { await viewModel?.refresh() }
        }
        .onReceive(NotificationCenter.default.publisher(for: .solennixEventUpdated)) { _ in
            Task { await viewModel?.refresh() }
        }
        .onReceive(NotificationCenter.default.publisher(for: .solennixSceneActivated)) { _ in
            // Re-fetch dashboard when the app returns to the foreground so that
            // month-boundary crossings (e.g. app left open on the last day of the month)
            // don't leave the user staring at last month's KPIs.
            Task { await viewModel?.refresh() }
        }
    }

    // MARK: - Plan Limits Banner

    @ViewBuilder
    private var planLimitsBanner: some View {
        if !planLimitsManager.canCreateEvent {
            NavigationLink(value: Route.pricing) {
                UpgradeBannerView(
                    type: .limitReached,
                    resource: tr("dashboard.plan_limit_resource", "Eventos"),
                    currentUsage: planLimitsManager.eventsThisMonth,
                    limit: PlanLimitsManager.freePlanEventLimit
                )
            }
            .buttonStyle(.plain)
            .padding(.horizontal, Spacing.md)
        } else if planLimitsManager.isBasicPlan {
            NavigationLink(value: Route.pricing) {
                UpgradeBannerView(type: .upsell)
            }
            .buttonStyle(.plain)
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
            return String(
                format: tr("dashboard.welcome", "Hola, %@"),
                locale: FeatureL10n.locale,
                firstName
            )
        }
        return tr("dashboard.greeting.generic", "Hola")
    }

    private var currentDateString: String {
        DashboardFormatting.greetingDate()
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        Group {
            if isIPad {
                // iPad: expanded grid with primary actions only
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: Spacing.md)], spacing: Spacing.md) {
                    quickActionItem(
                        icon: "plus.circle.fill",
                        label: tr("dashboard.quick_new_event", "Nuevo evento"),
                        color: planLimitsManager.canCreateEvent ? SolennixColors.primary : SolennixColors.textTertiary,
                        enabled: planLimitsManager.canCreateEvent,
                        destination: Route.eventForm()
                    )

                    quickActionItem(
                        icon: "person.badge.plus",
                        label: tr("dashboard.quick_new_client", "Nuevo cliente"),
                        color: planLimitsManager.canCreateClient ? SolennixColors.accent : SolennixColors.textTertiary,
                        enabled: planLimitsManager.canCreateClient,
                        destination: Route.clientForm()
                    )
                }
            } else {
                // iPhone: original 2-button layout
                HStack(spacing: Spacing.md) {
                    quickActionItem(
                        icon: "plus.circle.fill",
                        label: tr("dashboard.quick_new_event", "Nuevo evento"),
                        color: planLimitsManager.canCreateEvent ? SolennixColors.primary : SolennixColors.textTertiary,
                        enabled: planLimitsManager.canCreateEvent,
                        destination: Route.eventForm()
                    )

                    quickActionItem(
                        icon: "person.badge.plus",
                        label: tr("dashboard.quick_new_client", "Nuevo cliente"),
                        color: planLimitsManager.canCreateClient ? SolennixColors.accent : SolennixColors.textTertiary,
                        enabled: planLimitsManager.canCreateClient,
                        destination: Route.clientForm()
                    )
                }
            }
        }
        .padding(.horizontal, Spacing.md)
    }

    @ViewBuilder
    private func quickActionItem(icon: String, label: String, color: Color, enabled: Bool, destination: Route) -> some View {
        if enabled {
            NavigationLink(value: destination) {
                quickActionButton(icon: icon, label: label, color: color)
            }
            .buttonStyle(.plain)
            .simultaneousGesture(TapGesture().onEnded { HapticsHelper.play(.light) })
        } else {
            quickActionButton(icon: icon, label: label, color: color)
                .opacity(0.6)
        }
    }

    private func quickActionButton(icon: String, label: String, color: Color) -> some View {
        DashboardQuickActionButton(icon: icon, label: label, color: color)
    }

    // MARK: - KPI Cards

    private var kpiCardsSection: some View {
        Group {
            if viewModel == nil || (viewModel?.isLoading == true && viewModel?.hasLoadedOnce == false) {
                // Initial load: skeleton placeholders in place of KPI cards
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.md) {
                        ForEach(0..<4, id: \.self) { _ in
                            SkeletonCard()
                                .frame(width: 150, height: 90)
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                }
                .accessibilityHidden(true)
            } else if isIPad {
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
            title: tr("dashboard.kpi.net_sales", "Ventas netas"),
            value: DashboardFormatting.currencyMXN(viewModel?.netSalesThisMonth ?? 0),
            icon: "dollarsign.circle",
            iconColor: SolennixColors.kpiGreen,
            iconBgColor: SolennixColors.kpiGreenBg,
            flexible: flexible
        )

        KPICardView(
            title: tr("dashboard.kpi.collected", "Cobrado"),
            value: DashboardFormatting.currencyMXN(viewModel?.cashCollectedThisMonth ?? 0),
            icon: "banknote",
            iconColor: SolennixColors.kpiOrange,
            iconBgColor: SolennixColors.kpiOrangeBg,
            flexible: flexible
        )

        KPICardView(
            title: tr("dashboard.kpi.vat_collected", "IVA cobrado"),
            value: DashboardFormatting.currencyMXN(viewModel?.vatCollectedThisMonth ?? 0),
            icon: "percent",
            iconColor: SolennixColors.kpiBlue,
            iconBgColor: SolennixColors.kpiBlueBg,
            flexible: flexible
        )

        KPICardView(
            title: tr("dashboard.kpi.vat_outstanding", "IVA pendiente"),
            value: DashboardFormatting.currencyMXN(viewModel?.vatOutstandingThisMonth ?? 0),
            icon: "exclamationmark.circle",
            iconColor: SolennixColors.kpiBlue,
            iconBgColor: SolennixColors.kpiBlueBg,
            flexible: flexible
        )

        KPICardView(
            title: tr("dashboard.kpi.events_this_month", "Eventos del mes"),
            value: "\(viewModel?.eventsThisMonthCount ?? 0)",
            icon: "calendar",
            iconColor: SolennixColors.kpiOrange,
            iconBgColor: SolennixColors.kpiOrangeBg,
            flexible: flexible
        )

        KPICardView(
            title: tr("dashboard.kpi.low_stock", "Stock bajo"),
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
            title: tr("dashboard.kpi.clients_total", "Clientes"),
            value: "\(viewModel?.totalClients ?? 0)",
            icon: "person.2",
            iconColor: SolennixColors.kpiBlue,
            iconBgColor: SolennixColors.kpiBlueBg,
            flexible: flexible
        )

        KPICardView(
            title: tr("dashboard.kpi.quotes", "Cotizaciones"),
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
                Text(tr("dashboard.inventory_alerts", "Alertas de inventario"))
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
        DashboardLowStockCard(
            itemName: item.ingredientName,
            stockText: "\(Int(item.currentStock))/\(Int(item.minimumStock)) \(item.unit)"
        )
    }

    // MARK: - Upcoming Events Section

    private var upcomingEventsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Label(tr("dashboard.upcoming_events", "Próximos eventos"), systemImage: "calendar")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            if let vm = viewModel, !vm.upcomingEvents.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(vm.upcomingEvents.enumerated()), id: \.element.id) { index, event in
                        upcomingEventCard(event: event)
                        if index < vm.upcomingEvents.count - 1 {
                            Divider()
                        }
                    }
                }
            } else if viewModel?.isLoading == false {
                emptyEventsState
            }
        }
        .padding(Spacing.lg)
        .solennixCard(border: false)
        .padding(.horizontal, sectionHorizontalPadding)
    }

    private func upcomingEventRow(event: Event) -> some View {
        HStack(spacing: Spacing.md) {
            NavigationLink(value: Route.eventDetail(id: event.id)) {
                HStack(spacing: Spacing.md) {
                    // Date box
                    dateBox(for: event.eventDate)

                    // Event info
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(viewModel?.clientName(for: event.clientId) ?? tr("dashboard.event.no_client", "Cliente"))
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.text)

                        HStack(spacing: Spacing.sm) {
                            Text(event.serviceType)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)

                            Text(
                                String(
                                    format: tr("dashboard.event.people", "%lld personas"),
                                    locale: FeatureL10n.locale,
                                    event.numPeople
                                )
                            )
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
    }

    private func upcomingEventCard(event: Event) -> some View {
        upcomingEventRow(event: event)
            .padding(.vertical, Spacing.sm)
    }

    private func upcomingEventStatusMenu(event: Event) -> some View {
        let isUpdating = viewModel?.updatingEventId == event.id

        return Menu {
            upcomingEventStatusButton(title: tr("dashboard.status.quoted", "Cotizado"), status: .quoted, event: event)
            upcomingEventStatusButton(title: tr("dashboard.status.confirmed", "Confirmado"), status: .confirmed, event: event)
            upcomingEventStatusButton(title: tr("dashboard.status.completed", "Completado"), status: .completed, event: event)
            upcomingEventStatusButton(title: tr("dashboard.status.cancelled", "Cancelado"), status: .cancelled, event: event, role: .destructive)
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
        .accessibilityLabel(event.status == status
            ? String(format: tr("dashboard.status.current", "%@, estado actual"), locale: FeatureL10n.locale, title)
            : String(format: tr("dashboard.status.change_to", "Cambiar a %@"), locale: FeatureL10n.locale, title.lowercased()))
    }

    private func dateBox(for dateString: String) -> some View {
        let (month, day) = parseDateComponents(dateString)
        return DashboardDateBox(month: month, day: day)
    }

    private func parseDateComponents(_ dateString: String) -> (month: String, day: String) {
        DashboardFormatting.monthDayComponents(from: dateString)
    }

    private var emptyEventsState: some View {
        DashboardEmptyCardState(
            icon: "calendar.badge.plus",
            title: tr("dashboard.upcoming.empty", "Sin eventos próximos")
        )
    }

    // MARK: - Premium Reports Card

    @ViewBuilder
    private var premiumReportsCard: some View {
        // Parity with Android/Web: the 6-month chart is a premium-only
        // feature. Non-premium users do not see the card at all (no blur,
        // no upsell banner). Upsell surfaces live elsewhere in the app.
        if let vm = viewModel, !planLimitsManager.isBasicPlan {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Label(tr("dashboard.revenue_last_6_months", "Ingresos — últimos 6 meses"), systemImage: "chart.line.uptrend.xyaxis")
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)

                Chart(vm.monthlyRevenueTrend) { point in
                    BarMark(
                        x: .value(tr("dashboard.chart.month", "Mes"), point.month),
                        y: .value(tr("dashboard.chart.revenue", "Ingresos"), point.revenue)
                    )
                    .foregroundStyle(SolennixColors.primary)
                    .cornerRadius(6)
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel {
                            if let d = value.as(Double.self) {
                                Text(DashboardFormatting.compactCurrencyMXN(d))
                                    .font(.caption2)
                                    .foregroundStyle(SolennixColors.textTertiary)
                            }
                        }
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [4]))
                            .foregroundStyle(SolennixColors.border)
                    }
                }
                .chartXAxis {
                    AxisMarks { _ in
                        AxisValueLabel()
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
                .frame(height: 140)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(tr("dashboard.revenue_last_6_months", "Ingresos — últimos 6 meses"))
                .accessibilityValue(
                    vm.monthlyRevenueTrend.map { point in
                        "\(point.month): \(DashboardFormatting.currencyMXN(point.revenue))"
                    }.joined(separator: ", ")
                )
            }
            .padding(Spacing.md)
            .solennixCard(border: false)
            .padding(.horizontal, Spacing.md)
        }
    }
}

// MARK: - Preview

#Preview("Dashboard") {
    NavigationStack {
        DashboardView()
    }
    .environment(AuthManager())
}

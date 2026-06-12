import SwiftUI
import Charts
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Client Detail View

public struct ClientDetailView: View {

    let clientId: String

    @State private var client: Client?
    @State private var events: [Event] = []
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    @State private var showDeleteConfirm: Bool = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(PlanLimitsManager.self) private var planLimitsManager

    private let apiClient: APIClient

    public init(clientId: String, apiClient: APIClient) {
        self.clientId = clientId
        self.apiClient = apiClient
    }

    public var body: some View {
        Group {
            if isLoading && client == nil {
                // In-List skeleton so the layout doesn't flash from ProgressView → content
                List {
                    ClientDetailSkeleton()
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
                .background(SolennixColors.surfaceGrouped)
            } else if let client {
                hubList(client)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: tr("clients.error.title", "Error"),
                    message: errorMessage ?? tr("clients.error.load", "No se pudo cargar el cliente")
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(client?.name ?? tr("clients.title_singular", "Cliente"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.clientForm(id: clientId)) {
                        Label(tr("clients.action.edit", "Editar"), systemImage: "pencil")
                    }

                    NavigationLink(value: Route.eventForm(clientId: clientId)) {
                        Label(tr("clients.action.create_event", "Nuevo evento"), systemImage: "calendar.badge.plus")
                    }

                    Divider()

                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label(tr("clients.delete.confirm", "Eliminar"), systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(tr("clients.detail.action.more", "Acciones del cliente"))
                }
            }
        }
        .confirmationDialog(
            tr("clients.delete.title", "Eliminar cliente"),
            isPresented: $showDeleteConfirm
        ) {
            Button(tr("clients.delete.confirm", "Eliminar"), role: .destructive) {
                Task {
                    do {
                        try await apiClient.delete(Endpoint.client(clientId))
                        dismiss()
                    } catch {
                        errorMessage = tr("clients.error.delete", "Error al eliminar el cliente")
                    }
                }
            }
            Button(tr("clients.delete.cancel", "Cancelar"), role: .cancel) {}
        } message: {
            Text(trf(
                "clients.delete.message_full",
                "¿Estás seguro de que quieres eliminar a %@? Esta acción no se puede deshacer.",
                client?.name ?? tr("clients.title_singular", "este cliente")
            ))
        }
        .alert(tr("clients.error.title", "Error"), isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button(tr("clients.action.ok", "OK"), role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
        .task { await loadData() }
    }

    // MARK: - Hub List

    private func hubList(_ client: Client) -> some View {
        List {
            // MARK: Header section — avatar + name + stat boxes
            Section {
                clientHeaderCard(client)
            }
            .listRowSeparator(.hidden)

            // MARK: Contact section
            Section {
                contactChipsCard(client)
            }
            .listRowSeparator(.hidden)

            // MARK: Address row (informational only — no fake tappability)
            if let address = client.address, !address.isEmpty {
                Section {
                    addressRow(address: address, city: client.city)
                }
                .listRowSeparator(.hidden)
            } else if let city = client.city, !city.isEmpty {
                Section {
                    addressRow(address: nil, city: city)
                }
                .listRowSeparator(.hidden)
            }

            // MARK: Primary action — Nuevo evento
            Section {
                NavigationLink(value: Route.eventForm(clientId: clientId)) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "calendar.badge.plus")
                            .font(.body)
                        Text(tr("clients.action.create_event", "Nuevo evento para este cliente"))
                            .font(.body.weight(.medium))
                        Spacer()
                    }
                    .foregroundStyle(SolennixColors.primary)
                    .frame(minHeight: 44)
                }
                .listRowBackground(SolennixColors.primaryLight)
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
            }

            // MARK: Insights section
            if !sortedCompletedEvents.isEmpty {
                Section {
                    clientInsightsCard
                }
                .listRowSeparator(.hidden)
            }

            // MARK: Event history section
            Section(
                header: Text(
                    trf("clients.events.history_count", "Historial de eventos (%lld)", events.count)
                )
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            ) {
                if sortedEvents.isEmpty {
                    HStack {
                        Spacer()
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "calendar")
                                .font(.title)
                                .foregroundStyle(SolennixColors.textTertiary)
                            Text(tr("clients.events.empty", "Este cliente aún no tiene eventos"))
                                .font(.subheadline)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        .padding(.vertical, Spacing.xl)
                        Spacer()
                    }
                    .listRowBackground(SolennixColors.card)
                    .listRowSeparator(.hidden)
                } else {
                    ForEach(sortedEvents) { event in
                        NavigationLink(value: Route.eventDetail(id: event.id)) {
                            eventRow(event)
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(SolennixColors.card)
                        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                        .accessibilityElement(children: .combine)
                    }
                }
            }

            // MARK: Notes section
            if let notes = client.notes, !notes.isEmpty {
                Section {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "note.text")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.primary)
                            Text(tr("clients.detail.notes", "Notas"))
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        Text(notes)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .listRowBackground(SolennixColors.card)
                    .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .softScrollEdgeEffectIfAvailable()
        .refreshable {
            // Does NOT clear arrays — avoids skeleton flash on pull-to-refresh.
            await loadData()
        }
    }

    // MARK: - Header Card

    private func clientHeaderCard(_ client: Client) -> some View {
        VStack(spacing: Spacing.md) {
            Avatar(name: client.name, photoURL: client.photoUrl, size: 72)

            Text(client.name)
                .font(.title2.weight(.bold))
                .foregroundStyle(SolennixColors.text)

            // Stats row
            HStack(spacing: Spacing.md) {
                statBox(
                    icon: "calendar",
                    value: "\(client.totalEvents ?? 0)",
                    label: tr("clients.stats.events", "Eventos"),
                    a11yLabel: trf("clients.detail.a11y.stat_events", "Eventos: %lld", client.totalEvents ?? 0)
                )

                statBox(
                    icon: "dollarsign.circle",
                    value: (client.totalSpent ?? 0).asMXN,
                    label: tr("clients.stats.total", "Total"),
                    a11yLabel: "\(tr("clients.stats.total", "Total gastado")): \((client.totalSpent ?? 0).asMXN)"
                )

                if let totalEvents = client.totalEvents, totalEvents > 0,
                   let totalSpent = client.totalSpent, totalSpent > 0 {
                    let avg = totalSpent / Double(totalEvents)
                    statBox(
                        icon: "chart.bar",
                        value: avg.asMXN,
                        label: tr("clients.stats.average", "Promedio"),
                        a11yLabel: "\(tr("clients.stats.average", "Ticket promedio")): \(avg.asMXN)"
                    )
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity)
        .listRowBackground(SolennixColors.card)
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }

    // MARK: - Stat Box

    private func statBox(icon: String, value: String, label: String, a11yLabel: String) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(SolennixColors.primary)

            Text(value)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SolennixColors.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(SolennixColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(a11yLabel)
    }

    // MARK: - Contact Chips Card (actionable: call, whatsapp, email)

    private func contactChipsCard(_ client: Client) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Name + city sub-header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "person.circle.fill")
                    .font(.title2)
                    .foregroundStyle(SolennixColors.primary)

                VStack(alignment: .leading, spacing: 2) {
                    Text(client.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SolennixColors.text)

                    if let city = client.city, !city.isEmpty {
                        Text(city)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()
            }

            // Action chips
            if !client.phone.isEmpty || (client.email != nil && !(client.email?.isEmpty ?? true)) {
                HStack(spacing: Spacing.sm) {
                    if !client.phone.isEmpty {
                        contactChip(
                            icon: "phone.fill",
                            label: tr("clients.detail.action.call", "Llamar"),
                            url: URL(string: "tel:\(client.phone.filter { $0.isNumber || $0 == "+" })"),
                            a11yLabel: "\(tr("clients.detail.action.call", "Llamar")) a \(client.phone)"
                        )
                    }

                    if let digits = whatsappDigits(for: client.phone) {
                        contactChip(
                            icon: "message.fill",
                            label: tr("clients.detail.action.whatsapp", "WhatsApp"),
                            url: URL(string: "https://wa.me/\(digits)"),
                            a11yLabel: "WhatsApp: \(client.name)"
                        )
                    }

                    if let email = client.email, !email.isEmpty {
                        contactChip(
                            icon: "envelope.fill",
                            label: tr("clients.detail.action.email", "Email"),
                            url: URL(string: "mailto:\(email)"),
                            a11yLabel: "Email: \(client.name)"
                        )
                    }
                }
            }
        }
        .padding(Spacing.md)
        .listRowBackground(SolennixColors.card)
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }

    @ViewBuilder
    private func contactChip(icon: String, label: String, url: URL?, a11yLabel: String) -> some View {
        Button {
            if let url { openURL(url) }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption.weight(.semibold))
                Text(label)
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(SolennixColors.primary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(SolennixColors.primaryLight)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .frame(minHeight: 44)
        .accessibilityLabel(a11yLabel)
    }

    /// Returns stripped digit string for WhatsApp deep-link, or nil if fewer than 8 digits.
    private func whatsappDigits(for phone: String) -> String? {
        let digits = phone.filter(\.isNumber)
        return digits.count >= 8 ? digits : nil
    }

    // MARK: - Address Row (informational — no chevron, not tappable)

    private func addressRow(address: String?, city: String?) -> some View {
        let text: String = {
            if let address, !address.isEmpty {
                return [address, city].compactMap { v in
                    guard let v, !v.isEmpty else { return nil }
                    return v
                }.joined(separator: ", ")
            }
            return city ?? ""
        }()

        return HStack(spacing: Spacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(SolennixColors.warning.opacity(0.15))
                    .frame(width: cappedIconSize, height: cappedIconSize)
                Image(systemName: "mappin")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(SolennixColors.warning)
            }

            Text(text)
                .font(.body)
                .foregroundStyle(SolennixColors.text)
                .multilineTextAlignment(.leading)

            Spacer()
        }
        .padding(Spacing.md)
        .listRowBackground(SolennixColors.card)
        .listRowInsets(EdgeInsets(top: 0, leading: Spacing.md, bottom: 0, trailing: Spacing.md))
    }

    // MARK: - @ScaledMetric icon sizes (Dynamic Type-safe)

    @ScaledMetric(relativeTo: .body) private var scaledIconSize: CGFloat = 36
    /// Cap icon frames so they don't balloon at AX text sizes.
    private var cappedIconSize: CGFloat { min(scaledIconSize, 54) }

    @ScaledMetric(relativeTo: .body) private var scaledDateBoxSize: CGFloat = 48
    private var cappedDateBoxSize: CGFloat { min(scaledDateBoxSize, 72) }

    // MARK: - Event Row

    private func eventRow(_ event: Event) -> some View {
        HStack(spacing: Spacing.md) {
            dateBox(event.eventDate)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(event.serviceType)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(SolennixColors.text)

                HStack(spacing: Spacing.sm) {
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "person.2")
                            .font(.caption2)
                        Text("\(event.numPeople)")
                            .font(.caption)
                    }
                    .foregroundStyle(SolennixColors.textSecondary)

                    StatusBadge(status: event.status.rawValue)
                }
            }

            Spacer()

            Text(event.totalAmount.asMXN)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(SolennixColors.text)
        }
        .padding(Spacing.md)
    }

    // MARK: - Date Box

    private func dateBox(_ dateString: String) -> some View {
        let components = parseDateComponents(dateString)
        return VStack(spacing: Spacing.xxs) {
            Text(components.month)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(SolennixColors.primary)
                .textCase(.uppercase)

            Text(components.day)
                .font(.title3.weight(.bold))
                .foregroundStyle(SolennixColors.text)
        }
        .frame(width: cappedDateBoxSize, height: cappedDateBoxSize)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    private func parseDateComponents(_ dateString: String) -> (month: String, day: String) {
        guard let date = Date.fromServerDay(dateString) else {
            return ("---", "--")
        }
        return (
            date.formattedServerDay(style: "MMM", locale: FeatureL10n.locale),
            date.formattedServerDay(style: "d", locale: FeatureL10n.locale)
        )
    }

    // MARK: - Sorted Events (computed once, not inside ForEach)

    /// All events sorted descending by date prefix (robust string sort for yyyy-MM-dd).
    private var sortedEvents: [Event] {
        events.sorted { String($0.eventDate.prefix(10)) > String($1.eventDate.prefix(10)) }
    }

    /// Completed + confirmed events sorted ascending for insights chart.
    private var sortedCompletedEvents: [Event] {
        events
            .filter { $0.status == .completed || $0.status == .confirmed }
            .sorted { String($0.eventDate.prefix(10)) < String($1.eventDate.prefix(10)) }
    }

    // MARK: - Insights Card

    private struct EventRevenuePoint: Identifiable {
        let id: String
        let label: String
        let revenue: Double
    }

    @ViewBuilder
    private var clientInsightsCard: some View {
        let completedEvents = sortedCompletedEvents

        if !completedEvents.isEmpty {
            let isPremium = !planLimitsManager.isBasicPlan

            let points: [EventRevenuePoint] = completedEvents.suffix(6).map { event in
                let label = Date.fromServerDay(event.eventDate)
                    .map { $0.formattedServerDay(style: "d MMM", locale: FeatureL10n.locale) }
                    ?? String(event.eventDate.prefix(10))
                return EventRevenuePoint(id: event.id, label: label, revenue: event.totalAmount)
            }

            let topServiceType = Dictionary(grouping: completedEvents, by: \.serviceType)
                .max(by: { $0.value.count < $1.value.count })?.key ?? ""

            // Average ticket over ALL completed+confirmed events (not just the 6-event chart slice)
            let avgTicket = completedEvents.reduce(0.0) { $0 + $1.totalAmount } / Double(completedEvents.count)

            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundStyle(SolennixColors.primary)
                    Text(tr("clients.insights.title", "Análisis del cliente"))
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)
                    Spacer()
                    if !isPremium {
                        Label(tr("clients.insights.pro", "Pro"), systemImage: "bolt.fill")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(SolennixColors.primary)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 3)
                            .background(SolennixColors.primaryLight)
                            .clipShape(Capsule())
                    }
                }

                Chart(points) { point in
                    BarMark(
                        x: .value(tr("clients.stats.events", "Eventos"), point.label),
                        y: .value(tr("clients.insights.revenue", "Ingresos"), point.revenue)
                    )
                    .foregroundStyle(SolennixGradient.premium)
                    .cornerRadius(4)
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel {
                            if let d = value.as(Double.self) {
                                Text(d == 0 ? "$0" : "\(Int(d / 1000))k")
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
                    }
                }
                .frame(height: 130)
                .blur(radius: isPremium ? 0 : 10)

                if isPremium && !topServiceType.isEmpty {
                    HStack(spacing: Spacing.md) {
                        insightBadge(
                            icon: "star.fill",
                            label: tr("clients.insights.top_service", "Servicio más solicitado"),
                            value: topServiceType
                        )
                        if completedEvents.count > 1 {
                            insightBadge(
                                icon: "arrow.up.right",
                                label: tr("clients.insights.average_ticket", "Ticket promedio"),
                                value: avgTicket.asMXN
                            )
                        }
                    }
                }

                if !isPremium {
                    NavigationLink(value: Route.pricing) {
                        UpgradeBannerView(type: .upsell)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(Spacing.md)
            .listRowBackground(SolennixColors.card)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    private func insightBadge(icon: String, label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
            Text(value)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SolennixColors.text)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.sm)
        .background(SolennixColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Data Loading

    @MainActor
    private func loadData() async {
        isLoading = true
        // errorMessage is NOT cleared here so existing errors remain visible during
        // pull-to-refresh; they will be replaced if the new load succeeds or fails.
        do {
            async let clientResult: Client = apiClient.get(Endpoint.client(clientId))
            async let eventsResult: [Event] = apiClient.getAll(
                Endpoint.events,
                params: ["client_id": clientId]
            )

            client = try await clientResult
            events = try await eventsResult
            errorMessage = nil
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription
            } else {
                errorMessage = tr("clients.error.unexpected", "Ocurrió un error inesperado.")
            }
        }

        isLoading = false
    }

    // MARK: - Localization helpers

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    private func trf(_ key: String, _ value: String, _ arg: CVarArg) -> String {
        FeatureL10n.format(key, value, arg)
    }
}

// MARK: - Client Detail Skeleton (in-List placeholder rows)

struct ClientDetailSkeleton: View {
    @ScaledMetric(relativeTo: .body) private var avatarSize: CGFloat = 72
    @ScaledMetric(relativeTo: .body) private var dateBoxSize: CGFloat = 48

    var body: some View {
        // Header skeleton — avatar + name + stat boxes
        Section {
            VStack(spacing: Spacing.md) {
                Circle()
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: min(avatarSize, 96), height: min(avatarSize, 96))

                SkeletonLine(width: 160, height: 22)

                HStack(spacing: Spacing.md) {
                    ForEach(0..<3, id: \.self) { _ in
                        VStack(spacing: Spacing.xs) {
                            SkeletonLine(width: 20, height: 14)
                            SkeletonLine(width: 60, height: 16)
                            SkeletonLine(width: 40, height: 12)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.sm)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                }
            }
            .padding(Spacing.lg)
            .frame(maxWidth: .infinity)
            .listRowBackground(SolennixColors.card)
            .listRowSeparator(.hidden)
        }

        // Contact chips skeleton — single row mirroring contactChipsCard's one-VStack layout
        Section {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.sm) {
                    Circle()
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 32, height: 32)
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        SkeletonLine(width: 140, height: 14)
                        SkeletonLine(width: 80, height: 12)
                    }
                    Spacer()
                }
                HStack(spacing: Spacing.sm) {
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonLine(width: 72, height: 28)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(Spacing.md)
            .listRowBackground(SolennixColors.card)
            .listRowSeparator(.hidden)
        }

        // Insights chart skeleton
        Section {
            VStack(alignment: .leading, spacing: Spacing.md) {
                SkeletonLine(width: 160, height: 18)
                SkeletonLine(height: 130)
            }
            .padding(Spacing.md)
            .listRowBackground(SolennixColors.card)
            .listRowSeparator(.hidden)
        }

        // Event rows skeleton
        Section {
            ForEach(0..<3, id: \.self) { _ in
                HStack(spacing: Spacing.md) {
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(
                            width: min(dateBoxSize, 72),
                            height: min(dateBoxSize, 72)
                        )
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        SkeletonLine(width: 140, height: 16)
                        SkeletonLine(width: 90, height: 12)
                    }
                    Spacer()
                    SkeletonLine(width: 70, height: 16)
                }
                .padding(Spacing.md)
                .listRowBackground(SolennixColors.card)
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
            }
        }
    }
}

// MARK: - Preview

#Preview("Client Detail") {
    NavigationStack {
        ClientDetailView(clientId: "123", apiClient: APIClient())
    }
}

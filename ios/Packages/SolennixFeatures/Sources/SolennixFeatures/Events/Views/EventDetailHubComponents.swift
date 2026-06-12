import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Countdown Hero Chip

/// Shows date proximity for upcoming or past events.
/// Hidden for cancelled events.
struct EventCountdownChip: View {
    let eventDate: String
    let status: EventStatus

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private enum Proximity {
        case today
        case tomorrow
        case future(Int)
        case past
    }

    private var proximity: Proximity? {
        guard status != .cancelled else { return nil }
        guard let eventDay = Date.fromServerDay(eventDate) else { return nil }

        // Use UTC-pinned dates (matching fromServerDay contract) for calendar-day math.
        let cal = Calendar.current
        let nowUTC = Date()
        // Start of today in UTC — aligns with the midnight-UTC anchor of fromServerDay.
        let startOfToday = cal.startOfDay(for: nowUTC)
        let startOfEvent = cal.startOfDay(for: eventDay)

        let comps = cal.dateComponents([.day], from: startOfToday, to: startOfEvent)
        let days = comps.day ?? 0

        if days == 0 { return .today }
        if days == 1 { return .tomorrow }
        if days > 1  { return .future(days) }
        return .past
    }

    // Stable trigger: fires once on appear (value changes 0→1 on onAppear).
    @State private var bounceTrigger: Int = 0

    var body: some View {
        if let proximity {
            chipView(proximity)
                .symbolEffect(.bounce, value: bounceTrigger)
                .onAppear {
                    if !reduceMotion { bounceTrigger = 1 }
                }
        }
    }

    @ViewBuilder
    private func chipView(_ proximity: Proximity) -> some View {
        HStack(spacing: 4) {
            Image(systemName: iconName(proximity))
                .font(.caption.weight(.bold))
            Text(label(proximity))
                .font(.caption.weight(.bold))
                .kerning(0.5)
        }
        .foregroundStyle(foregroundColor(proximity))
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(backgroundColor(proximity), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabel(proximity))
    }

    private func label(_ p: Proximity) -> String {
        switch p {
        case .today:        return "HOY"
        case .tomorrow:     return "MAÑANA"
        case .future(let n): return "FALTAN \(n) DÍAS"
        case .past:         return "FINALIZADO"
        }
    }

    private func iconName(_ p: Proximity) -> String {
        switch p {
        case .today:    return "star.fill"
        case .tomorrow: return "moon.stars.fill"
        case .future:   return "calendar.badge.clock"
        case .past:     return "checkmark.circle"
        }
    }

    private func backgroundColor(_ p: Proximity) -> Color {
        switch p {
        case .today:    return SolennixColors.primary
        case .tomorrow: return SolennixColors.accent
        case .future:   return SolennixColors.accent
        case .past:     return SolennixColors.surfaceAlt
        }
    }

    private func foregroundColor(_ p: Proximity) -> Color {
        switch p {
        case .today:    return SolennixColors.textInverse
        case .tomorrow: return SolennixColors.textInverse
        case .future:   return SolennixColors.textInverse
        case .past:     return SolennixColors.textSecondary
        }
    }

    private func accessibilityLabel(_ p: Proximity) -> String {
        switch p {
        case .today:         return "El evento es hoy"
        case .tomorrow:      return "Mañana es el evento"
        case .future(let n): return "Faltan \(n) días para el evento"
        case .past:          return "Evento finalizado"
        }
    }
}

// MARK: - Payment Collection Ring

struct PaymentCollectionRing: View {
    let progress: Double       // 0–100
    let paidValue: String
    let balanceValue: String
    let isFullyPaid: Bool
    let fullyPaidCounter: Int  // trigger for sensory feedback
    let size: CGFloat

    @State private var displayedProgress: Double = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var clampedFraction: Double {
        min(max(progress, 0), 100) / 100.0
    }

    var body: some View {
        ZStack {
            // Track
            Circle()
                .stroke(SolennixColors.primary.opacity(0.15), lineWidth: ringWidth)

            // Progress arc
            Circle()
                .trim(from: 0, to: displayedProgress)
                .stroke(
                    SolennixColors.primary,
                    style: StrokeStyle(lineWidth: ringWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Center content
            VStack(spacing: 1) {
                if isFullyPaid {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: size * 0.28).weight(.semibold))
                        .foregroundStyle(SolennixColors.primary)
                        .symbolEffect(.bounce, value: reduceMotion ? 0 : fullyPaidCounter)
                } else {
                    Text("\(Int(progress.rounded()))%")
                        .font(.system(size: size * 0.22).weight(.heavy).monospacedDigit())
                        .foregroundStyle(SolennixColors.text)
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)

                    Text("cobrado")
                        .font(.system(size: size * 0.12))
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
        .frame(width: size, height: size)
        .onAppear {
            let target = clampedFraction
            if reduceMotion {
                displayedProgress = target
            } else {
                withAnimation(.easeOut(duration: 0.9)) {
                    displayedProgress = target
                }
            }
        }
        .onChange(of: progress) { _, newValue in
            let target = min(max(newValue, 0), 100) / 100.0
            if reduceMotion {
                displayedProgress = target
            } else {
                withAnimation(.easeOut(duration: 0.5)) {
                    displayedProgress = target
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            isFullyPaid
                ? "Cobrado: 100 por ciento. Evento completamente pagado."
                : "Cobrado: \(Int(progress.rounded())) por ciento, faltan \(balanceValue)"
        )
        .sensoryFeedback(.success, trigger: fullyPaidCounter)
    }

    private var ringWidth: CGFloat { size * 0.095 }
}

// MARK: - Header Card

struct EventDetailHeaderCard: View {
    let event: Event
    let clientName: String?
    let month: String
    let day: String
    let dateLabel: String
    let dateValue: String
    let scheduleLabel: String
    let scheduleValue: String?
    let peopleLabel: String
    let peopleValue: String
    let locationLabel: String?
    let locationValue: String?
    let onStatusTap: () -> Void
    let editRoute: Route?

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    init(
        event: Event,
        clientName: String?,
        month: String,
        day: String,
        dateLabel: String,
        dateValue: String,
        scheduleLabel: String,
        scheduleValue: String?,
        peopleLabel: String,
        peopleValue: String,
        locationLabel: String?,
        locationValue: String?,
        onStatusTap: @escaping () -> Void,
        editRoute: Route? = nil
    ) {
        self.event = event
        self.clientName = clientName
        self.month = month
        self.day = day
        self.dateLabel = dateLabel
        self.dateValue = dateValue
        self.scheduleLabel = scheduleLabel
        self.scheduleValue = scheduleValue
        self.peopleLabel = peopleLabel
        self.peopleValue = peopleValue
        self.locationLabel = locationLabel
        self.locationValue = locationValue
        self.onStatusTap = onStatusTap
        self.editRoute = editRoute
    }

    private var quickInfoColumns: [GridItem] {
        dynamicTypeSize.isAccessibilitySize
            ? [GridItem(.flexible())]
            : [GridItem(.flexible()), GridItem(.flexible())]
    }

    var body: some View {
        VStack(spacing: Spacing.md) {
            // Top row: date box + name/client/status + countdown chip
            HStack(alignment: .top, spacing: Spacing.md) {
                EventDetailDateBox(month: month, day: day)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(event.serviceType)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(SolennixColors.text)

                    if let clientName, !clientName.isEmpty {
                        Text(clientName)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    Button(action: onStatusTap) {
                        StatusBadge(status: event.status.rawValue)
                    }
                    .accessibilityHint("Toca para cambiar el estado")
                }

                Spacer()

                EventCountdownChip(eventDate: event.eventDate, status: event.status)
            }

            // Quick info grid — 2 cols compact, 1 col accessibility sizes
            LazyVGrid(columns: quickInfoColumns, spacing: Spacing.sm) {
                EventDetailQuickInfoItem(icon: "calendar", label: dateLabel, value: dateValue)

                if let scheduleValue, !scheduleValue.isEmpty {
                    EventDetailQuickInfoItem(icon: "clock", label: scheduleLabel, value: scheduleValue)
                }

                EventDetailQuickInfoItem(icon: "person.2", label: peopleLabel, value: peopleValue)

                if let locationLabel, let locationValue, !locationValue.isEmpty {
                    EventDetailQuickInfoItem(icon: "mappin", label: locationLabel, value: locationValue)
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .listRowBackground(SolennixColors.card)
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        .contextMenu {
            if let editRoute {
                NavigationLink(value: editRoute) {
                    Label(
                        FeatureL10n.text("events.detail.context_menu.edit_general", "Editar datos generales"),
                        systemImage: "pencil"
                    )
                }
            }
        }
    }
}

// MARK: - Actionable Client Info Card

struct EventDetailClientInfoCard: View {
    let client: Client

    @Environment(\.openURL) private var openURL

    /// Returns the stripped digits for WhatsApp deep-link.
    /// Nil if fewer than 8 digits (skip WhatsApp).
    private var whatsappDigits: String? {
        let digits = client.phone.filter(\.isNumber)
        return digits.count >= 8 ? digits : nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Name + city header
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

            // Action chips row
            if !client.phone.isEmpty || client.email != nil {
                HStack(spacing: Spacing.sm) {
                    if !client.phone.isEmpty {
                        actionChip(
                            icon: "phone.fill",
                            label: "Llamar",
                            url: URL(string: "tel:\(client.phone.filter { !$0.isWhitespace })")
                        )
                    }

                    if let digits = whatsappDigits {
                        actionChip(
                            icon: "message.fill",
                            label: "WhatsApp",
                            url: URL(string: "https://wa.me/\(digits)")
                        )
                    }

                    if let email = client.email, !email.isEmpty {
                        actionChip(
                            icon: "envelope.fill",
                            label: "Email",
                            url: URL(string: "mailto:\(email)")
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
    private func actionChip(icon: String, label: String, url: URL?) -> some View {
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
        .accessibilityLabel("\(label): \(client.name)")
    }
}

// MARK: - Finance Summary Card

struct EventDetailFinanceSummaryCard: View {
    let title: String
    let totalLabel: String
    let totalValue: String
    let profitLabel: String
    let profitValue: String
    let discountText: String?
    let taxText: String?
    let route: Route
    let editRoute: Route?

    init(
        title: String,
        totalLabel: String,
        totalValue: String,
        profitLabel: String,
        profitValue: String,
        discountText: String?,
        taxText: String?,
        route: Route,
        editRoute: Route? = nil
    ) {
        self.title = title
        self.totalLabel = totalLabel
        self.totalValue = totalValue
        self.profitLabel = profitLabel
        self.profitValue = profitValue
        self.discountText = discountText
        self.taxText = taxText
        self.route = route
        self.editRoute = editRoute
    }

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "chart.bar.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)

                    Text(title)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                Divider().background(SolennixColors.border)

                HStack(spacing: Spacing.md) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(totalLabel)
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .textCase(.uppercase)
                        Text(totalValue)
                            .font(.title3.weight(.bold))
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(profitLabel)
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .textCase(.uppercase)

                        Text(profitValue)
                            .font(.title3.weight(.bold))
                            .foregroundStyle(SolennixColors.success)
                    }
                }

                if let discountText, !discountText.isEmpty {
                    Text(discountText)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                }

                if let taxText, !taxText.isEmpty {
                    Text(taxText)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .padding(Spacing.lg)
        }
        .buttonStyle(.plain)
        .listRowBackground(SolennixColors.card)
        .listRowInsets(EdgeInsets(top: 0, leading: Spacing.md, bottom: 0, trailing: Spacing.md))
        .contextMenu {
            if let editRoute {
                NavigationLink(value: editRoute) {
                    Label(
                        FeatureL10n.text("events.detail.context_menu.edit_finances", "Editar finanzas"),
                        systemImage: "pencil"
                    )
                }
            }
        }
    }
}

// MARK: - Payment Summary Card (with collection ring)

struct EventDetailPaymentSummaryCard: View {
    let title: String
    let paymentsCount: Int
    let paidLabel: String
    let paidValue: String
    let balanceLabel: String
    let balanceValue: String
    let isFullyPaid: Bool
    let progress: Double
    let depositText: String?
    let isDepositMet: Bool
    let route: Route
    let fullyPaidCounter: Int

    init(
        title: String,
        paymentsCount: Int,
        paidLabel: String,
        paidValue: String,
        balanceLabel: String,
        balanceValue: String,
        isFullyPaid: Bool,
        progress: Double,
        depositText: String?,
        isDepositMet: Bool,
        route: Route,
        fullyPaidCounter: Int = 0
    ) {
        self.title = title
        self.paymentsCount = paymentsCount
        self.paidLabel = paidLabel
        self.paidValue = paidValue
        self.balanceLabel = balanceLabel
        self.balanceValue = balanceValue
        self.isFullyPaid = isFullyPaid
        self.progress = progress
        self.depositText = depositText
        self.isDepositMet = isDepositMet
        self.route = route
        self.fullyPaidCounter = fullyPaidCounter
    }

    @ScaledMetric(relativeTo: .body) private var ringSize: CGFloat = 64

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "dollarsign.circle.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.success)

                    Text(title)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Text("\(paymentsCount)")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(SolennixColors.primary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 2)
                        .background(SolennixColors.primaryLight)
                        .clipShape(Capsule())

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                Divider().background(SolennixColors.border)

                // Ring + KPI columns
                HStack(alignment: .center, spacing: Spacing.lg) {
                    PaymentCollectionRing(
                        progress: progress,
                        paidValue: paidValue,
                        balanceValue: balanceValue,
                        isFullyPaid: isFullyPaid,
                        fullyPaidCounter: fullyPaidCounter,
                        size: ringSize
                    )

                    VStack(spacing: Spacing.sm) {
                        EventDetailMiniKPI(
                            label: paidLabel,
                            value: paidValue,
                            color: SolennixColors.success,
                            bgColor: SolennixColors.successBg
                        )
                        EventDetailMiniKPI(
                            label: balanceLabel,
                            value: balanceValue,
                            color: isFullyPaid ? SolennixColors.success : SolennixColors.error,
                            bgColor: isFullyPaid ? SolennixColors.successBg : SolennixColors.errorBg
                        )
                    }
                    .frame(maxWidth: .infinity)
                }

                if let depositText, !depositText.isEmpty {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: isDepositMet ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)
                        Text(depositText)
                            .font(.caption)
                            .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)
                    }
                }
            }
            .padding(Spacing.lg)
        }
        .buttonStyle(.plain)
        .listRowBackground(SolennixColors.card)
        .listRowInsets(EdgeInsets(top: 0, leading: Spacing.md, bottom: 0, trailing: Spacing.md))
    }
}

// MARK: - Payment Actions Card

struct EventDetailPaymentActionsCard: View {
    let recordTitle: String
    let settleTitle: String
    let depositTitle: String?
    let onRecord: () -> Void
    let onSettle: () -> Void
    let onDeposit: () -> Void

    var body: some View {
        VStack(spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                PremiumButton(title: recordTitle, fullWidth: true, action: onRecord)
                PremiumButton(title: settleTitle, fullWidth: true, action: onSettle)
            }

            if let depositTitle, !depositTitle.isEmpty {
                PremiumButton(title: depositTitle, fullWidth: true, action: onDeposit)
            }
        }
        .padding(Spacing.md)
        .listRowBackground(SolennixColors.card)
        .listRowInsets(EdgeInsets(top: 0, leading: Spacing.md, bottom: 0, trailing: Spacing.md))
    }
}

// MARK: - Content Grid Section (List rows)

/// Renders content nav cards as List rows with leading icon chip + count badge.
/// Context-menu edit deep-links are preserved from the original grid.
struct EventDetailContentGridSection: View {
    let productsTitle: String
    let productsCount: Int
    let extrasTitle: String
    let extrasCount: Int
    let suppliesTitle: String
    let suppliesCount: Int
    let equipmentTitle: String
    let equipmentCount: Int
    let shoppingTitle: String
    let shoppingSubtitle: String?
    let staffTitle: String
    let staffCount: Int
    let photosTitle: String
    let photosCount: Int
    let eventId: String

    var body: some View {
        contentRow(
            icon: "bag.fill", title: productsTitle, count: productsCount,
            color: SolennixColors.primary, route: Route.eventProducts(id: eventId),
            editRoute: Route.eventForm(id: eventId, step: 2),
            editLabel: FeatureL10n.text("events.detail.context_menu.edit_products", "Editar productos")
        )

        contentRow(
            icon: "sparkles", title: extrasTitle, count: extrasCount,
            color: SolennixColors.info, route: Route.eventExtras(id: eventId),
            editRoute: Route.eventForm(id: eventId, step: 3),
            editLabel: FeatureL10n.text("events.detail.context_menu.edit_extras", "Editar extras")
        )

        contentRow(
            icon: "drop.fill", title: suppliesTitle, count: suppliesCount,
            color: SolennixColors.warning, route: Route.eventSupplies(id: eventId),
            editRoute: Route.eventForm(id: eventId, step: 4),
            editLabel: FeatureL10n.text("events.detail.context_menu.edit_supplies", "Editar insumos")
        )

        contentRow(
            icon: "wrench.and.screwdriver.fill", title: equipmentTitle, count: equipmentCount,
            color: SolennixColors.success, route: Route.eventEquipment(id: eventId),
            editRoute: Route.eventForm(id: eventId, step: 4),
            editLabel: FeatureL10n.text("events.detail.context_menu.edit_equipment", "Editar equipo")
        )

        contentRow(
            icon: "cart.fill", title: shoppingTitle, count: nil, subtitle: shoppingSubtitle,
            color: SolennixColors.error, route: Route.eventShoppingList(id: eventId)
        )

        contentRow(
            icon: "person.3.fill", title: staffTitle, count: staffCount,
            color: SolennixColors.info, route: Route.eventStaff(id: eventId),
            editRoute: Route.eventForm(id: eventId, step: 4),
            editLabel: FeatureL10n.text("events.detail.context_menu.edit_staff", "Editar personal")
        )

        contentRow(
            icon: "camera.fill", title: photosTitle, count: photosCount,
            color: SolennixColors.info, route: Route.eventPhotos(id: eventId)
        )
    }

    @ViewBuilder
    private func contentRow(
        icon: String,
        title: String,
        count: Int?,
        subtitle: String? = nil,
        color: Color,
        route: Route,
        editRoute: Route? = nil,
        editLabel: String? = nil
    ) -> some View {
        NavigationLink(value: route) {
            HStack(spacing: Spacing.md) {
                // Icon chip
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(color.opacity(0.12))
                        .frame(width: 32, height: 32)
                    Image(systemName: icon)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(color)
                }

                // Title + subtitle
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SolennixColors.text)

                    if let subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()

                // Count badge
                if let count, count > 0 {
                    Text("\(count)")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(color)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 2)
                        .background(color.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
            .frame(minHeight: 44)
            .accessibilityElement(children: .combine)
        }
        .listRowBackground(SolennixColors.card)
        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        .contextMenu {
            if let editRoute, let editLabel {
                NavigationLink(value: editRoute) {
                    Label(editLabel, systemImage: "pencil")
                }
            }
        }
    }
}

// MARK: - Primary Link Card (List row)

struct EventDetailPrimaryLinkCard: View {
    let icon: String
    let title: String
    let tint: Color
    let background: Color
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            HStack {
                Image(systemName: icon)
                    .font(.body)
                Text(title)
                    .font(.body.weight(.medium))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .foregroundStyle(tint)
            .frame(minHeight: 44)
        }
        .buttonStyle(.plain)
        .listRowBackground(background)
        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
    }
}

// MARK: - Primary Button Card (List row)

struct EventDetailPrimaryButtonCard: View {
    let icon: String
    let title: String
    let tint: Color
    let background: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.body)
                Text(title)
                    .font(.body.weight(.medium))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .foregroundStyle(tint)
            .frame(minHeight: 44)
        }
        .buttonStyle(.plain)
        .listRowBackground(background)
        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
    }
}

// MARK: - Notes Card (List row)

struct EventDetailNotesCard: View {
    let title: String
    let notes: String

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "note.text")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Text(notes)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .listRowBackground(SolennixColors.card)
        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
    }
}

// MARK: - Live Activity Card (List row)

struct EventDetailLiveActivityCard: View {
    let isActive: Bool
    let startTitle: String
    let stopTitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: isActive ? "stop.circle.fill" : "dot.radiowaves.left.and.right")
                    .font(.body)
                    .foregroundStyle(isActive ? SolennixColors.error : SolennixColors.textInverse)
                    .symbolEffect(.pulse, isActive: isActive)

                Text(isActive ? stopTitle : startTitle)
                    .font(.body.weight(.medium))
                    .foregroundStyle(isActive ? SolennixColors.error : SolennixColors.textInverse)

                Spacer()

                if isActive {
                    Circle()
                        .fill(SolennixColors.success)
                        .frame(width: 8, height: 8)
                }
            }
            .frame(minHeight: 44)
        }
        .buttonStyle(.plain)
        .listRowBackground(isActive ? SolennixColors.errorBg : SolennixColors.success)
        .listRowSeparator(.hidden)
    }
}

// MARK: - Hub Skeleton (in-List placeholder rows)

struct EventDetailHubSkeleton: View {
    var body: some View {
        // Header skeleton
        Section {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack(spacing: Spacing.md) {
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 56, height: 56)
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        SkeletonLine(width: 160, height: 18)
                        SkeletonLine(width: 100, height: 14)
                        SkeletonLine(width: 70, height: 24)
                    }
                    Spacer()
                    SkeletonLine(width: 80, height: 24)
                }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.sm) {
                    ForEach(0..<4, id: \.self) { _ in SkeletonLine(height: 36) }
                }
            }
            .padding(Spacing.lg)
            .listRowBackground(SolennixColors.card)
            .listRowSeparator(.hidden)
        }

        // Finance skeleton
        Section {
            HStack(spacing: Spacing.lg) {
                Circle()
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 64, height: 64)
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    SkeletonLine(width: 120, height: 14)
                    SkeletonLine(width: 80, height: 28)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: Spacing.sm) {
                    SkeletonLine(width: 80, height: 14)
                    SkeletonLine(width: 60, height: 28)
                }
            }
            .padding(Spacing.lg)
            .listRowBackground(SolennixColors.card)
            .listRowSeparator(.hidden)
        }

        // Content rows skeleton
        Section {
            ForEach(0..<5, id: \.self) { _ in
                HStack(spacing: Spacing.md) {
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 32, height: 32)
                    SkeletonLine(width: 120, height: 16)
                    Spacer()
                    SkeletonLine(width: 28, height: 20)
                }
                .listRowBackground(SolennixColors.card)
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
            }
        }
    }
}

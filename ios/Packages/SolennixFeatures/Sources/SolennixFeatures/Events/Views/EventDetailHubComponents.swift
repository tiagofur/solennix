import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Countdown Hero Chip

/// Shows date proximity for upcoming or past events.
/// Plain text countdown label, hidden for cancelled events.
struct EventCountdownText: View {
    let eventDate: String
    let status: EventStatus

    private enum Proximity {
        case today
        case tomorrow
        case future(Int)
        case past
    }

    private var proximity: Proximity? {
        guard status != .cancelled else { return nil }

        // Compare CALENDAR DAY strings, not Date values.
        let todayString = Date.localTodayString()                  // e.g. "2026-06-15" in device TZ
        let eventDayString = String(eventDate.prefix(10))          // first 10 chars of server date

        guard let todayUTC = Date.fromServerDay(todayString),
              let eventUTC = Date.fromServerDay(eventDayString) else { return nil }

        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let comps = cal.dateComponents([.day], from: todayUTC, to: eventUTC)
        let days = comps.day ?? 0

        if days == 0 { return .today }
        if days == 1 { return .tomorrow }
        if days > 1  { return .future(days) }
        return .past
    }

    var body: some View {
        if let proximity {
            HStack(spacing: 4) {
                Image(systemName: iconName(proximity))
                    .font(.caption2.weight(.bold))
                Text(label(proximity))
                    .font(.caption2.weight(.bold))
                    .kerning(0.8)
            }
            .foregroundStyle(textColor(proximity))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(accessibilityLabel(proximity))
        }
    }

    private func label(_ p: Proximity) -> String {
        switch p {
        case .today:
            return FeatureL10n.text("events.detail.countdown.today", "HOY").uppercased()
        case .tomorrow:
            return FeatureL10n.text("events.detail.countdown.tomorrow", "MAÑANA").uppercased()
        case .future(let n):
            return String(format: FeatureL10n.text("events.detail.countdown.future", "FALTAN %d DÍAS"), n).uppercased()
        case .past:
            return FeatureL10n.text("events.detail.countdown.past", "FINALIZADO").uppercased()
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

    private func textColor(_ p: Proximity) -> Color {
        switch p {
        case .today:    return SolennixColors.primary
        case .tomorrow: return SolennixColors.primary
        case .future:   return SolennixColors.textSecondary
        case .past:     return SolennixColors.textTertiary
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

                    Text(FeatureL10n.text("events.detail.payment_ring.collected", "cobrado"))
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
    let clientCity: String?
    let clientPhone: String?
    let clientEmail: String?
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
    @Environment(\.openURL) private var openURL

    init(
        event: Event,
        clientName: String?,
        clientCity: String?,
        clientPhone: String?,
        clientEmail: String?,
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
        self.clientCity = clientCity
        self.clientPhone = clientPhone
        self.clientEmail = clientEmail
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
            // Top row: date box + name/client/status
            HStack(alignment: .top, spacing: Spacing.md) {
                EventDetailDateBox(month: month, day: day)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    EventCountdownText(eventDate: event.eventDate, status: event.status)

                    Text(event.serviceType)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(SolennixColors.text)
                        .lineLimit(2)

                    if let clientName, !clientName.isEmpty {
                        let displayClient = [clientName, clientCity].compactMap { val in
                            guard let val, !val.isEmpty else { return nil }
                            return val
                        }.joined(separator: " • ")

                        Text(displayClient)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    Button(action: onStatusTap) {
                        StatusBadge(status: event.status.rawValue)
                    }
                    .accessibilityHint("Toca para cambiar el estado")
                }

                Spacer()
            }

            // Quick info grid — 2 cols compact, 1 col accessibility sizes
            LazyVGrid(columns: quickInfoColumns, spacing: Spacing.sm) {
                EventDetailQuickInfoItem(icon: "calendar", label: dateLabel, value: dateValue)

                if let scheduleValue, !scheduleValue.isEmpty {
                    EventDetailQuickInfoItem(icon: "clock", label: scheduleLabel, value: scheduleValue)
                }

                EventDetailQuickInfoItem(icon: "person.2", label: peopleLabel, value: peopleValue)
            }

            if let locationLabel, let locationValue, !locationValue.isEmpty {
                EventDetailQuickInfoItem(icon: "mappin", label: locationLabel, value: locationValue, lineLimit: nil)
            }

            // Client contact actions (Call, WhatsApp, Email) inside the same card!
            if let phone = clientPhone, !phone.isEmpty {
                Divider().background(SolennixColors.border)

                HStack(spacing: Spacing.sm) {
                    actionChip(
                        icon: "phone.fill",
                        label: FeatureL10n.text("events.detail.client.action.call", "Llamar"),
                        url: URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })")
                    )

                    if let digits = whatsappDigits {
                        actionChip(
                            icon: "message.fill",
                            label: FeatureL10n.text("events.detail.client.action.whatsapp", "WhatsApp"),
                            url: URL(string: "https://wa.me/\(digits)")
                        )
                    }

                    if let email = clientEmail, !email.isEmpty {
                        actionChip(
                            icon: "envelope.fill",
                            label: FeatureL10n.text("events.detail.client.action.email", "Email"),
                            url: URL(string: "mailto:\(email)")
                        )
                    }
                }
                .padding(.top, Spacing.xs)
            }
        }
        .padding(Spacing.md)
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

    private var whatsappDigits: String? {
        guard let phone = clientPhone else { return nil }
        let digits = phone.filter(\.isNumber)
        return digits.count >= 8 ? digits : nil
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
        .accessibilityLabel(
            label == FeatureL10n.text("events.detail.client.action.call", "Llamar")
                ? "\(label) a \(clientPhone ?? "")"
                : "\(label): \(clientName ?? "")"
        )
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
        .padding(Spacing.md)
        .background(
            NavigationLink(value: route) {
                Color.clear
            }
            .buttonStyle(.plain)
            .opacity(0)
        )
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

    // Action Menu Parameters
    let recordTitle: String?
    let settleTitle: String?
    let depositTitle: String?
    let onRecord: (() -> Void)?
    let onSettle: (() -> Void)?
    let onDeposit: (() -> Void)?

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
        fullyPaidCounter: Int = 0,
        recordTitle: String? = nil,
        settleTitle: String? = nil,
        depositTitle: String? = nil,
        onRecord: (() -> Void)? = nil,
        onSettle: (() -> Void)? = nil,
        onDeposit: (() -> Void)? = nil
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
        self.recordTitle = recordTitle
        self.settleTitle = settleTitle
        self.depositTitle = depositTitle
        self.onRecord = onRecord
        self.onSettle = onSettle
        self.onDeposit = onDeposit
    }

    @ScaledMetric(relativeTo: .body) private var scaledRingSize: CGFloat = 64

    /// Cap the ring at 96 pt to prevent ballooning at AX text sizes.
    private var ringSize: CGFloat { min(scaledRingSize, 96) }

    var body: some View {
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
            .background(
                NavigationLink(value: route) {
                    Color.clear
                }
                .buttonStyle(.plain)
                .opacity(0)
            )

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

            if let recordTitle, let onRecord, let onSettle {
                Spacer().frame(height: Spacing.xs)

                Menu {
                    Button {
                        onRecord()
                    } label: {
                        Label(recordTitle, systemImage: "pencil.and.outline")
                    }

                    if let settleTitle {
                        Button {
                            onSettle()
                        } label: {
                            Label(settleTitle, systemImage: "checkmark.circle")
                        }
                    }

                    if let depositTitle, let onDeposit {
                        Button {
                            onDeposit()
                        } label: {
                            Label(depositTitle, systemImage: "clock")
                        }
                    }
                } label: {
                    HStack(spacing: Spacing.xs) {
                        Spacer()
                        Image(systemName: "creditcard")
                            .font(.subheadline.weight(.semibold))
                        Text(recordTitle)
                            .font(.subheadline.weight(.bold))
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption2)
                        Spacer()
                    }
                    .foregroundStyle(SolennixColors.primary)
                    .padding(.vertical, 12)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
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
            }
            .foregroundStyle(tint)
            .frame(minHeight: 44)
        }
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
    // Mirror the same base size the real PaymentCollectionRing uses so skeleton
    // and real ring are the same diameter at default Dynamic Type.
    @ScaledMetric(relativeTo: .body) private var skeletonRingSize: CGFloat = 64

    var body: some View {
        // Header skeleton — mirrors EventDetailHeaderCard
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
                    ForEach(0..<3, id: \.self) { _ in SkeletonLine(height: 36) }
                }
                SkeletonLine(height: 36)
            }
            .padding(Spacing.md)
            .listRowBackground(SolennixColors.card)
            .listRowSeparator(.hidden)
        }


        // Finance summary skeleton — mirrors EventDetailFinanceSummaryCard
        Section {
            HStack(spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 60, height: 12)
                    SkeletonLine(width: 100, height: 24)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    SkeletonLine(width: 60, height: 12)
                    SkeletonLine(width: 80, height: 24)
                }
            }
            .padding(Spacing.md)
            .listRowBackground(SolennixColors.card)
            .listRowSeparator(.hidden)
        }

        // Payment ring skeleton — mirrors EventDetailPaymentSummaryCard
        Section {
            HStack(alignment: .center, spacing: Spacing.lg) {
                // Ring placeholder — sized to match the real ring at this Dynamic Type size
                Circle()
                    .fill(SolennixColors.surfaceAlt)
                    .frame(
                        width: min(skeletonRingSize, 96),
                        height: min(skeletonRingSize, 96)
                    )
                VStack(spacing: Spacing.sm) {
                    SkeletonLine(height: 36)
                    SkeletonLine(height: 36)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(Spacing.md)
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

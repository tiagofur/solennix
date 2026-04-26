import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Calendar View

/// Main calendar screen: monthly grid + blocked date management.
public struct CalendarView: View {

    // MARK: - Properties

    @Bindable private var viewModel: CalendarViewModel
    @State private var showBlockSheet = false
    @State private var showUnblockAlert = false
    @State private var showErrorAlert = false
    @State private var longPressedDate: Date?
    @State private var showBlockedDatesSheet = false
    @State private var showQuickQuote = false
    @State private var hapticTrigger: Int = 0
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @Environment(\.apiClient) private var apiClient
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // MARK: - Init

    public init(viewModel: CalendarViewModel) {
        self.viewModel = viewModel
    }

    // MARK: - Body

    public var body: some View {
        calendarBody
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle(String(localized: "calendar.title", bundle: .module))
            .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    // Status filter — Apple HIG: Menu attached to a toolbar
                    // button, checkmark on the active item. Feels native vs.
                    // a chips row (which belongs to Android's M3 vocabulary).
                    Menu {
                        filterMenuButton(label: "calendar.filter.all", status: nil)
                        Divider()
                        filterMenuButton(label: "calendar.filter.quoted", status: .quoted)
                        filterMenuButton(label: "calendar.filter.confirmed", status: .confirmed)
                        filterMenuButton(label: "calendar.filter.completed", status: .completed)
                        filterMenuButton(label: "calendar.filter.cancelled", status: .cancelled)
                    } label: {
                        Image(systemName: viewModel.statusFilter == nil
                              ? "line.3.horizontal.decrease.circle"
                              : "line.3.horizontal.decrease.circle.fill")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel(String(localized: "calendar.filter.all", bundle: .module))
                    }

                    // New event / quick quote menu
                    Menu {
                        NavigationLink(value: Route.eventForm(date: viewModel.selectedDate)) {
                            Label(
                                String(localized: "calendar.new_event", bundle: .module),
                                systemImage: "calendar.badge.plus"
                            )
                        }
                        .disabled(!planLimitsManager.canCreateEvent)

                        Button {
                            showQuickQuote = true
                        } label: {
                            Label(
                                String(localized: "calendar.quick_quote", bundle: .module),
                                systemImage: "doc.text.magnifyingglass"
                            )
                        }
                    } label: {
                        Image(systemName: "plus")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel(String(localized: "calendar.create_event_action", bundle: .module))
                    }

                    Button {
                        showBlockedDatesSheet = true
                    } label: {
                        Image(systemName: "calendar.badge.minus")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel(String(localized: "calendar.manage_blocks", bundle: .module))
                    }

                    Button {
                        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) {
                            viewModel.goToToday()
                        }
                    } label: {
                        Text(String(localized: "calendar.today", bundle: .module))
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.primary)
                    }
                }
            }
        }
        .sheet(isPresented: $showBlockedDatesSheet) {
            BlockedDatesSheet(viewModel: viewModel)
        }
        .sheet(isPresented: $showQuickQuote) {
            QuickQuoteView(apiClient: apiClient)
        }
        .sheet(isPresented: $showBlockSheet) {
            BlockDateSheet(
                startDate: longPressedDate ?? Date(),
                viewModel: viewModel,
                onDismiss: { longPressedDate = nil }
            )
        }
        .alert(
            String(localized: "calendar.unblock.title", bundle: .module),
            isPresented: $showUnblockAlert
        ) {
            Button(String(localized: "calendar.action.cancel", bundle: .module), role: .cancel) {
                longPressedDate = nil
            }
            Button(String(localized: "calendar.unblock.confirm", bundle: .module), role: .destructive) {
                guard let date = longPressedDate else { return }
                Task {
                    await viewModel.toggleDateBlock(startDate: date, endDate: date, reason: nil)
                }
                longPressedDate = nil
            }
        } message: {
            if let date = longPressedDate,
               let unavailable = viewModel.unavailableDateFor(date),
               let reason = unavailable.reason, !reason.isEmpty {
                Text(String(
                    format: String(localized: "calendar.unblock_message_reason", bundle: .module),
                    reason
                ))
            } else {
                Text(String(localized: "calendar.unblock_message", bundle: .module))
            }
        }
        // Generic error alert — the ViewModel emits a typed `CalendarError`,
        // we map each case to a localized string. No freetext in-memory.
        .alert(
            errorAlertTitle,
            isPresented: $showErrorAlert
        ) {
            Button(String(localized: "calendar.action.ok", bundle: .module), role: .cancel) {
                viewModel.clearError()
            }
        }
        // Native haptic on long-press — `sensoryFeedback` is iOS 17+ and
        // respects the user's Haptic Touch setting. Trigger flips whenever
        // a long-press is consumed.
        .sensoryFeedback(.impact(weight: .medium), trigger: hapticTrigger)
        .onChange(of: viewModel.error) { _, new in
            showErrorAlert = new != nil
        }
        .refreshable {
            await viewModel.loadEvents()
        }
        .task {
            await viewModel.loadEvents()
        }
        .overlay {
            if viewModel.isLoading && viewModel.events.isEmpty {
                ProgressView()
                    .controlSize(.large)
                    .tint(SolennixColors.primary)
            }
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func filterMenuButton(label: String.LocalizationValue, status: EventStatus?) -> some View {
        Button {
            viewModel.setStatusFilter(status)
        } label: {
            if viewModel.statusFilter == status {
                Label(String(localized: label, bundle: .module), systemImage: "checkmark")
            } else {
                Text(String(localized: label, bundle: .module))
            }
        }
    }

    private var errorAlertTitle: String {
        switch viewModel.error {
        case .loadFailed:
            return String(localized: "calendar.error.load_failed", bundle: .module)
        case .blockFailed:
            return String(localized: "calendar.error.block_failed", bundle: .module)
        case .unblockFailed:
            return String(localized: "calendar.error.unblock_failed", bundle: .module)
        case .none:
            return ""
        }
    }

    // MARK: - Body Dispatcher

    @ViewBuilder
    private var calendarBody: some View {
        if sizeClass == .regular {
            iPadCalendarContent
        } else {
            calendarModeContent
        }
    }

    // MARK: - iPad Calendar Mode

    /// Maximum width for the calendar grid in landscape so it doesn't stretch
    /// into a poster-sized layout on iPad Pro 13".
    private let calendarMaxWidthLandscape: CGFloat = 560

    private var iPadCalendarContent: some View {
        GeometryReader { proxy in
            let isLandscape = proxy.size.width > proxy.size.height

            if isLandscape {
                HStack(spacing: 0) {
                    calendarPane
                        .frame(maxWidth: calendarMaxWidthLandscape)
                        .frame(maxWidth: .infinity, alignment: .top)

                    Divider()

                    eventsPane
                        .frame(maxWidth: .infinity)
                        .background(SolennixColors.card)
                }
            } else {
                // Portrait iPad: same single-column layout as iPhone.
                calendarModeContent
            }
        }
    }

    private var calendarPane: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                monthHeader

                CalendarGridView(
                    days: viewModel.daysInMonth,
                    eventDotsForDay: viewModel.eventDotsForDay,
                    eventCountForDay: viewModel.eventCountForDay,
                    isDateBlocked: viewModel.isDateBlocked,
                    selectedDate: viewModel.selectedDate,
                    onSelectDate: viewModel.selectDate,
                    onLongPressDate: handleLongPress
                )
                .padding(.horizontal, Spacing.sm)
            }
            .padding(.vertical, Spacing.md)
        }
    }

    private var eventsPane: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                if viewModel.selectedDate != nil {
                    Text(viewModel.formattedSelectedDate())
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)
                        .padding(.horizontal, Spacing.md)
                        .padding(.top, Spacing.md)

                    let dayEvents = viewModel.eventsForSelectedDate

                    if dayEvents.isEmpty {
                        emptyDayView
                    } else {
                        ForEach(dayEvents) { event in
                            NavigationLink(value: Route.eventDetail(id: event.id)) {
                                eventCard(event)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                } else {
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "hand.tap")
                            .font(.system(size: 40))
                            .foregroundStyle(SolennixColors.textTertiary)

                        Text(String(localized: "calendar.select_day_prompt", bundle: .module))
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxxl)
                }
            }
            .padding(.bottom, Spacing.xxl)
        }
    }

    // MARK: - Phone Calendar Mode

    private var calendarModeContent: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                monthHeader

                CalendarGridView(
                    days: viewModel.daysInMonth,
                    eventDotsForDay: viewModel.eventDotsForDay,
                    eventCountForDay: viewModel.eventCountForDay,
                    isDateBlocked: viewModel.isDateBlocked,
                    selectedDate: viewModel.selectedDate,
                    onSelectDate: viewModel.selectDate,
                    onLongPressDate: handleLongPress
                )
                .padding(.horizontal, Spacing.sm)

                selectedDateSection
            }
            .padding(.bottom, Spacing.xxl)
        }
    }

    private var monthHeader: some View {
        HStack {
            Button {
                withAnimation(.easeInOut(duration: 0.25)) {
                    viewModel.previousMonth()
                }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(SolennixColors.text)
                    .frame(width: 36, height: 36)
                    .accessibilityLabel(String(localized: "calendar.previous_month", bundle: .module))
            }

            Spacer()

            Text(viewModel.monthTitle)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)

            Spacer()

            Button {
                withAnimation(.easeInOut(duration: 0.25)) {
                    viewModel.nextMonth()
                }
            } label: {
                Image(systemName: "chevron.right")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(SolennixColors.text)
                    .frame(width: 36, height: 36)
                    .accessibilityLabel(String(localized: "calendar.next_month", bundle: .module))
            }
        }
        .padding(.horizontal, Spacing.md)
    }

    @ViewBuilder
    private var selectedDateSection: some View {
        if viewModel.selectedDate != nil {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text(viewModel.formattedSelectedDate())
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .textCase(.uppercase)
                    .padding(.horizontal, Spacing.md)

                let dayEvents = viewModel.eventsForSelectedDate

                if dayEvents.isEmpty {
                    emptyDayView
                } else {
                    ForEach(dayEvents) { event in
                        NavigationLink(value: Route.eventDetail(id: event.id)) {
                            eventCard(event)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var emptyDayView: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "calendar")
                .font(.system(size: 40))
                .foregroundStyle(SolennixColors.textTertiary)

            Text(String(localized: "calendar.no_events_for_day", bundle: .module))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
        .padding(.horizontal, Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        // Align with the event card + calendar grid (both at Spacing.sm).
        .padding(.horizontal, Spacing.sm)
    }

    /// Baseline event card shared with Android — same data density so the
    /// user sees the same info on either phone. Layout:
    ///   Left: status dot (iOS-native vs. Android's vertical bar)
    ///   Middle: client name (bold) + service type + time row
    ///   Right: status badge (top) + people count + MXN amount (bottom)
    private func eventCard(_ event: Event) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Circle()
                .fill(colorForStatus(event.status))
                .frame(width: 10, height: 10)
                .padding(.top, 4)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(viewModel.clientName(for: event.clientId))
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)
                    .lineLimit(1)

                Text(event.serviceType)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)

                HStack(spacing: Spacing.sm) {
                    let timeLabel = viewModel.timeRange(for: event)
                        ?? String(localized: "calendar.all_day", bundle: .module)
                    Label(timeLabel, systemImage: "clock")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Label("\(event.numPeople)", systemImage: "person.2")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            Spacer(minLength: Spacing.xs)

            VStack(alignment: .trailing, spacing: Spacing.xs) {
                StatusBadge(status: event.status.rawValue)

                // Zero-decimal MXN for list cards — same convention as the
                // dashboard. Cents live on the event detail screen.
                Text(Self.amountFormatter.string(
                    from: NSNumber(value: event.totalAmount)
                ) ?? "$0")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.primary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
        // Match the calendar grid's horizontal inset (`Spacing.sm`) — previously
        // the card lived at `Spacing.md`, making the event list visibly narrower
        // than the calendar above it on iPhone.
        .padding(.horizontal, Spacing.sm)
    }

    // MARK: - Helpers

    /// Shared zero-decimal MXN formatter. Uses `es-MX` regardless of UI
    /// language — the business is Mexico-based and users recognize that
    /// separator convention on bank statements.
    private static let amountFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale(identifier: "es_MX")
        f.maximumFractionDigits = 0
        f.minimumFractionDigits = 0
        return f
    }()

    // MARK: - Long Press Handler

    private func handleLongPress(_ date: Date) {
        longPressedDate = date
        // Nudge the trigger — `sensoryFeedback` modifier fires the impact.
        hapticTrigger &+= 1
        if viewModel.isDateBlocked(date) {
            showUnblockAlert = true
        } else {
            showBlockSheet = true
        }
    }

    // MARK: - Helpers

    private func colorForStatus(_ status: EventStatus) -> Color {
        switch status {
        case .quoted: return SolennixColors.statusQuoted
        case .confirmed: return SolennixColors.statusConfirmed
        case .completed: return SolennixColors.statusCompleted
        case .cancelled: return SolennixColors.statusCancelled
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Calendar View") {
    NavigationStack {
        CalendarView(viewModel: .preview)
            .navigationTitle("Calendario")
            .navigationBarTitleDisplayMode(.inline)
    }
}
#endif

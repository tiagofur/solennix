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
    @State private var longPressedDate: Date?
    @State private var showBlockedDatesSheet = false
    @Environment(\.apiClient) private var apiClient
    @Environment(\.horizontalSizeClass) private var sizeClass

    // MARK: - Init

    public init(viewModel: CalendarViewModel) {
        self.viewModel = viewModel
    }

    // MARK: - Body

    public var body: some View {
        Group {
            if sizeClass == .regular {
                iPadCalendarContent
            } else {
                calendarModeContent
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Calendario")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    Button {
                        showBlockedDatesSheet = true
                    } label: {
                        Image(systemName: "calendar.badge.minus")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Button {
                        withAnimation(.easeInOut(duration: 0.25)) {
                            viewModel.goToToday()
                        }
                    } label: {
                        Text("Hoy")
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
        .sheet(isPresented: $showBlockSheet) {
            BlockDateSheet(
                startDate: longPressedDate ?? Date(),
                viewModel: viewModel,
                onDismiss: { longPressedDate = nil }
            )
        }
        .alert("Desbloquear fecha", isPresented: $showUnblockAlert) {
            Button("Cancelar", role: .cancel) {
                longPressedDate = nil
            }
            Button("Desbloquear", role: .destructive) {
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
                Text("Motivo: \(reason)\n\nEsta accion habilitara la fecha nuevamente.")
            } else {
                Text("Esta accion habilitara la fecha nuevamente.")
            }
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

    // MARK: - iPad Calendar Mode

    private var iPadCalendarContent: some View {
        HStack(spacing: 0) {
            // Left: Calendar grid (~60%)
            ScrollView {
                VStack(spacing: Spacing.md) {
                    monthHeader

                    CalendarGridView(
                        days: viewModel.daysInMonth,
                        eventDotsForDay: viewModel.eventDotsForDay,
                        isDateBlocked: viewModel.isDateBlocked,
                        selectedDate: viewModel.selectedDate,
                        onSelectDate: viewModel.selectDate,
                        onLongPressDate: handleLongPress
                    )
                    .padding(.horizontal, Spacing.sm)
                }
                .padding(.bottom, Spacing.xxl)
            }
            .frame(maxWidth: .infinity)

            Divider()

            // Right: Selected day's events (~40%)
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

                            Text("Selecciona un dia para ver sus eventos")
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
            .frame(width: UIScreen.main.bounds.width * 0.4)
            .background(SolennixColors.card)
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

            Text("No hay eventos para este dia")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
        .padding(.horizontal, Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .padding(.horizontal, Spacing.md)
    }

    private func eventCard(_ event: Event) -> some View {
        HStack(spacing: Spacing.sm) {
            Circle()
                .fill(colorForStatus(event.status))
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(viewModel.clientName(for: event.clientId))
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                Text(event.serviceType)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                if let timeRange = viewModel.timeRange(for: event) {
                    Label(timeRange, systemImage: "clock")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: Spacing.xs) {
                StatusBadge(status: event.status.rawValue)

                HStack(spacing: Spacing.xs) {
                    Image(systemName: "person.2")
                        .font(.caption2)
                    Text("\(event.numPeople)")
                        .font(.caption)
                }
                .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Long Press Handler

    private func handleLongPress(_ date: Date) {
        longPressedDate = date
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

#Preview("Calendar View") {
    NavigationStack {
        CalendarView(viewModel: .preview)
            .navigationTitle("Calendario")
            .navigationBarTitleDisplayMode(.inline)
    }
}

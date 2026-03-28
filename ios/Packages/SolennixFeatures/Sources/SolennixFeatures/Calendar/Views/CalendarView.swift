import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Calendar View

/// Main calendar screen with dual view mode: calendar grid and searchable list.
public struct CalendarView: View {

    // MARK: - Properties

    @Bindable private var viewModel: CalendarViewModel
    @State private var showBlockAlert = false
    @State private var showUnblockAlert = false
    @State private var longPressedDate: Date?
    @State private var blockReason: String = ""
    @State private var showQuickQuote = false
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @Environment(\.apiClient) private var apiClient
    @Environment(\.horizontalSizeClass) private var sizeClass

    // MARK: - Init

    public init(viewModel: CalendarViewModel) {
        self.viewModel = viewModel
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 0) {
            // View mode picker
            Picker("Modo de vista", selection: $viewModel.viewMode) {
                ForEach(ViewMode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)

            // Content based on view mode
            switch viewModel.viewMode {
            case .calendar:
                if sizeClass == .regular {
                    iPadCalendarContent
                } else {
                    calendarModeContent
                }
            case .list:
                listModeContent
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Calendario")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    Button {
                        showQuickQuote = true
                    } label: {
                        Image(systemName: "doc.text.magnifyingglass")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    NavigationLink(value: Route.eventForm(date: viewModel.selectedDate)) {
                        Image(systemName: "plus.circle")
                            .font(.body)
                            .foregroundStyle(planLimitsManager.canCreateEvent ? SolennixColors.primary : SolennixColors.textTertiary)
                    }
                    .disabled(!planLimitsManager.canCreateEvent)
                }
            }
        }
        .sheet(isPresented: $showQuickQuote) {
            QuickQuoteView(apiClient: apiClient)
                .presentationDetents([.large])
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
        .alert("Bloquear fecha", isPresented: $showBlockAlert) {
            TextField("Motivo (opcional)", text: $blockReason)
            Button("Cancelar", role: .cancel) {
                longPressedDate = nil
                blockReason = ""
            }
            Button("Bloquear") {
                guard let date = longPressedDate else { return }
                let reason = blockReason.trimmingCharacters(in: .whitespacesAndNewlines)
                Task {
                    await viewModel.toggleDateBlock(
                        date: date,
                        reason: reason.isEmpty ? nil : reason
                    )
                }
                longPressedDate = nil
                blockReason = ""
            }
        } message: {
            Text("Esta fecha se marcara como no disponible.")
        }
        .alert("Desbloquear fecha", isPresented: $showUnblockAlert) {
            Button("Cancelar", role: .cancel) {
                longPressedDate = nil
            }
            Button("Desbloquear", role: .destructive) {
                guard let date = longPressedDate else { return }
                Task {
                    await viewModel.toggleDateBlock(date: date, reason: nil)
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
                        onLongPressDate: { date in
                            longPressedDate = date
                            blockReason = ""
                            if viewModel.isDateBlocked(date) {
                                showUnblockAlert = true
                            } else {
                                showBlockAlert = true
                            }
                        }
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

    // MARK: - Calendar Mode

    private var calendarModeContent: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Month header
                monthHeader

                // Calendar grid
                CalendarGridView(
                    days: viewModel.daysInMonth,
                    eventDotsForDay: viewModel.eventDotsForDay,
                    isDateBlocked: viewModel.isDateBlocked,
                    selectedDate: viewModel.selectedDate,
                    onSelectDate: viewModel.selectDate,
                    onLongPressDate: { date in
                        longPressedDate = date
                        blockReason = ""
                        if viewModel.isDateBlocked(date) {
                            showUnblockAlert = true
                        } else {
                            showBlockAlert = true
                        }
                    }
                )
                .padding(.horizontal, Spacing.sm)

                // Selected date events
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
                    viewModel.goToToday()
                }
            } label: {
                Text("Hoy")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.primary)
            }

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
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 40))
                .foregroundStyle(SolennixColors.textTertiary)

            Text("No hay eventos programados")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

            if let selected = viewModel.selectedDate {
                NavigationLink(value: Route.eventForm(date: selected)) {
                    PremiumButton(title: "Crear Evento", fullWidth: false) {}
                        .allowsHitTesting(false)
                }
            }
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
            // Status dot
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

    // MARK: - List Mode

    private var listModeContent: some View {
        VStack(spacing: Spacing.sm) {
            // Search field
            HStack(spacing: Spacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(SolennixColors.textTertiary)

                TextField("Buscar por cliente o servicio...", text: $viewModel.searchText)
                    .textFieldStyle(.plain)
                    .font(.body)

                if !viewModel.searchText.isEmpty {
                    Button {
                        viewModel.searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            }
            .padding(Spacing.sm)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .padding(.horizontal, Spacing.md)

            // Status filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.sm) {
                    ForEach(StatusFilter.allCases, id: \.self) { filter in
                        let count = filterCount(for: filter)
                        let isSelected = viewModel.statusFilter == filter
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                viewModel.statusFilter = filter
                            }
                        } label: {
                            HStack(spacing: Spacing.xs) {
                                Text(filter.rawValue)
                                if count > 0 {
                                    Text("\(count)")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundStyle(isSelected ? .white : SolennixColors.textTertiary)
                                        .padding(.horizontal, 4)
                                        .padding(.vertical, 1)
                                        .background(
                                            isSelected
                                                ? Color.white.opacity(0.3)
                                                : SolennixColors.textTertiary.opacity(0.2)
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: 4))
                                }
                            }
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(
                                isSelected
                                    ? .white
                                    : SolennixColors.textSecondary
                            )
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xs)
                            .background(
                                isSelected
                                    ? SolennixColors.primary
                                    : SolennixColors.surfaceAlt
                            )
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.full))
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
            }

            // Results count
            HStack {
                Text("\(viewModel.filteredEvents.count) eventos")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
            }
            .padding(.horizontal, Spacing.md)

            // Event list
            let filtered = viewModel.filteredEvents

            if filtered.isEmpty {
                emptyListView
            } else {
                ScrollView {
                    LazyVStack(spacing: Spacing.sm) {
                        ForEach(filtered) { event in
                            NavigationLink(value: Route.eventDetail(id: event.id)) {
                                listEventCard(event)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.bottom, Spacing.xxl)
                }
            }
        }
    }

    private var emptyListView: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(SolennixColors.textTertiary)

            Text("No se encontraron eventos")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

            if viewModel.statusFilter != .all || !viewModel.searchText.isEmpty {
                Button {
                    viewModel.statusFilter = .all
                    viewModel.searchText = ""
                } label: {
                    Text("Limpiar filtros")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.primary)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxxl)
    }

    private func listEventCard(_ event: Event) -> some View {
        HStack(spacing: 0) {
            // Status colored left border
            RoundedRectangle(cornerRadius: 2)
                .fill(colorForStatus(event.status))
                .frame(width: 4)
                .padding(.vertical, Spacing.sm)

            HStack(spacing: Spacing.sm) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(viewModel.clientName(for: event.clientId))
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)

                    Text(event.serviceType)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Text(formattedEventDate(event.eventDate))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.xs) {
                        Label("\(event.numPeople)", systemImage: "person.2")
                            .font(.caption)

                        if let location = event.location {
                            Text("·")
                                .font(.caption)
                            Label(location, systemImage: "mappin")
                                .font(.caption)
                                .lineLimit(1)
                        }
                    }
                    .foregroundStyle(SolennixColors.textSecondary)
                }

                Spacer()

                StatusBadge(status: event.status.rawValue)
            }
            .padding(Spacing.sm)
        }
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    // MARK: - Helpers

    private func filterCount(for filter: StatusFilter) -> Int {
        if let status = filter.eventStatus {
            return viewModel.statusCounts[status] ?? 0
        }
        return viewModel.totalEventCount
    }

    private func colorForStatus(_ status: EventStatus) -> Color {
        switch status {
        case .quoted: return SolennixColors.statusQuoted
        case .confirmed: return SolennixColors.statusConfirmed
        case .completed: return SolennixColors.statusCompleted
        case .cancelled: return SolennixColors.statusCancelled
        }
    }

    private static let listDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.dateFormat = "d 'de' MMMM, yyyy"
        return f
    }()

    private static let apiDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private func formattedEventDate(_ dateStr: String) -> String {
        guard let date = Self.apiDateFormatter.date(from: dateStr) else { return dateStr }
        return Self.listDateFormatter.string(from: date)
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

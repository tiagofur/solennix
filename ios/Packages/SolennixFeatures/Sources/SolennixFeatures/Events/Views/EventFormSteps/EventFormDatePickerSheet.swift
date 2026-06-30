import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - EventFormDatePickerSheet

/// Date picker sheet for the event form. Replaces the native
/// `DatePicker(.graphical)` with the shared `CalendarGridView` so blocked/
/// unavailable dates render with the grid's existing red-tint + strikethrough +
/// a11y styling DURING selection (cross-platform parity with Android/Web).
///
/// - Hosts the shared `MonthNavigatorView` for month navigation.
/// - Passes EMPTY event-dot / overflow closures — the picker shows NO event
///   status (spec: Blocked-date-visibility).
/// - Selection highlight comes from `DateDay.isSelected`, which the builder
///   derives from `pickerSelectedDay` — so the grid highlights the day that
///   matches `eventDate` (ADR-1 reverse map).
/// - Tapping a blocked day is ALLOWED (Android parity): the grid fires
///   `onSelectDate` for every current-month cell; `selectPickerDay` updates
///   `eventDate` and shows the inline warning; the hard block is at `save()`.
struct EventFormDatePickerSheet: View {

    @Bindable var viewModel: EventFormViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.md) {
                    MonthNavigatorView(
                        title: viewModel.pickerMonthTitle,
                        onPrev: {
                            HapticsHelper.play(.selection)
                            viewModel.goToPreviousMonth()
                        },
                        onNext: {
                            HapticsHelper.play(.selection)
                            viewModel.goToNextMonth()
                        },
                        onToday: {
                            HapticsHelper.play(.selection)
                            viewModel.goToToday()
                        }
                    )

                    CalendarGridView(
                        days: viewModel.pickerDaysInMonth,
                        eventDotsForDay: { _ in [] },
                        eventOverflowForDay: { _ in 0 },
                        isDateBlocked: { viewModel.isDateBlocked($0) },
                        selectedDate: viewModel.eventDate,
                        onSelectDate: { viewModel.selectPickerDay($0) }
                    )
                }
                .padding(.horizontal)
                .padding(.bottom)
            }
            .navigationTitle(tr("events.form.general.event_date", "Fecha del evento"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(tr("events.form.general.done", "Listo")) {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}

// MARK: - Preview

#Preview("Event Form Date Picker") {
    EventFormDatePickerSheet(viewModel: EventFormViewModel(apiClient: APIClient()))
}

import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Block Date Sheet

/// Sheet presented on long-press of a calendar cell to block a date or date range.
struct BlockDateSheet: View {

    let startDate: Date
    @Bindable var viewModel: CalendarViewModel
    let onDismiss: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var endDate: Date
    @State private var reason = ""
    @State private var isSubmitting = false

    init(startDate: Date, viewModel: CalendarViewModel, onDismiss: @escaping () -> Void) {
        self.startDate = startDate
        self.viewModel = viewModel
        self.onDismiss = onDismiss
        self._endDate = State(initialValue: startDate)
    }

    private static var displayFormatter: DateFormatter {
        let f = DateFormatter()
        f.locale = FeatureL10n.locale
        f.setLocalizedDateFormatFromTemplate("EEEEdMMMM")
        return f
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Label(
                            Self.displayFormatter.string(from: startDate).capitalized,
                            systemImage: "calendar"
                        )
                        .foregroundStyle(SolennixColors.text)
                    }
                } header: {
                    Text(CalendarStrings.blockStartDate)
                }

                Section {
                    DatePicker(
                        CalendarStrings.blockEndDate,
                        selection: $endDate,
                        in: startDate...,
                        displayedComponents: .date
                    )
                } header: {
                    Text(CalendarStrings.blockEndDate)
                }

                Section {
                    TextField(
                        CalendarStrings.blockReasonPlaceholderRange,
                        text: $reason
                    )
                    .textInputAutocapitalization(.sentences)
                } header: {
                    Text(CalendarStrings.blockReasonLabel)
                }
            }
            .navigationTitle(CalendarStrings.blockTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(CalendarStrings.actionCancel) {
                        onDismiss()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(CalendarStrings.blockSave) {
                        Task {
                            isSubmitting = true
                            let trimmed = reason.trimmingCharacters(in: .whitespacesAndNewlines)
                            await viewModel.toggleDateBlock(
                                startDate: startDate,
                                endDate: endDate,
                                reason: trimmed.isEmpty ? nil : trimmed
                            )
                            isSubmitting = false
                            onDismiss()
                            dismiss()
                        }
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.statusCancelled)
                    .disabled(isSubmitting)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}

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

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale.autoupdatingCurrent
        f.setLocalizedDateFormatFromTemplate("EEEEdMMMM")
        return f
    }()

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
                    Text(String(localized: "calendar.block.start_date", bundle: .module))
                }

                Section {
                    DatePicker(
                        String(localized: "calendar.block.end_date", bundle: .module),
                        selection: $endDate,
                        in: startDate...,
                        displayedComponents: .date
                    )
                } header: {
                    Text(String(localized: "calendar.block.end_date", bundle: .module))
                }

                Section {
                    TextField(
                        String(localized: "calendar.block.reason_placeholder_range", bundle: .module),
                        text: $reason
                    )
                    .textInputAutocapitalization(.sentences)
                } header: {
                    Text(String(localized: "calendar.block.reason_label", bundle: .module))
                }
            }
            .navigationTitle(String(localized: "calendar.block.title", bundle: .module))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(String(localized: "calendar.action.cancel", bundle: .module)) {
                        onDismiss()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(String(localized: "calendar.block.save", bundle: .module)) {
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
    }
}

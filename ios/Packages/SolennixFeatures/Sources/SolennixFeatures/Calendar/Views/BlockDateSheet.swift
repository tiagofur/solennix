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
        f.locale = Locale(identifier: "es_MX")
        f.dateFormat = "EEEE, d 'de' MMMM"
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
                    Text("Fecha de inicio")
                }

                Section {
                    DatePicker(
                        "Fecha fin",
                        selection: $endDate,
                        in: startDate...,
                        displayedComponents: .date
                    )
                } header: {
                    Text("Fecha fin (opcional — para bloquear un rango)")
                }

                Section {
                    TextField("Ej. Vacaciones, Mantenimiento, Feriado", text: $reason)
                        .textInputAutocapitalization(.sentences)
                } header: {
                    Text("Razón (opcional)")
                }
            }
            .navigationTitle("Bloquear Fecha")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancelar") {
                        onDismiss()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Bloquear") {
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

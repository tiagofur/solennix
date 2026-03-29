import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Blocked Dates Sheet

/// Sheet for viewing and managing all blocked date ranges.
public struct BlockedDatesSheet: View {

    @Bindable var viewModel: CalendarViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showAddForm = false

    public init(viewModel: CalendarViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Group {
                if viewModel.unavailableDates.isEmpty {
                    emptyState
                } else {
                    List {
                        ForEach(viewModel.unavailableDates.sorted(by: { $0.startDate < $1.startDate })) { entry in
                            blockedDateRow(entry)
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Fechas Bloqueadas")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cerrar") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddForm = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddForm) {
                AddBlockSheet(viewModel: viewModel)
            }
        }
    }

    // MARK: - Row

    private func blockedDateRow(_ entry: UnavailableDate) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "lock.fill")
                .foregroundStyle(SolennixColors.statusCancelled)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(formattedRange(start: entry.startDate, end: entry.endDate))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let reason = entry.reason, !reason.isEmpty {
                    Text(reason)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            Spacer()

            Button {
                Task { await viewModel.deleteBlock(entry) }
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(SolennixColors.statusCancelled)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "calendar.badge.checkmark")
                .font(.system(size: 48))
                .foregroundStyle(SolennixColors.textTertiary)

            Text("No hay fechas bloqueadas")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            Text("Usa el botón + para agregar un bloqueo o mantén presionada una fecha en el calendario.")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            Button {
                showAddForm = true
            } label: {
                Label("Agregar Bloqueo", systemImage: "plus")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.sm)
                    .background(SolennixColors.primary)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.full))
            }
            .padding(.top, Spacing.sm)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Helpers

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.dateFormat = "d 'de' MMMM, yyyy"
        return f
    }()

    private static let apiFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private func formattedRange(start: String, end: String) -> String {
        guard let s = Self.apiFormatter.date(from: start),
              let e = Self.apiFormatter.date(from: end) else {
            return start == end ? start : "\(start) – \(end)"
        }
        let startStr = Self.displayFormatter.string(from: s)
        if start == end {
            return startStr
        }
        let endStr = Self.displayFormatter.string(from: e)
        return "\(startStr) – \(endStr)"
    }
}

// MARK: - Add Block Sheet

/// Inline form for adding a new blocked date range.
struct AddBlockSheet: View {

    @Bindable var viewModel: CalendarViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var reason = ""
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Rango de fechas") {
                    DatePicker("Fecha inicio", selection: $startDate, displayedComponents: .date)
                        .onChange(of: startDate) { _, new in
                            if endDate < new { endDate = new }
                        }

                    DatePicker("Fecha fin", selection: $endDate, in: startDate..., displayedComponents: .date)
                }

                Section("Detalle (opcional)") {
                    TextField("Razón (ej. Vacaciones, Mantenimiento)", text: $reason)
                        .textInputAutocapitalization(.sentences)
                }
            }
            .navigationTitle("Agregar Bloqueo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancelar") { dismiss() }
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
                            dismiss()
                        }
                    }
                    .fontWeight(.semibold)
                    .disabled(isSubmitting)
                }
            }
        }
    }
}

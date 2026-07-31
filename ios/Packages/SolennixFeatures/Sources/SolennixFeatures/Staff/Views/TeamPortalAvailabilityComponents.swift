import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - TeamPortalAvailabilitySection

/// "Mi disponibilidad" blocked-dates form. The form fields live as `@State` on
/// the parent view, so this component receives them as bindings plus the view
/// model (for unavailable-dates list + save/delete) and save/reset callbacks.
struct TeamPortalAvailabilitySection: View {
    @Binding var startDate: Date
    @Binding var endDate: Date
    @Binding var startTime: String
    @Binding var endTime: String
    @Binding var reason: String
    @Binding var editingID: String?

    /// Current blocked dates, sorted for display.
    let unavailableDates: [UnavailableDate]
    let isSaving: Bool

    /// `true` when editing an existing block (drives the button label + Cancel).
    var isEditing: Bool { editingID != nil }

    /// Persist (create or update) using the bound form fields.
    let onSave: () -> Void
    /// Reset the form back to defaults / exit edit mode.
    let onReset: () -> Void
    /// Begin editing an existing blocked date.
    let onEdit: (UnavailableDate) -> Void
    /// Delete a blocked date by id.
    let onDelete: (String) -> Void

    var body: some View {
        Text(teamPortalTr("team_portal.my_availability", "Mi disponibilidad"))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(SolennixColors.textSecondary)

        cardContainer {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                DatePicker(teamPortalTr("calendar.block.start_date", "Desde"), selection: $startDate, displayedComponents: .date)
                DatePicker(teamPortalTr("calendar.block.end_date", "Hasta"), selection: $endDate, in: startDate..., displayedComponents: .date)
                TextField(teamPortalTr("team_portal.start_time", "Hora inicio (HH:MM)"), text: $startTime)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField(teamPortalTr("team_portal.end_time", "Hora fin (HH:MM)"), text: $endTime)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField(teamPortalTr("calendar.block.reason_label", "Motivo (opcional)"), text: $reason)
                    .textFieldStyle(.roundedBorder)

                Button {
                    onSave()
                } label: {
                    Text(isEditing ? teamPortalTr("common.save_changes", "Guardar cambios") : teamPortalTr("team_portal.block_dates", "Bloquear fechas"))
                        .font(.footnote.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
                .disabled(isSaving)

                if isEditing {
                    Button {
                        onReset()
                    } label: {
                        Text(teamPortalTr("common.cancel", "Cancelar"))
                            .font(.footnote.weight(.semibold))
                    }
                    .buttonStyle(.bordered)
                    .disabled(isSaving)
                }

                if unavailableDates.isEmpty {
                    Text(teamPortalTr("team_portal.no_blocks", "No tenes bloqueos cargados."))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                } else {
                    ForEach(unavailableDates) { item in
                        UnavailableDateRow(
                            item: item,
                            isSaving: isSaving,
                            onEdit: { onEdit(item) },
                            onDelete: { onDelete(item.id) }
                        )
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func cardContainer<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .solennixCard(radius: CornerRadius.lg, border: false)
    }
}

// MARK: - UnavailableDateRow

/// One blocked-date row with optional time/reason + edit/delete actions.
struct UnavailableDateRow: View {
    let item: UnavailableDate
    let isSaving: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(item.startDate) - \(item.endDate)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(SolennixColors.text)
                if let startTime = item.startTime, let endTime = item.endTime {
                    Text("\(startTime) - \(endTime)")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                if let reason = item.reason, !reason.isEmpty {
                    Text(reason)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            Spacer()
            Button {
                onEdit()
            } label: {
                Text(teamPortalTr("common.edit", "Editar"))
                    .font(.caption.weight(.semibold))
            }
            .buttonStyle(.bordered)
            .disabled(isSaving)

            Button(role: .destructive) {
                onDelete()
            } label: {
                Text(teamPortalTr("common.delete", "Eliminar"))
                    .font(.caption.weight(.semibold))
            }
            .buttonStyle(.bordered)
            .disabled(isSaving)
        }
    }
}

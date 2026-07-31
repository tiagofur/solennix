import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - TeamPortalAssignmentDetailHeaderSection

/// Event + Assignment info sections of the execution detail sheet.
/// Pure presentational component over an assignment's static metadata.
struct TeamPortalAssignmentDetailHeaderSection: View {
    let assignment: TeamMemberAssignment

    var body: some View {
        Section(teamPortalTr("team_portal.event_section", "Evento")) {
            detailRow(teamPortalTr("clients.form.name", "Nombre"), assignment.eventName)
            detailRow(teamPortalTr("team_portal.date_label", "Fecha"), assignment.eventDate)
            if let locationLabel {
                detailRow(teamPortalTr("team_portal.location_label", "Ubicación"), locationLabel)
            }
            if let mapsURL {
                Link(teamPortalTr("team_portal.open_maps", "Abrir en mapas"), destination: mapsURL)
            }
            if let organizerNotes = assignment.organizerNotes, !organizerNotes.isEmpty {
                detailRow(teamPortalTr("team_portal.organizer_notes", "Notas del organizador"), organizerNotes)
            }
        }

        Section(teamPortalTr("team_portal.assignment_section", "Asignación")) {
            detailRow(teamPortalTr("team_portal.status_label", "Estado"), statusLabel)
            if let role = assignment.roleOverride {
                detailRow(teamPortalTr("team_portal.role_label", "Rol"), role)
            }
            if let notes = assignment.notes {
                detailRow(teamPortalTr("team_portal.notes_section", "Notas"), notes)
            }
            if let contactLabel {
                detailRow(teamPortalTr("team_portal.operational_contact", "Contacto operativo"), contactLabel)
            }
        }
    }

    private var statusLabel: String {
        switch assignment.status {
        case .pending: return teamPortalTr("team_portal.pending", "Pendiente")
        case .confirmed: return teamPortalTr("team_portal.confirmed", "Confirmada")
        case .declined: return teamPortalTr("team_portal.declined", "Rechazada")
        case .cancelled: return teamPortalTr("team_portal.cancelled", "Cancelada")
        }
    }

    private var locationLabel: String? {
        var parts: [String] = []
        for value in [assignment.location, assignment.city] {
            guard let value else { continue }
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            parts.append(trimmed)
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private var mapsURL: URL? {
        guard let locationLabel else { return nil }
        return URL(string: "https://www.google.com/maps/search/?api=1&query=\(locationLabel.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")
    }

    private var contactLabel: String? {
        var parts: [String] = []
        for value in [assignment.contactName, assignment.contactPhone] {
            guard let value else { continue }
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            parts.append(trimmed)
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    @ViewBuilder
    private func detailRow(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            Text(value)
                .font(.body)
        }
    }
}

// MARK: - TeamPortalAssignmentExecutionSection

/// Execution checklist + quick notes sections, branching on the assignment's
/// load readiness. Owns the optimistic cache bindings (toggle → instant PUT,
/// note → debounced PUT) via the shared view model.
struct TeamPortalAssignmentExecutionSection: View {
    let assignment: TeamMemberAssignment
    @Bindable var viewModel: TeamMemberPortalViewModel

    private var loadState: TeamMemberPortalViewModel.ExecutionLoadState {
        viewModel.executionLoadStates[assignment.eventStaffId] ?? .idle
    }

    private var isEditingEnabled: Bool {
        viewModel.isExecutionEditingEnabled(for: assignment)
    }

    private var executionError: String? {
        viewModel.executionErrorMessages[assignment.eventStaffId]
    }

    @ViewBuilder
    var body: some View {
        if let executionError, loadState != .failed {
            // Save / note-length errors for THIS assignment only (#875).
            // Load failures use the dedicated failed section below (correct retry).
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text(executionError)
                        .font(.footnote)
                        .foregroundStyle(SolennixColors.error)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if loadState == .ready {
                        Button(teamPortalTr("team_portal.retry", "Reintentar")) {
                            Task {
                                await viewModel.persistExecutionState(
                                    for: assignment,
                                    debounce: false
                                )
                            }
                        }
                        .accessibilityIdentifier("team_portal.execution_save_retry")
                    }
                }
                .accessibilityIdentifier("team_portal.execution_error")
            }
        }

        switch loadState {
        case .idle, .loading:
            Section(teamPortalTr("events.detail.documents.checklist", "Checklist")) {
                HStack {
                    ProgressView()
                    Text(teamPortalTr("team_portal.execution_loading", "Cargando checklist…"))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .accessibilityIdentifier("team_portal.execution_loading")
            }
        case .failed:
            Section(teamPortalTr("events.detail.documents.checklist", "Checklist")) {
                Text(
                    executionError
                        ?? teamPortalTr(
                            "team_portal.execution_load_error",
                            "No pudimos cargar el checklist de ejecución."
                        )
                )
                .font(.footnote)
                .foregroundStyle(SolennixColors.error)
                Button(teamPortalTr("team_portal.retry", "Reintentar")) {
                    Task { await viewModel.loadExecutionState(for: assignment) }
                }
                .accessibilityIdentifier("team_portal.execution_retry")
            }
        case .ready:
            Section(teamPortalTr("events.detail.documents.checklist", "Checklist")) {
                Toggle(teamPortalTr("team_portal.arrival_ready", "Llegada y acceso confirmados"), isOn: checklistBinding(\.checklist.arrival))
                Toggle(teamPortalTr("team_portal.material_ready", "Material y montaje listos"), isOn: checklistBinding(\.checklist.materials))
                Toggle(teamPortalTr("team_portal.closing_done", "Cierre operativo completado"), isOn: checklistBinding(\.checklist.closing))
            }
            .disabled(!isEditingEnabled)

            Section(teamPortalTr("team_portal.quick_notes", "Notas rápidas")) {
                TextEditor(text: noteBinding)
                    .frame(minHeight: 110)
                    .disabled(!isEditingEnabled)
            }
        }
    }

    /// Checklist toggles write the local cache synchronously, then persist immediately.
    private func checklistBinding(_ keyPath: WritableKeyPath<AssignmentExecutionState, Bool>) -> Binding<Bool> {
        Binding(
            get: { viewModel.executionStates[assignment.eventStaffId, default: .defaultState][keyPath: keyPath] },
            set: { newValue in
                guard viewModel.isExecutionEditingEnabled(for: assignment) else { return }
                var state = viewModel.executionStates[assignment.eventStaffId, default: .defaultState]
                state[keyPath: keyPath] = newValue
                // Sync cache write BEFORE any Task so multi-field edits never clobber.
                viewModel.applyLocalExecutionState(state, for: assignment)
                Task { await viewModel.persistExecutionState(for: assignment, debounce: false) }
            }
        )
    }

    /// Quick notes write the local cache synchronously; PUT is debounced ~400ms.
    private var noteBinding: Binding<String> {
        Binding(
            get: { viewModel.executionStates[assignment.eventStaffId, default: .defaultState].quickNote },
            set: { newValue in
                guard viewModel.isExecutionEditingEnabled(for: assignment) else { return }
                var state = viewModel.executionStates[assignment.eventStaffId, default: .defaultState]
                state.quickNote = newValue
                viewModel.applyLocalExecutionState(state, for: assignment)
                Task { await viewModel.persistExecutionState(for: assignment, debounce: true) }
            }
        )
    }
}

// MARK: - TeamPortalAssignmentDetailSheet

/// Sheet orchestrator that loads execution state on appear and composes the
/// header + execution sections inside a navigation list.
struct TeamPortalAssignmentDetailSheet: View {
    let assignment: TeamMemberAssignment
    @Bindable var viewModel: TeamMemberPortalViewModel

    var body: some View {
        NavigationStack {
            List {
                TeamPortalAssignmentDetailHeaderSection(assignment: assignment)
                TeamPortalAssignmentExecutionSection(assignment: assignment, viewModel: viewModel)
            }
            .navigationTitle(teamPortalTr("events.detail.title", "Detalle del evento"))
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.loadExecutionState(for: assignment)
            }
        }
    }
}

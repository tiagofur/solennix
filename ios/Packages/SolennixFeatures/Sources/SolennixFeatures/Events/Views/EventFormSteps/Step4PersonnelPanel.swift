import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Step 4: Personnel Panel

/// Subpanel dentro del Step 4 del form de eventos. Permite elegir
/// colaboradores de la libreta de Personal y definir el costo por evento.
/// NO es un Step 5 — vive dentro de Step 4 bajo supplies + equipment.
struct Step4PersonnelPanel: View {

    @Bindable var viewModel: EventFormViewModel

    @State private var showStaffPicker = false
    @State private var showTeamPicker = false
    @State private var staffSearch = ""
    @State private var expandedShiftRow: UUID?

    /// Cache de equipos del organizador (se carga on-demand al abrir el picker).
    @State private var teams: [StaffTeam] = []
    @State private var isLoadingTeams: Bool = false

    /// Cachea la disponibilidad del dia del evento. Vive aca (no en el VM del
    /// form) para no contaminar la logica del form con datos de solo lectura.
    @State private var availabilityVM: StaffAvailabilityViewModel?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Personal")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            // Selected staff
            ForEach(Array(viewModel.selectedStaff.enumerated()), id: \.element.id) { index, assignment in
                staffRow(assignment: assignment, index: index)
            }

            // Add staff / team buttons
            HStack(spacing: Spacing.sm) {
                Button {
                    showStaffPicker = true
                } label: {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "person.crop.circle.badge.plus")
                            .foregroundStyle(SolennixColors.primary)

                        Text("Agregar Personal")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.primary)

                        Spacer()
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.primaryLight)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.primary.opacity(0.3), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)

                Button {
                    showTeamPicker = true
                    Task { await loadTeamsIfNeeded() }
                } label: {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "person.3.fill")
                            .foregroundStyle(SolennixColors.primary)

                        Text("Agregar equipo completo")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.primary)

                        Spacer()
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.primary.opacity(0.3), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }

            // Staff cost total (informativo — no suma al total en Phase 1)
            if !viewModel.selectedStaff.isEmpty {
                HStack {
                    Text("Costo Personal")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Spacer()

                    Text(formatCurrency(viewModel.staffCost))
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)
                }
                .padding(Spacing.md)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
        .sheet(isPresented: $showStaffPicker) {
            staffPickerSheet
        }
        .sheet(isPresented: $showTeamPicker) {
            teamPickerSheet
        }
        .task(id: viewModel.eventDate) {
            await refreshAvailability()
        }
    }

    // MARK: - Team Picker

    private var teamPickerSheet: some View {
        NavigationStack {
            Group {
                if isLoadingTeams && teams.isEmpty {
                    ProgressView("Cargando equipos...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if teams.isEmpty {
                    EmptyStateView(
                        icon: "person.3.sequence",
                        title: "Sin equipos todavia",
                        message: "Agrupa a tu equipo de meseros o fotografos desde Personal > Equipos para asignarlos con un solo toque."
                    )
                } else {
                    List {
                        Section {
                            Text("Seleccioná un equipo para asignar a todos sus miembros. Los que ya esten asignados se ignoran.")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        ForEach(teams) { team in
                            Button {
                                let added = viewModel.addStaffTeam(team)
                                HapticsHelper.play(added > 0 ? .success : .warning)
                                showTeamPicker = false
                            } label: {
                                HStack(spacing: Spacing.md) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: CornerRadius.md)
                                            .fill(SolennixColors.primaryLight)
                                            .frame(width: 40, height: 40)
                                        Image(systemName: "person.3.fill")
                                            .font(.subheadline)
                                            .foregroundStyle(SolennixColors.primary)
                                    }

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(team.name)
                                            .font(.body)
                                            .fontWeight(.semibold)
                                            .foregroundStyle(SolennixColors.text)

                                        HStack(spacing: Spacing.sm) {
                                            if let role = team.roleLabel, !role.isEmpty {
                                                Text(role)
                                                    .font(.caption)
                                                    .foregroundStyle(SolennixColors.textSecondary)
                                            }
                                            if let count = team.memberCount {
                                                Text(count == 1 ? "1 miembro" : "\(count) miembros")
                                                    .font(.caption)
                                                    .foregroundStyle(SolennixColors.textTertiary)
                                            }
                                        }
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textTertiary)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Agregar equipo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cerrar") { showTeamPicker = false }
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
    }

    private func loadTeamsIfNeeded() async {
        // Siempre que se abre el picker refrescamos — asi el usuario ve los
        // cambios hechos en el catalogo sin salir del form.
        isLoadingTeams = true
        defer { isLoadingTeams = false }
        do {
            // Listado liviano — para el detalle de miembros llamamos por ID.
            let list = try await viewModel.apiClient.listStaffTeams()
            // Hidratamos miembros por cada team (N requests pero N suele ser chico).
            var hydrated: [StaffTeam] = []
            for t in list {
                if let full = try? await viewModel.apiClient.getStaffTeam(id: t.id) {
                    hydrated.append(full)
                } else {
                    hydrated.append(t)
                }
            }
            teams = hydrated
        } catch {
            teams = []
        }
    }

    // MARK: - Staff Row

    private func staffRow(assignment: SelectedStaffAssignment, index: Int) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Avatar(name: assignment.staffName.isEmpty ? "?" : assignment.staffName, photoURL: nil, size: 36)

                VStack(alignment: .leading, spacing: 2) {
                    Text(assignment.staffName)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)

                    if let role = assignment.staffRoleLabel, !role.isEmpty {
                        Text(role)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()

                statusMenu(index: index, current: assignment.status)

                Button {
                    viewModel.removeStaff(at: index)
                } label: {
                    Image(systemName: "trash")
                        .font(.body)
                        .foregroundStyle(SolennixColors.error)
                }
                .buttonStyle(.plain)
            }

            // Fee amount
            VStack(alignment: .leading, spacing: 2) {
                Text("Costo (MXN)")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)

                TextField("0.00", value: $viewModel.selectedStaff[index].feeAmount, format: .number.precision(.fractionLength(2)))
                    .keyboardType(.decimalPad)
                    .font(.body)
                    .foregroundStyle(SolennixColors.text)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 6)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.sm)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
            }

            // Role override (opcional — para este evento solamente)
            VStack(alignment: .leading, spacing: 2) {
                Text("Rol en este evento (opcional)")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)

                TextField("Ej: Lider de barra", text: $viewModel.selectedStaff[index].roleOverride)
                    .font(.body)
                    .foregroundStyle(SolennixColors.text)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 6)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.sm)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
            }

            // Notes
            VStack(alignment: .leading, spacing: 2) {
                Text("Notas (opcional)")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)

                TextField("Notas de la asignacion", text: $viewModel.selectedStaff[index].notes)
                    .font(.body)
                    .foregroundStyle(SolennixColors.text)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 6)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.sm)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
            }

            shiftDisclosure(index: index, assignment: assignment)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
    }

    // MARK: - Status Menu

    private func statusMenu(index: Int, current: AssignmentStatus) -> some View {
        Menu {
            ForEach(AssignmentStatus.allCases, id: \.self) { option in
                Button {
                    viewModel.selectedStaff[index].status = option
                } label: {
                    if option == current {
                        Label(label(for: option), systemImage: "checkmark")
                    } else {
                        Text(label(for: option))
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Circle()
                    .fill(color(for: current))
                    .frame(width: 8, height: 8)
                Text(label(for: current))
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(color(for: current))
                Image(systemName: "chevron.down")
                    .font(.caption2)
                    .foregroundStyle(color(for: current))
            }
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 4)
            .background(background(for: current))
            .clipShape(Capsule())
        }
    }

    // MARK: - Shift Disclosure

    private func shiftDisclosure(index: Int, assignment: SelectedStaffAssignment) -> some View {
        let isExpanded = expandedShiftRow == assignment.id
            || assignment.shiftStart != nil
            || assignment.shiftEnd != nil

        return VStack(alignment: .leading, spacing: Spacing.xs) {
            Button {
                withAnimation(.easeInOut(duration: 0.15)) {
                    expandedShiftRow = isExpanded ? nil : assignment.id
                }
            } label: {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.caption2)
                    Text("Agregar horario (opcional)")
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundStyle(SolennixColors.primary)
            }
            .buttonStyle(.plain)

            if isExpanded {
                HStack(spacing: Spacing.sm) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Entra")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                        DatePicker(
                            "",
                            selection: Binding(
                                get: { viewModel.selectedStaff[index].shiftStart ?? defaultShiftStart() },
                                set: { viewModel.selectedStaff[index].shiftStart = $0 }
                            ),
                            displayedComponents: [.hourAndMinute]
                        )
                        .labelsHidden()
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Sale")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                        DatePicker(
                            "",
                            selection: Binding(
                                get: { viewModel.selectedStaff[index].shiftEnd ?? defaultShiftEnd() },
                                set: { viewModel.selectedStaff[index].shiftEnd = $0 }
                            ),
                            displayedComponents: [.hourAndMinute]
                        )
                        .labelsHidden()
                    }

                    Spacer()

                    if assignment.shiftStart != nil || assignment.shiftEnd != nil {
                        Button {
                            viewModel.selectedStaff[index].shiftStart = nil
                            viewModel.selectedStaff[index].shiftEnd = nil
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Staff Picker Sheet

    private var staffPickerSheet: some View {
        NavigationStack {
            Group {
                if viewModel.staff.isEmpty {
                    EmptyStateView(
                        icon: "person.3",
                        title: "Sin personal",
                        message: "Agrega colaboradores desde el menu Personal para asignarlos a este evento"
                    )
                } else {
                    List {
                        ForEach(filteredStaff) { item in
                            Button {
                                viewModel.addStaff(item)
                                showStaffPicker = false
                            } label: {
                                HStack(spacing: Spacing.sm) {
                                    Avatar(name: item.name, photoURL: nil, size: 32)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.name)
                                            .font(.body)
                                            .foregroundStyle(SolennixColors.text)

                                        if let role = item.roleLabel, !role.isEmpty {
                                            Text(role)
                                                .font(.caption)
                                                .foregroundStyle(SolennixColors.textSecondary)
                                        }

                                        if isStaffBusyOnEventDate(item.id) {
                                            HStack(spacing: 4) {
                                                Image(systemName: "clock.badge.exclamationmark")
                                                    .font(.caption2)
                                                Text("Ocupado ese día")
                                                    .font(.caption2)
                                                    .fontWeight(.medium)
                                            }
                                            .foregroundStyle(SolennixColors.warning)
                                        }
                                    }

                                    Spacer()

                                    if viewModel.selectedStaff.contains(where: { $0.staffId == item.id }) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(SolennixColors.success)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .searchable(text: $staffSearch, prompt: "Buscar personal")
                }
            }
            .navigationTitle("Agregar Personal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cerrar") {
                        showStaffPicker = false
                    }
                    .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
    }

    // MARK: - Filtered List

    private var filteredStaff: [Staff] {
        if staffSearch.isEmpty { return viewModel.staff }
        return viewModel.staff.filter {
            $0.name.localizedCaseInsensitiveContains(staffSearch)
            || ($0.roleLabel?.localizedCaseInsensitiveContains(staffSearch) ?? false)
        }
    }

    // MARK: - Availability

    /// Refresca el cache de ocupacion cuando cambia la fecha del evento.
    /// El VM de disponibilidad vive en state local (`@State`) porque su data
    /// solo importa mientras el picker esta abierto.
    private func refreshAvailability() async {
        if availabilityVM == nil {
            availabilityVM = StaffAvailabilityViewModel(apiClient: viewModel.apiClient)
        }
        // Formateamos en el calendario local para evitar que un offset UTC
        // desplace el `YYYY-MM-DD` al dia anterior/siguiente (las fechas del
        // backend viven en tz de usuario, no en UTC puro).
        let components = Calendar.current.dateComponents([.year, .month, .day], from: viewModel.eventDate)
        guard let year = components.year, let month = components.month, let day = components.day else {
            return
        }
        let dateString = String(format: "%04d-%02d-%02d", year, month, day)
        availabilityVM?.reset()
        await availabilityVM?.load(for: dateString)
    }

    private func isStaffBusyOnEventDate(_ staffId: String) -> Bool {
        guard let vm = availabilityVM else { return false }
        // Excluimos el propio evento en edicion — si ya tiene a este staff
        // asignado aca, no queremos marcarlo como conflicto consigo mismo.
        guard let assignments = vm.busyByStaffId[staffId] else { return false }
        let currentEventId = viewModel.editId
        return assignments.contains { a in
            if let currentEventId, a.eventId == currentEventId { return false }
            let s = AssignmentStatus(rawValue: a.status) ?? .confirmed
            return s == .pending || s == .confirmed
        }
    }

    // MARK: - Helpers

    private func defaultShiftStart() -> Date {
        viewModel.startTime ?? viewModel.eventDate
    }

    private func defaultShiftEnd() -> Date {
        viewModel.endTime ?? viewModel.eventDate.addingTimeInterval(3600 * 4)
    }

    private func formatCurrency(_ value: Double) -> String {
        "$\(String(format: "%.2f", value))"
    }

    fileprivate func label(for status: AssignmentStatus) -> String {
        switch status {
        case .pending:   return "Sin confirmar"
        case .confirmed: return "Confirmado"
        case .declined:  return "Rechazó"
        case .cancelled: return "Cancelado"
        }
    }

    fileprivate func color(for status: AssignmentStatus) -> Color {
        switch status {
        case .pending:   return SolennixColors.warning
        case .confirmed: return SolennixColors.success
        case .declined:  return SolennixColors.error
        case .cancelled: return SolennixColors.textTertiary
        }
    }

    fileprivate func background(for status: AssignmentStatus) -> Color {
        switch status {
        case .pending:   return SolennixColors.warningBg
        case .confirmed: return SolennixColors.successBg
        case .declined:  return SolennixColors.errorBg
        case .cancelled: return SolennixColors.surfaceAlt
        }
    }
}

// MARK: - Preview

#Preview("Step 4 Personnel Panel") {
    Step4PersonnelPanel(viewModel: EventFormViewModel(apiClient: APIClient()))
        .padding()
}

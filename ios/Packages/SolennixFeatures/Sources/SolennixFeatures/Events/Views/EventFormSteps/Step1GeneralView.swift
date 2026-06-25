import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Step 1: General Info

struct Step1GeneralView: View {

    @Bindable var viewModel: EventFormViewModel

    @State private var showClientPicker = false
    @State private var showQuickClientSheet = false
    @State private var showDatePickerSheet = false
    @State private var clientSearch = ""

    var body: some View {
        Form {
            clientSection
            scheduleSection
            detailsSection
            notesSection
        }
        .solennixListStyle()
        .scrollDismissesKeyboard(.interactively)
        .sheet(isPresented: $showClientPicker) {
            clientPickerSheet
        }
        .sheet(isPresented: $showDatePickerSheet) {
            datePickerSheet
        }
        .sheet(isPresented: $showQuickClientSheet) {
            QuickClientSheet(apiClient: viewModel.apiClient) { client in
                viewModel.clientId = client.id
                viewModel.clientName = client.name
                // Auto-fill location/city from client if event fields are empty
                if viewModel.location.isEmpty, let address = client.address, !address.isEmpty {
                    viewModel.location = address
                }
                if viewModel.city.isEmpty, let city = client.city, !city.isEmpty {
                    viewModel.city = city
                }
                if !viewModel.clients.contains(where: { $0.id == client.id }) {
                    viewModel.clients.append(client)
                }
            }
        }
    }

    // MARK: - Client Section

    private var clientSection: some View {
        Section {
            Button {
                showClientPicker = true
            } label: {
                HStack {
                    Text(tr("events.form.general.client", "Cliente"))
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(viewModel.clientName.isEmpty
                        ? tr("events.form.general.select_client", "Seleccionar cliente")
                        : viewModel.clientName)
                        .foregroundStyle(viewModel.clientName.isEmpty ? Color.secondary : Color.primary)
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .buttonStyle(.plain)
            .solennixRow()
        }
    }

    // MARK: - Client Picker Sheet

    private var clientPickerSheet: some View {
        NavigationStack {
            List {
                ForEach(filteredClients) { client in
                    Button {
                        viewModel.clientId = client.id
                        viewModel.clientName = client.name
                        // Auto-fill location/city from client if event fields are empty
                        if viewModel.location.isEmpty, let address = client.address, !address.isEmpty {
                            viewModel.location = address
                        }
                        if viewModel.city.isEmpty, let city = client.city, !city.isEmpty {
                            viewModel.city = city
                        }
                        showClientPicker = false
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            Avatar(name: client.name, photoURL: client.photoUrl, size: 36)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(client.name)
                                    .font(.body)
                                    .foregroundStyle(SolennixColors.text)

                                if !client.phone.isEmpty {
                                    Text(client.phone)
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                }
                            }

                            Spacer()

                            if viewModel.clientId == client.id {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(SolennixColors.primary)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .solennixRow()
                }
            }
            .listStyle(.insetGrouped)
            .solennixListStyle()
            .searchable(text: $clientSearch, prompt: tr("events.form.general.search_client", "Buscar cliente"))
            .navigationTitle(tr("events.form.general.select_client_title", "Seleccionar cliente"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(tr("events.form.cancel", "Cancelar")) {
                        showClientPicker = false
                    }
                    .foregroundStyle(SolennixColors.textSecondary)
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showClientPicker = false
                        showQuickClientSheet = true
                    } label: {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "plus")
                            Text(tr("events.form.general.add_client", "Agregar"))
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.primary)
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private var filteredClients: [Client] {
        if clientSearch.isEmpty { return viewModel.clients }
        return viewModel.clients.filter {
            $0.name.localizedCaseInsensitiveContains(clientSearch)
            || $0.phone.localizedCaseInsensitiveContains(clientSearch)
        }
    }

    // MARK: - Schedule Section (date + start/end time)

    private var scheduleSection: some View {
        Section {
            // Fecha — botón full-width que abre la sheet con DatePicker .graphical.
            Button {
                showDatePickerSheet = true
            } label: {
                HStack {
                    Text(tr("events.form.general.event_date", "Fecha del evento"))
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(formattedEventDate)
                        .foregroundStyle(.primary)
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .buttonStyle(.plain)
            .solennixRow()

            // Hora inicio / Hora fin — filas nativas con label a la izquierda.
            OptionalTimePicker(
                selection: $viewModel.startTime,
                placeholder: tr("events.form.general.optional", "Opcional"),
                title: tr("events.form.general.start_time", "Hora inicio"),
                embeddedInForm: true
            )
            .solennixRow()

            OptionalTimePicker(
                selection: $viewModel.endTime,
                placeholder: tr("events.form.general.optional", "Opcional"),
                title: tr("events.form.general.end_time", "Hora fin"),
                embeddedInForm: true
            )
            .solennixRow()
        } header: {
            Text(tr("events.form.general.schedule", "Fecha y horario"))
        }
    }

    private var formattedEventDate: String {
        // eventDate is stored as UTC-midnight (parsed via Date.fromServerDay /
        // stored that way on save). Use formattedServerDayTemplate so the
        // displayed calendar day matches the server yyyy-MM-dd value regardless
        // of the device's UTC offset (fixes -1 day for UTC-negative users).
        viewModel.eventDate.formattedServerDayTemplate("dMMMMyyyy", locale: FeatureL10n.locale)
    }

    // MARK: - Date Picker Sheet

    /// UTC-calendar proxy binding for the graphical DatePicker.
    ///
    /// eventDate is stored as UTC-midnight. The graphical DatePicker renders
    /// using the device calendar (local timezone), so for a UTC-6 user it
    /// would display the prior day. This proxy offsets the Date by the device
    /// UTC-offset delta so the picker's local-calendar view aligns with the
    /// intended UTC calendar day, and reverses the offset on write.
    private var utcEventDateBinding: Binding<Date> {
        Binding(
            get: {
                // eventDate is UTC-midnight; the picker renders in local tz.
                // Counter the local offset so the local-calendar picker lands on
                // the intended UTC day: a UTC-6 device needs +6h so that
                // 2026-06-15T00:00Z displays as June 15 (not June 14) locally.
                let secondsFromGMT = TimeInterval(TimeZone.current.secondsFromGMT(for: viewModel.eventDate))
                return viewModel.eventDate.addingTimeInterval(-secondsFromGMT)
            },
            set: { localPickerDate in
                // Reverse the shift to recover the UTC-midnight instant for the
                // selected local calendar day.
                let secondsFromGMT = TimeInterval(TimeZone.current.secondsFromGMT(for: localPickerDate))
                viewModel.eventDate = localPickerDate.addingTimeInterval(secondsFromGMT)
            }
        )
    }

    private var datePickerSheet: some View {
        NavigationStack {
            DatePicker(
                tr("events.form.general.event_date", "Fecha del evento"),
                selection: utcEventDateBinding,
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .tint(SolennixColors.primary)
            .labelsHidden()
            .padding()
            .navigationTitle(tr("events.form.general.event_date", "Fecha del evento"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(tr("events.form.general.done", "Listo")) { showDatePickerSheet = false }
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Details Section (service type + people + location + city + status)

    private var detailsSection: some View {
        Section {
            TextField(
                tr("events.form.general.service_type", "Tipo de servicio"),
                text: $viewModel.serviceType,
                prompt: Text(tr("events.form.general.service_placeholder", "Ej: Banquete, Coffee Break"))
            )
            .solennixRow()

            if !viewModel.serviceType.isEmpty && viewModel.serviceType.count < 2 {
                Text(tr("events.form.general.service_min", "Mínimo 2 caracteres"))
                    .font(.caption)
                    .foregroundStyle(.red)
                    .solennixRow()
            }

            peopleRow

            TextField(
                tr("events.form.general.location", "Lugar"),
                text: $viewModel.location,
                prompt: Text(tr("events.form.general.location_placeholder", "Lugar del evento (opcional)"))
            )
            .solennixRow()

            TextField(
                tr("events.form.general.city", "Ciudad"),
                text: $viewModel.city,
                prompt: Text(tr("events.form.general.city_placeholder", "Ciudad (opcional)"))
            )
            .solennixRow()

            statusRow
        } header: {
            Text(tr("events.form.general.details", "Detalles"))
        }
    }

    // MARK: - People Row (stepper)

    // Label a la izquierda + stepper compacto a la derecha. La fila del Form
    // provee el fondo, por eso no hay .background/.clipShape/.overlay aquí.
    private var peopleRow: some View {
        HStack {
            Text(tr("events.form.general.people", "Número de personas"))
                .foregroundStyle(.primary)
            Spacer()

            Button {
                if viewModel.numPeople > 1 {
                    viewModel.numPeople -= 1
                }
            } label: {
                Image(systemName: "minus.circle.fill")
                    .font(.title2)
                    .foregroundStyle(viewModel.numPeople > 1 ? SolennixColors.primary : SolennixColors.textTertiary)
            }
            .buttonStyle(.plain)
            .disabled(viewModel.numPeople <= 1)

            EditableQuantityText(
                quantity: $viewModel.numPeople,
                minValue: 1,
                id: "numPeople",
                font: .title3,
                width: 44,
                showTertiaryAtMin: false
            )

            Button {
                viewModel.numPeople += 1
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundStyle(SolennixColors.primary)
            }
            .buttonStyle(.plain)
        }
        .solennixRow()
    }

    // MARK: - Status Row (native Picker .menu)

    private var statusRow: some View {
        Picker(tr("events.form.general.status", "Estado"), selection: $viewModel.status) {
            ForEach(EventStatus.allCases, id: \.self) { status in
                Label(statusLabel(status), systemImage: statusSymbol(status))
                    .tag(status)
            }
        }
        .pickerStyle(.menu)
        .solennixRow()
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        Section {
            // TextField con axis: .vertical es el patrón nativo iOS 16+ para
            // multiline inputs. reservesSpace arranca con la altura de 3 líneas.
            TextField(
                tr("events.form.general.notes_placeholder", "Instrucciones especiales para el montaje..."),
                text: $viewModel.notes,
                axis: .vertical
            )
            .lineLimit(3, reservesSpace: true)
            .solennixRow()
        } header: {
            Text(tr("events.form.general.notes", "Notas adicionales"))
        }
    }

    private func statusSymbol(_ status: EventStatus) -> String {
        switch status {
        case .quoted: return "doc.text"
        case .confirmed: return "checkmark.seal"
        case .completed: return "checkmark.circle"
        case .cancelled: return "xmark.circle"
        }
    }

    private func statusLabel(_ status: EventStatus) -> String {
        switch status {
        case .quoted: return tr("events.detail.status.quoted", "Cotizado")
        case .confirmed: return tr("events.detail.status.confirmed", "Confirmado")
        case .completed: return tr("events.detail.status.completed", "Completado")
        case .cancelled: return tr("events.detail.status.cancelled", "Cancelado")
        }
    }

    private func statusColor(_ status: EventStatus) -> Color {
        switch status {
        case .quoted: return SolennixColors.statusQuoted
        case .confirmed: return SolennixColors.statusConfirmed
        case .completed: return SolennixColors.statusCompleted
        case .cancelled: return SolennixColors.statusCancelled
        }
    }

    private func statusBgColor(_ status: EventStatus) -> Color {
        switch status {
        case .quoted: return SolennixColors.statusQuotedBg
        case .confirmed: return SolennixColors.statusConfirmedBg
        case .completed: return SolennixColors.statusCompletedBg
        case .cancelled: return SolennixColors.statusCancelledBg
        }
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}

// MARK: - Optional Time Picker

/// Botón que muestra la hora formateada (o "Opcional") y al tap abre una sheet
/// con DatePicker.wheel nativo.
///
/// En modo `embeddedInForm` se renderiza sin su chrome (background/border) —
/// la fila del Form provee el fondo. Si se pasa `title`, se usa como label a la
/// izquierda en vez del ícono de reloj (patrón nativo de fila).
private struct OptionalTimePicker: View {
    @Binding var selection: Date?
    let placeholder: String
    var title: String? = nil
    var embeddedInForm: Bool = false

    @State private var showPickerSheet = false
    @State private var draftTime = Date()

    var body: some View {
        Button {
            draftTime = selection ?? Date()
            showPickerSheet = true
        } label: {
            if embeddedInForm {
                rowLabel
            } else {
                rowLabel
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, 14)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
            }
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showPickerSheet) {
            pickerSheet
        }
    }

    @ViewBuilder
    private var rowLabel: some View {
        HStack(spacing: Spacing.sm) {
            if let title {
                Text(title)
                    .foregroundStyle(.primary)
                Spacer()
                Text(displayLabel)
                    .foregroundStyle(selection != nil ? Color.primary : Color.secondary)
            } else {
                Image(systemName: "clock")
                    .font(.body)
                    .foregroundStyle(selection != nil ? SolennixColors.primary : SolennixColors.textTertiary)
                    .frame(width: 20)
                Text(displayLabel)
                    .foregroundStyle(selection != nil ? SolennixColors.text : SolennixColors.textTertiary)
                Spacer()
            }

            if selection != nil {
                Button {
                    selection = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .buttonStyle(.plain)
            } else {
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var displayLabel: String {
        guard let selection else { return placeholder }
        let formatter = DateFormatter()
        formatter.locale = FeatureL10n.locale
        formatter.setLocalizedDateFormatFromTemplate("HHmm")
        return formatter.string(from: selection)
    }

    private var pickerSheet: some View {
        NavigationStack {
            VStack {
                DatePicker(
                    "",
                    selection: $draftTime,
                    displayedComponents: .hourAndMinute
                )
                .datePickerStyle(.wheel)
                .tint(SolennixColors.primary)
                .labelsHidden()
                .padding()

                Spacer()
            }
            .navigationTitle(FeatureL10n.text("events.form.general.time", "Hora"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(FeatureL10n.text("events.form.cancel", "Cancelar")) { showPickerSheet = false }
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(FeatureL10n.text("events.form.general.done", "Listo")) {
                        selection = draftTime
                        showPickerSheet = false
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.height(320)])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Preview

#Preview("Step 1 - General") {
    NavigationStack {
        Step1GeneralView(viewModel: EventFormViewModel(apiClient: APIClient()))
    }
}

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
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Cliente — ancho completo (antes estaba pareado con fecha).
                clientPickerSection

                // Fecha — ancho completo, parity con Android.
                dateSection

                // Hora Inicio / Hora Fin — siempre 2 columnas. Gap central =
                // mismo tamaño que los márgenes laterales (Spacing.md).
                HStack(alignment: .top, spacing: Spacing.md) {
                    timeFieldSection(title: "Hora Inicio", binding: $viewModel.startTime)
                    timeFieldSection(title: "Hora Fin", binding: $viewModel.endTime)
                }

                // Tipo de Servicio + Personas
                HStack(alignment: .top, spacing: Spacing.md) {
                    SolennixTextField(
                        label: "Tipo de Servicio",
                        text: $viewModel.serviceType,
                        placeholder: "Ej: Banquete, Coffee Break",
                        leftIcon: "briefcase",
                        errorMessage: !viewModel.serviceType.isEmpty && viewModel.serviceType.count < 2
                            ? "Minimo 2 caracteres" : nil
                    )
                    peopleSection
                }

                // Lugar + Ciudad — AdaptiveFormRow stackea en phone (son
                // textos largos, no conviene apretar).
                AdaptiveFormRow {
                    SolennixTextField(
                        label: "Lugar",
                        text: $viewModel.location,
                        placeholder: "Lugar del evento (opcional)",
                        leftIcon: "mappin.and.ellipse"
                    )
                } right: {
                    SolennixTextField(
                        label: "Ciudad",
                        text: $viewModel.city,
                        placeholder: "Ciudad (opcional)",
                        leftIcon: "building.2"
                    )
                }

                // Estado — ancho completo (Menu dropdown).
                statusSection

                // Notas adicionales — multiline, 3 líneas mínimo. Parity
                // cross-platform con Android que ya tiene este campo.
                notesSection
            }
            .padding(Spacing.md)
        }
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

    // MARK: - Client Picker Section

    private var clientPickerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Cliente")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            Button {
                showClientPicker = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "person")
                        .font(.body)
                        .foregroundStyle(SolennixColors.textTertiary)
                        .frame(width: 20)

                    Text(viewModel.clientName.isEmpty ? "Seleccionar cliente" : viewModel.clientName)
                        .font(.body)
                        .foregroundStyle(viewModel.clientName.isEmpty ? SolennixColors.textTertiary : SolennixColors.text)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 14)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(viewModel.clientId.isEmpty ? SolennixColors.border : SolennixColors.primary, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
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
                }
            }
            .searchable(text: $clientSearch, prompt: "Buscar cliente")
            .navigationTitle("Seleccionar Cliente")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancelar") {
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
                            Text("Agregar")
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.primary)
                    }
                }
            }
        }
    }

    private var filteredClients: [Client] {
        if clientSearch.isEmpty { return viewModel.clients }
        return viewModel.clients.filter {
            $0.name.localizedCaseInsensitiveContains(clientSearch)
            || $0.phone.localizedCaseInsensitiveContains(clientSearch)
        }
    }

    // MARK: - Date Section

    private var dateSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Fecha del Evento")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            // Botón full-width con la fecha formateada (parity con Android).
            // Al tap abre una sheet con DatePicker .graphical nativo. Esto da
            // área de toque grande y texto legible en vez del botón compact
            // chiquito que iOS pone por default.
            Button {
                showDatePickerSheet = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "calendar")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .frame(width: 20)

                    Text(formattedEventDate)
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 14)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.border, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
        }
    }

    private var formattedEventDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale.autoupdatingCurrent
        formatter.setLocalizedDateFormatFromTemplate("dMMMMyyyy")
        return formatter.string(from: viewModel.eventDate)
    }

    // MARK: - Date Picker Sheet

    private var datePickerSheet: some View {
        NavigationStack {
            DatePicker(
                "Fecha del Evento",
                selection: $viewModel.eventDate,
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .tint(SolennixColors.primary)
            .labelsHidden()
            .padding()
            .navigationTitle("Fecha del Evento")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Listo") { showDatePickerSheet = false }
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Time Field (reutilizable por cada media columna)

    private func timeFieldSection(title: String, binding: Binding<Date?>) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            OptionalTimePicker(
                selection: binding,
                placeholder: "Opcional"
            )
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Notas Adicionales")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            // TextField con axis: .vertical es el patrón nativo iOS 16+ para
            // multiline inputs. reservesSpace hace que el field arranque ya
            // con la altura de 3 líneas aunque esté vacío.
            TextField(
                "Instrucciones especiales para el montaje...",
                text: $viewModel.notes,
                axis: .vertical
            )
            .lineLimit(3, reservesSpace: true)
            .font(.body)
            .foregroundStyle(SolennixColors.text)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(SolennixColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(SolennixColors.border, lineWidth: 1)
            )
        }
    }

    // MARK: - People Section

    private var peopleSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Numero de Personas")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            // Altura pareja con SolennixTextField (padding vertical 14 +
            // icon 22pt ≈ 50pt). Hit area del botón cubre toda la zona
            // horizontal hasta el número — el dedo pega fácil aunque el
            // glyph sea moderado.
            HStack(spacing: 0) {
                Button {
                    if viewModel.numPeople > 0 {
                        viewModel.numPeople -= 1
                    }
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(viewModel.numPeople > 0 ? SolennixColors.primary : SolennixColors.textTertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(viewModel.numPeople <= 0)

                Text("\(viewModel.numPeople)")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(viewModel.numPeople == 0 ? SolennixColors.textTertiary : SolennixColors.text)
                    .frame(minWidth: 40)

                Button {
                    viewModel.numPeople += 1
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(SolennixColors.primary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
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

    // MARK: - Status Section
    //
    // Picker con .menu style = native iOS dropdown compacto. Antes eran 4 pills
    // que apretaban el espacio horizontal junto con numPeople en iPhone base.

    private var statusSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Estado")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            Menu {
                Picker("Estado", selection: $viewModel.status) {
                    ForEach(EventStatus.allCases, id: \.self) { status in
                        Label(statusLabel(status), systemImage: statusSymbol(status))
                            .tag(status)
                    }
                }
            } label: {
                HStack(spacing: Spacing.sm) {
                    Circle()
                        .fill(statusColor(viewModel.status))
                        .frame(width: 10, height: 10)
                    Text(statusLabel(viewModel.status))
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 14)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.border, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
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
        case .quoted: return "Cotizado"
        case .confirmed: return "Confirmado"
        case .completed: return "Completado"
        case .cancelled: return "Cancelado"
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
}

// MARK: - Optional Time Picker

/// Botón full-width que muestra la hora formateada (o "Opcional") y al tap
/// abre una sheet con DatePicker.wheel nativo. Mismo patrón que dateSection.
private struct OptionalTimePicker: View {
    @Binding var selection: Date?
    let placeholder: String

    @State private var showPickerSheet = false
    @State private var draftTime = Date()

    var body: some View {
        Button {
            draftTime = selection ?? Date()
            showPickerSheet = true
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "clock")
                    .font(.body)
                    .foregroundStyle(selection != nil ? SolennixColors.primary : SolennixColors.textTertiary)
                    .frame(width: 20)

                Text(displayLabel)
                    .font(.body)
                    .foregroundStyle(selection != nil ? SolennixColors.text : SolennixColors.textTertiary)

                Spacer()

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
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 14)
            .background(SolennixColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(SolennixColors.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showPickerSheet) {
            pickerSheet
        }
    }

    private var displayLabel: String {
        guard let selection else { return placeholder }
        let formatter = DateFormatter()
        formatter.locale = Locale.autoupdatingCurrent
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
            .navigationTitle("Hora")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancelar") { showPickerSheet = false }
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Listo") {
                        selection = draftTime
                        showPickerSheet = false
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.height(320)])
    }
}

// MARK: - Preview

#Preview("Step 1 - General") {
    NavigationStack {
        Step1GeneralView(viewModel: EventFormViewModel(apiClient: APIClient()))
    }
}

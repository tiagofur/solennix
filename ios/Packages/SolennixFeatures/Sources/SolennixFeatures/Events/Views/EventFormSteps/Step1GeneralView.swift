import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Step 1: General Info

struct Step1GeneralView: View {

    @Bindable var viewModel: EventFormViewModel

    @State private var showClientPicker = false
    @State private var showQuickClientSheet = false
    @State private var clientSearch = ""

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Client picker
                clientPickerSection

                // Event date
                dateSection

                // Times
                timeSection

                // Service type
                SolennixTextField(
                    label: "Tipo de Servicio",
                    text: $viewModel.serviceType,
                    placeholder: "Ej: Banquete, Coffee Break",
                    leftIcon: "briefcase",
                    errorMessage: !viewModel.serviceType.isEmpty && viewModel.serviceType.count < 2
                        ? "Minimo 2 caracteres" : nil
                )

                // Number of people
                peopleSection

                // Status picker
                statusSection

                // Location
                SolennixTextField(
                    label: "Lugar",
                    text: $viewModel.location,
                    placeholder: "Lugar del evento (opcional)",
                    leftIcon: "mappin.and.ellipse"
                )

                // City
                SolennixTextField(
                    label: "Ciudad",
                    text: $viewModel.city,
                    placeholder: "Ciudad (opcional)",
                    leftIcon: "building.2"
                )
            }
            .padding(Spacing.md)
        }
        .sheet(isPresented: $showClientPicker) {
            clientPickerSheet
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

            DatePicker(
                "Fecha",
                selection: $viewModel.eventDate,
                displayedComponents: .date
            )
            .datePickerStyle(.compact)
            .tint(SolennixColors.primary)
            .labelsHidden()
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

    // MARK: - Time Section

    private var timeSection: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Hora Inicio")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                OptionalTimePicker(
                    selection: $viewModel.startTime,
                    placeholder: "Opcional"
                )
            }

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Hora Fin")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                OptionalTimePicker(
                    selection: $viewModel.endTime,
                    placeholder: "Opcional"
                )
            }
        }
    }

    // MARK: - People Section

    private var peopleSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Numero de Personas")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            HStack(spacing: Spacing.md) {
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

                Text("\(viewModel.numPeople)")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                    .frame(minWidth: 40)

                Button {
                    viewModel.numPeople += 1
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(SolennixColors.primary)
                }
                .buttonStyle(.plain)

                Spacer()
            }
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

    // MARK: - Status Section

    private var statusSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Estado")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            HStack(spacing: Spacing.sm) {
                ForEach(EventStatus.allCases, id: \.self) { status in
                    Button {
                        viewModel.status = status
                    } label: {
                        Text(statusLabel(status))
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(viewModel.status == status ? statusColor(status) : SolennixColors.textTertiary)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xs)
                            .background(viewModel.status == status ? statusBgColor(status) : SolennixColors.surfaceAlt)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.sm)
                                    .stroke(viewModel.status == status ? statusColor(status).opacity(0.3) : Color.clear, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
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

private struct OptionalTimePicker: View {
    @Binding var selection: Date?
    let placeholder: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            if let binding = Binding($selection) {
                DatePicker("", selection: binding, displayedComponents: .hourAndMinute)
                    .datePickerStyle(.compact)
                    .tint(SolennixColors.primary)
                    .labelsHidden()

                Button {
                    selection = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .buttonStyle(.plain)
            } else {
                Button {
                    selection = Date()
                } label: {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "clock")
                            .foregroundStyle(SolennixColors.textTertiary)
                        Text(placeholder)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    .font(.body)
                }
                .buttonStyle(.plain)
            }
        }
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

// MARK: - Preview

#Preview("Step 1 - General") {
    NavigationStack {
        Step1GeneralView(viewModel: EventFormViewModel(apiClient: APIClient()))
    }
}

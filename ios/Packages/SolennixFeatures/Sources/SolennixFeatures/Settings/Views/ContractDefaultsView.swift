import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Contract Defaults View

public struct ContractDefaultsView: View {

    @State private var viewModel: BusinessSettingsViewModel
    @State private var showVariablePicker = false
    @State private var templateCoordinator: ContractTemplateTextView.Coordinator?
    @Environment(\.dismiss) private var dismiss

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: BusinessSettingsViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                formContent
            }
        }
        .navigationTitle("Valores del Contrato")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                saveButton
            }
        }
        .sheet(isPresented: $showVariablePicker) {
            ContractVariablePickerSheet { variable in
                templateCoordinator?.insertVariable(variable.label)
                showVariablePicker = false
            }
            .presentationDetents([.medium, .large])
        }
        .task { await viewModel.loadUser() }
    }

    // MARK: - Form Content

    private var formContent: some View {
        Form {
            // Deposit section
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Text("Porcentaje de anticipo")
                        Spacer()
                        Text("\(Int(viewModel.depositPercent))%")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Slider(value: $viewModel.depositPercent, in: 0...100, step: 5) {
                        Text("Anticipo")
                    }
                }
            } header: {
                Text("Anticipo")
            } footer: {
                Text("Porcentaje del total que solicitas como anticipo al confirmar un evento.")
            }

            // Cancellation section
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Text("Dias de anticipacion")
                        Spacer()
                        Text("\(Int(viewModel.cancellationDays)) dias")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Slider(value: $viewModel.cancellationDays, in: 1...30, step: 1) {
                        Text("Dias")
                    }
                }
            } header: {
                Text("Cancelacion")
            } footer: {
                Text("Numero minimo de dias antes del evento para permitir cancelacion con reembolso.")
            }

            // Refund section
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Text("Porcentaje de reembolso")
                        Spacer()
                        Text("\(Int(viewModel.refundPercent))%")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Slider(value: $viewModel.refundPercent, in: 0...100, step: 5) {
                        Text("Reembolso")
                    }
                }
            } header: {
                Text("Reembolso")
            } footer: {
                Text("Porcentaje del anticipo que devuelves en caso de cancelacion dentro del plazo permitido.")
            }

            // Contract template section
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Button {
                        showVariablePicker = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                            Text("Insertar Variable")
                        }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.primary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(SolennixColors.primaryLight)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .buttonStyle(.plain)

                    ContractTemplateTextView(
                        text: $viewModel.contractTemplate,
                        onCoordinatorReady: { coordinator in
                            templateCoordinator = coordinator
                        }
                    )
                    .frame(height: 250)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                }
            } header: {
                Text("Plantilla del Contrato")
            } footer: {
                Text("Las variables como [Nombre del cliente] se reemplazan automaticamente con los datos del evento al generar el contrato.")
            }

            // Preview section
            Section {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Vista previa de terminos")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        previewRow(label: "Anticipo requerido", value: "\(Int(viewModel.depositPercent))% del total")
                        previewRow(label: "Cancelacion sin penalizacion", value: "\(Int(viewModel.cancellationDays)) dias antes")
                        previewRow(label: "Reembolso por cancelacion", value: "\(Int(viewModel.refundPercent))% del anticipo")
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
            }

            // Error message
            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                }
            }
        }
    }

    // MARK: - Preview Row

    private func previewRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)
        }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task {
                let success = await viewModel.saveContractDefaults()
                if success {
                    dismiss()
                }
            }
        } label: {
            if viewModel.isSaving {
                ProgressView()
            } else {
                Text("Guardar")
                    .fontWeight(.semibold)
            }
        }
        .disabled(viewModel.isSaving)
    }
}

// MARK: - Contract Variable

struct ContractVariable: Identifiable {
    let id: String // token
    let label: String
    let category: String

    static let all: [ContractVariable] = [
        // Proveedor
        ContractVariable(id: "provider_name", label: "Nombre del proveedor", category: "Proveedor"),
        ContractVariable(id: "provider_business_name", label: "Nombre comercial del proveedor", category: "Proveedor"),
        ContractVariable(id: "provider_email", label: "Email del proveedor", category: "Proveedor"),
        // Evento
        ContractVariable(id: "current_date", label: "Fecha actual", category: "Evento"),
        ContractVariable(id: "event_date", label: "Fecha del evento", category: "Evento"),
        ContractVariable(id: "event_start_time", label: "Hora de inicio", category: "Evento"),
        ContractVariable(id: "event_end_time", label: "Hora de fin", category: "Evento"),
        ContractVariable(id: "event_time_range", label: "Horario del evento", category: "Evento"),
        ContractVariable(id: "event_service_type", label: "Tipo de servicio", category: "Evento"),
        ContractVariable(id: "event_num_people", label: "Número de personas", category: "Evento"),
        ContractVariable(id: "event_location", label: "Lugar del evento", category: "Evento"),
        ContractVariable(id: "event_city", label: "Ciudad del evento", category: "Evento"),
        ContractVariable(id: "event_total_amount", label: "Monto total del evento", category: "Evento"),
        ContractVariable(id: "event_services_list", label: "Servicios del evento", category: "Evento"),
        ContractVariable(id: "event_paid_amount", label: "Total pagado", category: "Evento"),
        // Condiciones
        ContractVariable(id: "event_deposit_percent", label: "Porcentaje de anticipo", category: "Condiciones"),
        ContractVariable(id: "event_refund_percent", label: "Porcentaje de reembolso", category: "Condiciones"),
        ContractVariable(id: "event_cancellation_days", label: "Días de cancelación", category: "Condiciones"),
        // Cliente
        ContractVariable(id: "client_name", label: "Nombre del cliente", category: "Cliente"),
        ContractVariable(id: "client_phone", label: "Teléfono del cliente", category: "Cliente"),
        ContractVariable(id: "client_email", label: "Email del cliente", category: "Cliente"),
        ContractVariable(id: "client_address", label: "Dirección del cliente", category: "Cliente"),
        ContractVariable(id: "client_city", label: "Ciudad del cliente", category: "Cliente"),
        // Contrato
        ContractVariable(id: "contract_city", label: "Ciudad del contrato", category: "Contrato"),
    ]

    static var grouped: [(String, [ContractVariable])] {
        let categories = ["Proveedor", "Evento", "Condiciones", "Cliente", "Contrato"]
        return categories.compactMap { category in
            let items = all.filter { $0.category == category }
            return items.isEmpty ? nil : (category, items)
        }
    }
}

// MARK: - Contract Variable Picker Sheet

private struct ContractVariablePickerSheet: View {

    let onSelect: (ContractVariable) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    Text("Haz clic en una variable para insertarla en tu contrato")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .padding(.horizontal, Spacing.md)

                    ForEach(ContractVariable.grouped, id: \.0) { category, variables in
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text(category)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.textTertiary)
                                .textCase(.uppercase)

                            FlowLayout(spacing: Spacing.xs) {
                                ForEach(variables) { variable in
                                    Button {
                                        onSelect(variable)
                                    } label: {
                                        Text(variable.label)
                                            .font(.caption)
                                            .fontWeight(.medium)
                                            .foregroundStyle(SolennixColors.primary)
                                            .padding(.horizontal, Spacing.sm)
                                            .padding(.vertical, Spacing.xs)
                                            .background(SolennixColors.primaryLight)
                                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                                    .stroke(SolennixColors.primary.opacity(0.3), lineWidth: 1)
                                            )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.md)
                    }
                }
                .padding(.vertical, Spacing.md)
            }
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle("Insertar Variable")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cerrar") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Flow Layout

private struct FlowLayout: Layout {

    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
        for (index, subview) in subviews.enumerated() {
            guard index < result.positions.count else { break }
            let position = result.positions[index]
            subview.place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (positions, CGSize(width: maxX, height: y + rowHeight))
    }
}

// MARK: - Preview

#Preview("Contract Defaults") {
    NavigationStack {
        ContractDefaultsView(apiClient: APIClient())
    }
}

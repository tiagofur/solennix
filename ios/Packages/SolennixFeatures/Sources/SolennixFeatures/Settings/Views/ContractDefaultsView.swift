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
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var initialDepositPercent: Double = 50
    @State private var initialCancellationDays: Double = 7
    @State private var initialRefundPercent: Double = 50
    @State private var initialContractTemplate: String = ""
    @State private var showDiscardConfirm = false

    private var isDirty: Bool {
        viewModel.depositPercent != initialDepositPercent
            || viewModel.cancellationDays != initialCancellationDays
            || viewModel.refundPercent != initialRefundPercent
            || viewModel.contractTemplate != initialContractTemplate
    }

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: BusinessSettingsViewModel(apiClient: apiClient))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView(tr("settings.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                formContent
            }
        }
        .navigationTitle(tr("settings.action.contract_defaults", "Valores del contrato"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(isDirty)
        .confirmationDialog(
            "¿Descartar los cambios sin guardar?",
            isPresented: $showDiscardConfirm,
            titleVisibility: .visible
        ) {
            Button("Descartar cambios", role: .destructive) { dismiss() }
            Button("Seguir editando", role: .cancel) {}
        }
        .toolbar {
            if isDirty {
                ToolbarItem(placement: .topBarLeading) {
                    SolennixCancelButton(title: tr("common.back", "Atrás")) {
                        showDiscardConfirm = true
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                SolennixSaveButton(
                    title: tr("common.save", "Guardar"),
                    action: {
                        Task {
                            let success = await viewModel.saveContractDefaults()
                            if success {
                                dismiss()
                            }
                        }
                    },
                    isValid: true,
                    isSaving: viewModel.isSaving
                )
            }
        }
        .sheet(isPresented: $showVariablePicker) {
            ContractVariablePickerSheet { variable in
                templateCoordinator?.insertVariable(variable.label)
                showVariablePicker = false
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .task {
            await viewModel.loadUser()
            initialDepositPercent = viewModel.depositPercent
            initialCancellationDays = viewModel.cancellationDays
            initialRefundPercent = viewModel.refundPercent
            initialContractTemplate = viewModel.contractTemplate
        }
    }

    // MARK: - Form Content

    private var formContent: some View {
        AdaptiveCenteredContent(maxWidth: 680) {
        Form {
            // Deposit section
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Text(tr("settings.contract.deposit_percent", "Porcentaje de anticipo"))
                        Spacer()
                        Text("\(Int(viewModel.depositPercent))%")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Slider(value: $viewModel.depositPercent, in: 0...100, step: 5) {
                        Text(tr("settings.contract.deposit", "Anticipo"))
                    }
                }
                .solennixRow()
            } header: {
                Text(tr("settings.contract.deposit", "Anticipo"))
            } footer: {
                Text(tr("settings.contract.deposit_hint", "Porcentaje del total que solicitas como anticipo al confirmar un evento."))
            }

            // Cancellation section
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Text(tr("settings.contract.cancellation_days", "Días de anticipación"))
                        Spacer()
                        Text(FeatureL10n.format("settings.contract.cancellation_days_value", "%d días", Int(viewModel.cancellationDays)))
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Slider(value: $viewModel.cancellationDays, in: 1...30, step: 1) {
                        Text(tr("settings.contract.days", "Días"))
                    }
                }
                .solennixRow()
            } header: {
                Text(tr("settings.contract.cancellation", "Cancelación"))
            } footer: {
                Text(tr("settings.contract.cancellation_hint", "Número mínimo de días antes del evento para permitir cancelación con reembolso."))
            }

            // Refund section
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Text(tr("settings.contract.refund_percent", "Porcentaje de reembolso"))
                        Spacer()
                        Text("\(Int(viewModel.refundPercent))%")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Slider(value: $viewModel.refundPercent, in: 0...100, step: 5) {
                        Text(tr("settings.contract.refund", "Reembolso"))
                    }
                }
                .solennixRow()
            } header: {
                Text(tr("settings.contract.refund", "Reembolso"))
            } footer: {
                Text(tr("settings.contract.refund_hint", "Porcentaje del anticipo que devuelves en caso de cancelación dentro del plazo permitido."))
            }

            // Contract template section
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    if !viewModel.canCustomizeContractTemplate {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "lock.fill")
                                .foregroundStyle(SolennixColors.primary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(tr("settings.contract.pro_only", "Función exclusiva del plan Pro"))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(SolennixColors.text)
                                Text(tr("settings.contract.pro_only_hint", "Puedes usar la plantilla predeterminada; personalizarla requiere Pro."))
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                        }
                        .padding(Spacing.sm)
                        .background(SolennixColors.primaryLight)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }

                    Button {
                        showVariablePicker = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                            Text(tr("settings.contract.insert_variable", "Insertar variable"))
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
                    .disabled(!viewModel.canCustomizeContractTemplate)
                    .opacity(viewModel.canCustomizeContractTemplate ? 1 : 0.5)

                    ContractTemplateTextView(
                        text: $viewModel.contractTemplate,
                        isEditable: viewModel.canCustomizeContractTemplate,
                        onCoordinatorReady: { coordinator in
                            templateCoordinator = coordinator
                        }
                    )
                    .frame(height: 450)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                }
                .solennixRow()
            } header: {
                Text(tr("settings.contract.template", "Plantilla del contrato"))
            } footer: {
                Text(tr("settings.contract.template_hint", "Las variables como [Nombre del cliente] se reemplazan automáticamente con los datos del evento al generar el contrato."))
            }

            // Preview section
            Section {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text(tr("settings.contract.preview_terms", "Vista previa de términos"))
                        .font(.subheadline)
                        .fontWeight(.medium)

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        previewRow(label: tr("settings.contract.preview.deposit_required", "Anticipo requerido"), value: FeatureL10n.format("settings.contract.preview.deposit_percent_value", "%d%% del total", Int(viewModel.depositPercent)))
                        previewRow(label: tr("settings.contract.preview.cancellation", "Cancelación sin penalización"), value: FeatureL10n.format("settings.contract.preview.cancellation_days_value", "%d días antes", Int(viewModel.cancellationDays)))
                        previewRow(label: tr("settings.contract.preview.refund", "Reembolso por cancelación"), value: FeatureL10n.format("settings.contract.preview.refund_percent_value", "%d%% del anticipo", Int(viewModel.refundPercent)))
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
                .solennixRow()
            }

            // Error message
            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                        .solennixRow()
                }
            }
        }
        .solennixListStyle()
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
                    Text(FeatureL10n.text("settings.contract.variable_picker_hint", "Haz clic en una variable para insertarla en tu contrato"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .padding(.horizontal, Spacing.md)

                    ForEach(ContractVariable.grouped, id: \.0) { category, variables in
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text(FeatureL10n.text("settings.contract.category.\(category.lowercased())", category))
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.textTertiary)
                                .textCase(.uppercase)

                            ContractFlowLayout(spacing: Spacing.xs) {
                                ForEach(variables) { variable in
                                    Button {
                                        onSelect(variable)
                                    } label: {
                                        Text(FeatureL10n.text("settings.contract.variable.\(variable.id)", variable.label))
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
            .navigationTitle(FeatureL10n.text("settings.contract.insert_variable", "Insertar variable"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(FeatureL10n.text("common.close", "Cerrar")) { dismiss() }
                }
            }
        }
    }
}

// MARK: - Flow Layout

private struct ContractFlowLayout: Layout {

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

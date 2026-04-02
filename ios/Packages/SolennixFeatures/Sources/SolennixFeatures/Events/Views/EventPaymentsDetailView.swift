import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Payments Detail View

public struct EventPaymentsDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let event = viewModel.event {
                content(event)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "Error",
                    message: viewModel.errorMessage ?? "No se pudo cargar"
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Pagos")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $viewModel.showPaymentSheet) {
            paymentSheet
        }
        .task { await viewModel.loadData(eventId: eventId) }
    }

    private func content(_ event: Event) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Summary KPIs
                HStack(spacing: Spacing.sm) {
                    kpiCard(label: "Total", value: event.totalAmount.asMXN, color: SolennixColors.primary, bgColor: SolennixColors.primaryLight)
                    kpiCard(label: "Pagado", value: viewModel.totalPaid.asMXN, color: SolennixColors.success, bgColor: SolennixColors.successBg)
                    kpiCard(label: "Saldo", value: viewModel.remaining.asMXN,
                            color: viewModel.isFullyPaid ? SolennixColors.success : SolennixColors.error,
                            bgColor: viewModel.isFullyPaid ? SolennixColors.successBg : SolennixColors.errorBg)
                }

                // Progress bar
                VStack(spacing: Spacing.sm) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(SolennixColors.surfaceAlt)
                                .frame(height: 12)

                            RoundedRectangle(cornerRadius: 6)
                                .fill(SolennixColors.primary)
                                .frame(width: geo.size.width * viewModel.progress / 100, height: 12)
                        }
                    }
                    .frame(height: 12)

                    HStack {
                        Text("\(String(format: "%.0f", viewModel.progress))% cobrado")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Spacer()
                    }
                }
                .padding(Spacing.lg)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                .shadowSm()

                // Deposit status
                if let depositPercent = event.depositPercent, depositPercent > 0 {
                    let depositAmount = event.totalAmount * (depositPercent / 100)
                    let isDepositMet = viewModel.totalPaid >= (depositAmount - 0.1)
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: isDepositMet ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                            .font(.title3)
                            .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Anticipo \(Int(depositPercent))%")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.text)
                            Text(isDepositMet ? "Anticipo cubierto" : "Faltan \((depositAmount - viewModel.totalPaid).asMXN)")
                                .font(.caption)
                                .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)
                        }
                        Spacer()
                        Text(depositAmount.asMXN)
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)
                    }
                    .padding(Spacing.lg)
                    .background(isDepositMet ? SolennixColors.successBg : SolennixColors.warningBg)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                }

                // Action buttons
                if viewModel.remaining > 0.01 {
                    HStack(spacing: Spacing.sm) {
                        PremiumButton(title: "Registrar Pago", fullWidth: true) {
                            viewModel.showPaymentSheet = true
                        }

                        PremiumButton(title: "Liquidar \(viewModel.remaining.asMXN)", fullWidth: true) {
                            viewModel.payRemaining()
                        }
                    }
                }

                // Payment history
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Historial de Pagos")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    if viewModel.payments.isEmpty {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "dollarsign.circle")
                                .font(.largeTitle)
                                .foregroundStyle(SolennixColors.textTertiary)
                            Text("No hay pagos registrados")
                                .font(.subheadline)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.xl)
                    } else {
                        ForEach(viewModel.payments) { payment in
                            paymentRow(payment)
                        }
                    }
                }
                .padding(Spacing.lg)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                .shadowSm()
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
    }

    private func kpiCard(label: String, value: String, color: Color, bgColor: Color) -> some View {
        VStack(spacing: Spacing.xs) {
            Text(value)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            Text(label)
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    private func paymentRow(_ payment: Payment) -> some View {
        HStack(spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(formatDate(payment.paymentDate))
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                Text(paymentMethodLabel(payment.paymentMethod))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                if let notes = payment.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }

            Spacer()

            Text(payment.amount.asMXN)
                .font(.body)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.success)

            Button {
                Task { await viewModel.deletePayment(id: payment.id, eventId: eventId) }
            } label: {
                Image(systemName: "trash")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .padding(Spacing.xs)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Payment Sheet

    private var paymentSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                Text("Registrar Pago")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Monto")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    TextField("0.00", text: $viewModel.paymentAmount)
                        .keyboardType(.decimalPad)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Metodo de pago")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.sm) {
                        ForEach(paymentMethods, id: \.key) { method in
                            Button {
                                viewModel.paymentMethod = method.key
                            } label: {
                                Text(method.label)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundStyle(
                                        viewModel.paymentMethod == method.key ? .white : SolennixColors.text
                                    )
                                    .padding(.horizontal, Spacing.md)
                                    .padding(.vertical, Spacing.sm)
                                    .background(
                                        viewModel.paymentMethod == method.key ? SolennixColors.primary : SolennixColors.surface
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Notas (opcional)")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    TextField("Notas del pago", text: $viewModel.paymentNotes)
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }

                Spacer()

                PremiumButton(
                    title: "Guardar Pago",
                    isLoading: viewModel.isSavingPayment,
                    isDisabled: viewModel.paymentAmount.isEmpty
                ) {
                    Task { await viewModel.addPayment(eventId: eventId) }
                }
            }
            .padding(Spacing.lg)
            .background(SolennixColors.background)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { viewModel.showPaymentSheet = false }
                        .foregroundStyle(SolennixColors.primary)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Helpers

    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "es_MX")
        guard let date = formatter.date(from: String(dateString.prefix(10))) else { return dateString }
        let display = DateFormatter()
        display.dateFormat = "d MMM yyyy"
        display.locale = Locale(identifier: "es_MX")
        return display.string(from: date)
    }

    private func paymentMethodLabel(_ method: String) -> String {
        switch method.lowercased() {
        case "efectivo": return "Efectivo"
        case "transferencia": return "Transferencia"
        case "tarjeta": return "Tarjeta"
        case "cheque": return "Cheque"
        default: return method.capitalized
        }
    }

    private var paymentMethods: [(key: String, label: String)] {
        [("efectivo", "Efectivo"), ("transferencia", "Transferencia"), ("tarjeta", "Tarjeta"), ("cheque", "Cheque")]
    }
}

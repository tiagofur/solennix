import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Finances Detail View

public struct EventFinancesDetailView: View {

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
        .navigationTitle("Finanzas")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadData(eventId: eventId) }
    }

    private func content(_ event: Event) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Total prominente
                VStack(spacing: Spacing.xs) {
                    Text("TOTAL COBRADO")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.textTertiary)
                        .textCase(.uppercase)

                    Text(event.totalAmount.asMXN)
                        .font(.largeTitle)
                        .fontWeight(.black)
                        .foregroundStyle(SolennixColors.primary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xl)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                .shadowSm()

                // Financial breakdown
                let subtotal = computeSubtotal(event)
                let discountAmount = computeDiscountAmount(event, subtotal: subtotal)
                let netSales = event.totalAmount - event.taxAmount
                let supplyCost = viewModel.supplies.reduce(0.0) { $0 + ($1.quantity * $1.unitCost) }
                let profit = netSales - supplyCost
                let margin = netSales > 0 ? (profit / netSales) * 100 : 0
                let depositAmount = event.totalAmount * ((event.depositPercent ?? 0) / 100)
                let isDepositMet = viewModel.totalPaid >= (depositAmount - 0.1)

                VStack(spacing: 0) {
                    financialMetricRow(
                        label: "Venta Bruta",
                        value: netSales.asMXN,
                        color: SolennixColors.text
                    )

                    if event.taxAmount > 0 {
                        financialMetricRow(
                            label: "IVA (\(Int(event.taxRate))%)",
                            value: event.taxAmount.asMXN,
                            color: SolennixColors.text
                        )
                    }

                    financialMetricRow(
                        label: "Total Cobrado",
                        value: event.totalAmount.asMXN,
                        color: SolennixColors.primary,
                        isBold: true
                    )

                    if let depositPercent = event.depositPercent, depositPercent > 0 {
                        financialMetricRow(
                            label: "Anticipo (\(Int(depositPercent))%)",
                            value: depositAmount.asMXN,
                            color: isDepositMet ? SolennixColors.success : SolennixColors.warning,
                            icon: isDepositMet ? "checkmark.circle.fill" : "exclamationmark.circle.fill"
                        )
                    }

                    if event.discount > 0 {
                        let discountLabel = event.discountType == .percent
                            ? "Descuento (\(Int(event.discount))%)"
                            : "Descuento"
                        financialMetricRow(
                            label: discountLabel,
                            value: "-\(discountAmount.asMXN)",
                            color: SolennixColors.error
                        )
                    }

                    Divider().padding(.horizontal, Spacing.lg)

                    financialMetricRow(
                        label: "Costos",
                        value: supplyCost.asMXN,
                        color: SolennixColors.error
                    )

                    financialMetricRow(
                        label: "Utilidad Neta",
                        value: profit.asMXN,
                        color: SolennixColors.success,
                        isBold: true
                    )

                    financialMetricRow(
                        label: "Margen",
                        value: "\(String(format: "%.1f", margin))%",
                        color: SolennixColors.info,
                        isBold: true
                    )

                    Divider().padding(.horizontal, Spacing.lg)

                    financialMetricRow(
                        label: "Pagado",
                        value: viewModel.totalPaid.asMXN,
                        color: SolennixColors.success
                    )

                    financialMetricRow(
                        label: "Pendiente",
                        value: viewModel.remaining.asMXN,
                        color: viewModel.remaining > 0 ? SolennixColors.error : SolennixColors.success,
                        isBold: true
                    )
                }
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                .shadowSm()

                // Payment progress
                if event.totalAmount > 0 {
                    VStack(spacing: Spacing.sm) {
                        HStack {
                            Text("Progreso de Cobro")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.text)
                            Spacer()
                            Text("\(String(format: "%.0f", viewModel.progress))%")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.primary)
                        }

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
                            Text(viewModel.totalPaid.asMXN)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.success)
                            Spacer()
                            Text(event.totalAmount.asMXN)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                    }
                    .padding(Spacing.lg)
                    .background(SolennixColors.card)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                    .shadowSm()
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
    }

    private func financialMetricRow(label: String, value: String, color: Color, isBold: Bool = false, icon: String? = nil) -> some View {
        HStack {
            if let icon {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(color)
            }

            Text(label)
                .font(isBold ? .body : .subheadline)
                .fontWeight(isBold ? .semibold : .regular)
                .foregroundStyle(SolennixColors.textSecondary)

            Spacer()

            Text(value)
                .font(isBold ? .body : .subheadline)
                .fontWeight(isBold ? .bold : .medium)
                .foregroundStyle(color)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.sm)
    }

    private func computeSubtotal(_ event: Event) -> Double {
        event.totalAmount - event.taxAmount + (event.discountType == .fixed ? event.discount : 0)
    }

    private func computeDiscountAmount(_ event: Event, subtotal: Double) -> Double {
        event.discountType == .percent
            ? subtotal * event.discount / 100
            : event.discount
    }
}

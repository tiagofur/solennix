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
                ProgressView(EventFinancesDetailStrings.loading)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let event = viewModel.event {
                content(event)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: EventFinancesDetailStrings.errorTitle,
                    message: viewModel.errorMessage ?? EventFinancesDetailStrings.errorMessage
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(EventFinancesDetailStrings.navigationTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(value: Route.eventForm(id: eventId, step: 5)) {
                    Image(systemName: "pencil")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(EventFinancesDetailStrings.editAccessibility)
                }
            }
        }
        .task { await viewModel.loadData(eventId: eventId) }
    }

    private func content(_ event: Event) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Total prominente
                VStack(spacing: Spacing.xs) {
                    Text(EventFinancesDetailStrings.totalCharged)
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

                // Financial breakdown using the shared EventFinancials calculator.
                // This mirrors EventFormViewModel+Profitability and QuickQuoteViewModel
                // via EventFinancials.compute() — single source of truth.
                let financials = computeFinancials(event)
                let discountAmount = financials.discountAmount
                let depositAmount = event.totalAmount * ((event.depositPercent ?? 0) / 100)
                let isDepositMet = viewModel.totalPaid >= (depositAmount - 0.1)

                VStack(spacing: 0) {
                    financialMetricRow(
                        label: EventFinancesDetailStrings.grossSale,
                        value: financials.revenue.asMXN,
                        color: SolennixColors.text
                    )

                    if event.taxAmount > 0 {
                        financialMetricRow(
                            label: EventFinancesDetailStrings.iva(Int(event.taxRate)),
                            value: event.taxAmount.asMXN,
                            color: SolennixColors.text
                        )
                    }

                    financialMetricRow(
                        label: EventFinancesDetailStrings.totalChargedRow,
                        value: event.totalAmount.asMXN,
                        color: SolennixColors.primary,
                        isBold: true
                    )

                    if let depositPercent = event.depositPercent, depositPercent > 0 {
                        financialMetricRow(
                            label: EventFinancesDetailStrings.deposit(Int(depositPercent)),
                            value: depositAmount.asMXN,
                            color: isDepositMet ? SolennixColors.success : SolennixColors.warning,
                            icon: isDepositMet ? "checkmark.circle.fill" : "exclamationmark.circle.fill"
                        )
                    }

                    if event.discount > 0 {
                        let discountLabel = event.discountType == .percent
                            ? EventFinancesDetailStrings.discount(Int(min(100, event.discount)))
                            : EventFinancesDetailStrings.discountFixed
                        financialMetricRow(
                            label: discountLabel,
                            value: "-\(discountAmount.asMXN)",
                            color: SolennixColors.error
                        )
                    }

                    Divider().padding(.horizontal, Spacing.lg)

                    financialMetricRow(
                        label: EventFinancesDetailStrings.costs,
                        value: financials.totalCost.asMXN,
                        color: SolennixColors.error
                    )

                    financialMetricRow(
                        label: EventFinancesDetailStrings.netProfit,
                        value: financials.netProfit.asMXN,
                        color: SolennixColors.success,
                        isBold: true
                    )

                    financialMetricRow(
                        label: EventFinancesDetailStrings.margin,
                        value: "\(String(format: "%.1f", financials.profitMargin))%",
                        color: SolennixColors.info,
                        isBold: true
                    )

                    Divider().padding(.horizontal, Spacing.lg)

                    financialMetricRow(
                        label: EventFinancesDetailStrings.paid,
                        value: viewModel.totalPaid.asMXN,
                        color: SolennixColors.success
                    )

                    financialMetricRow(
                        label: EventFinancesDetailStrings.pending,
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
                            Text(EventFinancesDetailStrings.collectionProgress)
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

    /// Computes the full financial result for a loaded event.
    ///
    /// Cost side: supply rows are loaded from viewModel.supplies.
    /// Product costs are NOT available on this screen (would require loading
    /// all product ingredients) — productCost is therefore 0 here.
    /// DIVERGENCE: EventFormViewModel has productUnitCosts from the form flow;
    /// this view only shows events already persisted (cost precision ≠ form),
    /// so totalCost reflects supplies + extras costs only.
    private func computeFinancials(_ event: Event) -> EventFinancials.Result {
        // Rebuild product rows from viewModel data (prices only; no ingredient costs here).
        let productRows = viewModel.products.map { p in
            EventFinancials.ProductRow(
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                lineDiscount: p.discount,
                unitCost: nil // ingredient costs not loaded in detail view
            )
        }

        let extraRows = viewModel.extras.map { e in
            EventFinancials.ExtraRow(
                price: e.price,
                cost: e.cost,
                excludeUtility: e.excludeUtility
            )
        }

        let supplyRows = viewModel.supplies.map { s in
            EventFinancials.SupplyRow(
                quantity: s.quantity,
                unitCost: s.unitCost,
                excludeCost: s.excludeCost
            )
        }

        return EventFinancials.compute(
            products: productRows,
            extras: extraRows,
            supplies: supplyRows,
            globalDiscountType: event.discountType,
            globalDiscount: event.discount,
            requiresInvoice: event.requiresInvoice,
            taxRate: event.taxRate
        )
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
}

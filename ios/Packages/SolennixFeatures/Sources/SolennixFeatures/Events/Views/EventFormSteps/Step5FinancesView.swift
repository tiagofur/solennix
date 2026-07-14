import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Step 5: Finances

struct Step5FinancesView: View {

    @Bindable var viewModel: EventFormViewModel

    /// Profit margin threshold (%) above which the margin is considered healthy.
    private let healthyMarginThreshold: Double = 20

    /// VoiceOver-friendly margin value: appends the health state word since
    /// color (green/amber/red) is not announced.
    private var marginAccessibilityValue: String {
        let pct = String(format: "%.1f%%", viewModel.profitMargin)
        let stateKey: String
        let stateDefault: String
        if viewModel.profitMargin < 0 {
            stateKey = "events.form.finances.margin_loss"
            stateDefault = "pérdida"
        } else if viewModel.profitMargin >= healthyMarginThreshold {
            stateKey = "events.form.finances.margin_healthy"
            stateDefault = "saludable"
        } else {
            stateKey = "events.form.finances.margin_low"
            stateDefault = "bajo"
        }
        return "\(pct), \(tr(stateKey, stateDefault))"
    }

    var body: some View {
        Form {
            discountSection
            taxSection
            depositSection
            cancellationSection
            notesSection
            totalsSection
        }
        .solennixListStyle()
        // Fetch costos unitarios de productos al llegar al Paso 5 — necesario
        // para computar ganancia neta y margen. Si el usuario vuelve al Paso 2
        // y agrega más productos, el onChange refetch los missing.
        .scrollDismissesKeyboard(.interactively)
        .task {
            await viewModel.fetchProductCosts()
        }
        .onChange(of: viewModel.selectedProducts.count) { _, _ in
            Task { await viewModel.fetchProductCosts() }
        }
    }

    // MARK: - Discount Section

    private var discountSection: some View {
        Section {
            // Discount type — native segmented control replaces the custom
            // sliding-highlight segmented control. The Form row provides the
            // background, so the old .adaptiveGlass/.background chrome is gone.
            Picker(selection: $viewModel.discountType) {
                Text("%")
                    .tag(DiscountType.percent)
                Text("$")
                    .tag(DiscountType.fixed)
            } label: {
                Text(tr("events.form.finances.discount", "Descuento"))
            }
            .pickerStyle(.segmented)
            .solennixRow()

            // Discount value with unit suffix.
            HStack(spacing: Spacing.xs) {
                TextField(
                    "0",
                    value: $viewModel.discount,
                    format: .number.precision(.fractionLength(2))
                )
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)

                Text(viewModel.discountType == .percent ? "%" : "$")
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .solennixRow()
        } header: {
            Text(tr("events.form.finances.discount", "Descuento"))
        }
    }

    // MARK: - Tax Section

    private var taxSection: some View {
        Section {
            Toggle(isOn: $viewModel.requiresInvoice) {
                Label(tr("events.form.finances.invoice", "Requiere factura (IVA)"), systemImage: "doc.text")
            }
            .solennixRow()

            if viewModel.requiresInvoice {
                HStack {
                    Text(tr("events.form.finances.tax_rate", "Tasa IVA:"))
                        .foregroundStyle(SolennixColors.textSecondary)
                    Spacer()
                    TextField(
                        "16",
                        value: $viewModel.taxRate,
                        format: .number.precision(.fractionLength(0))
                    )
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 50)

                    Text("%")
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .solennixRow()
            }
        }
    }

    // MARK: - Deposit Section

    private var depositSection: some View {
        Section {
            HStack {
                TextField(
                    "50",
                    value: $viewModel.depositPercent,
                    format: .number.precision(.fractionLength(0))
                )
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 60)

                Text("%")
                    .foregroundStyle(SolennixColors.textTertiary)

                Spacer()

                Text(formatCurrency(viewModel.depositAmount))
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.primary)
            }
            .solennixRow()
        } header: {
            Text(tr("events.form.finances.deposit", "Anticipo"))
        }
    }

    // MARK: - Cancellation Section

    private var cancellationSection: some View {
        Section {
            HStack {
                Text(tr("events.form.finances.cancellation_days", "Días anticipación"))
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
                TextField(
                    "3",
                    value: $viewModel.cancellationDays,
                    format: .number.precision(.fractionLength(0))
                )
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 60)

                Text(tr("events.form.finances.days", "días"))
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .solennixRow()

            HStack {
                Text(tr("events.form.finances.refund", "Reembolso"))
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
                TextField(
                    "50",
                    value: $viewModel.refundPercent,
                    format: .number.precision(.fractionLength(0))
                )
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 60)

                Text("%")
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .solennixRow()
        } header: {
            Text(tr("events.form.finances.cancellation_policy", "Política de cancelación"))
        }
    }

    // MARK: - Notes Section
    //
    // NOTE: This binds to the same viewModel.notes as Step1GeneralView.
    // It is intentionally a single shared notes field shown on both steps.
    // Label kept consistent with Step1 for clarity.

    private var notesSection: some View {
        Section {
            TextEditor(text: $viewModel.notes)
                .frame(minHeight: 80)
                .font(.body)
                .scrollContentBackground(.hidden)
                .solennixRow()
        } header: {
            Text(tr("events.form.general.notes", "Notas adicionales"))
        }
    }

    // MARK: - Totals Section
    //
    // Parity con Android StepSummary: muestra subtotales separados
    // (productos/extras), descuento, IVA, total, anticipo, y sección de
    // Rentabilidad (costos totales, ganancia neta, margen %).
    //
    // El antiguo card con borde pasa a ser una Section nativa del Form. Las
    // filas de sólo lectura (costos, márgenes, totales) se mantienen como filas
    // nativas con Text; los separadores nativos del Form reemplazan los
    // Divider() manuales del card original.

    private var totalsSection: some View {
        Section {
            if viewModel.hasPendingProductCosts {
                Text(tr("events.form.finances.pending_costs", "Algunos costos de productos siguen cargando. La rentabilidad puede ajustarse en segundos."))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.warning)
                    .solennixRow()
            }

            totalRow(label: tr("events.form.finances.subtotal_products", "Subtotal productos"), value: viewModel.productsSubtotal)
            totalRow(label: tr("events.form.finances.subtotal_extras", "Subtotal extras"), value: viewModel.extrasSubtotal)

            if viewModel.discountAmount > 0 {
                totalRow(label: tr("events.form.finances.discount", "Descuento"), value: -viewModel.discountAmount, color: SolennixColors.error)
            }

            if viewModel.requiresInvoice && viewModel.taxAmount > 0 {
                totalRow(label: trf("events.form.finances.tax_label", "IVA (%@%%)", String(format: "%.0f", viewModel.taxRate)), value: viewModel.taxAmount)
            }

            // Total
            HStack {
                Text(tr("events.form.finances.total", "Total"))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                Spacer()

                Text(formatCurrency(viewModel.total))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.primary)
            }
            .solennixRow()
            // VoiceOver: read "Total: $X" as one utterance (color is not
            // announced, so the label must carry the meaning).
            .accessibilityElement(children: .combine)

            // Deposit
            totalRow(
                label: trf("events.form.finances.deposit_label", "Anticipo (%@%%)", String(format: "%.0f", viewModel.depositPercent)),
                value: viewModel.depositAmount,
                color: SolennixColors.primary
            )

            // Profitability sub-header
            Text(tr("events.form.finances.profitability", "Rentabilidad"))
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .solennixRow()

            totalRow(label: tr("events.form.finances.total_costs", "Costos totales"), value: viewModel.totalCosts)
            totalRow(
                label: tr("events.form.finances.net_profit", "Ganancia neta"),
                value: viewModel.netProfit,
                color: viewModel.netProfit >= 0 ? SolennixColors.success : SolennixColors.error
            )

            // Margin — usa % en lugar de currency.
            HStack {
                Text(tr("events.form.finances.margin", "Margen"))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                Text("\(String(format: "%.1f", viewModel.profitMargin))%")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(
                        viewModel.profitMargin < 0
                            ? SolennixColors.error
                            : (viewModel.profitMargin >= healthyMarginThreshold ? SolennixColors.success : SolennixColors.warning)
                    )
            }
            .solennixRow()
            // VoiceOver: color encodes margin health (green/amber/red) but
            // VoiceOver does not announce color, so the health state is added
            // to the value text. Merge label + value into one utterance.
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(tr("events.form.finances.margin", "Margen"))
            .accessibilityValue(marginAccessibilityValue)
        } header: {
            Text(tr("events.form.finances.summary", "Resumen"))
        }
    }

    // MARK: - Total Row

    private func totalRow(label: String, value: Double, color: Color = SolennixColors.text) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

            Spacer()

            Text(formatCurrency(value))
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(color)
        }
        .solennixRow()
    }

    // MARK: - Helpers

    private func formatCurrency(_ value: Double) -> String {
        let prefix = value < 0 ? "-$" : "$"
        return "\(prefix)\(String(format: "%.2f", abs(value)))"
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    private func trf(_ key: String, _ value: String, _ arg: String) -> String {
        String(format: tr(key, value), locale: FeatureL10n.locale, arg)
    }
}

// MARK: - Preview

#Preview("Step 5 - Finances") {
    Step5FinancesView(viewModel: EventFormViewModel(apiClient: APIClient()))
}

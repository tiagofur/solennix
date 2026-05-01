import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Step 5: Finances

struct Step5FinancesView: View {

    @Bindable var viewModel: EventFormViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Discount + IVA
                AdaptiveFormRow {
                    discountSection
                } right: {
                    taxSection
                }

                // Deposit + Cancellation
                AdaptiveFormRow {
                    depositSection
                } right: {
                    cancellationSection
                }

                // Notes
                notesSection

                // Totals card
                totalsCard
            }
            .padding(Spacing.md)
        }
        // Fetch costos unitarios de productos al llegar al Paso 5 — necesario
        // para computar ganancia neta y margen. Si el usuario vuelve al Paso 2
        // y agrega más productos, el onChange refetch los missing.
        .task {
            await viewModel.fetchProductCosts()
        }
        .onChange(of: viewModel.selectedProducts.count) { _, _ in
            Task { await viewModel.fetchProductCosts() }
        }
    }

    // MARK: - Discount Section

    private var discountSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(tr("events.form.finances.discount", "Descuento"))
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            HStack(spacing: Spacing.sm) {
                // Discount type toggle
                HStack(spacing: 0) {
                    Button {
                        viewModel.discountType = .percent
                    } label: {
                        Text("%")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(viewModel.discountType == .percent ? .white : SolennixColors.textSecondary)
                            .frame(width: 44, height: 36)
                            .background(viewModel.discountType == .percent ? SolennixColors.primary : SolennixColors.surfaceAlt)
                    }
                    .buttonStyle(.plain)

                    Button {
                        viewModel.discountType = .fixed
                    } label: {
                        Text("$")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(viewModel.discountType == .fixed ? .white : SolennixColors.textSecondary)
                            .frame(width: 44, height: 36)
                            .background(viewModel.discountType == .fixed ? SolennixColors.primary : SolennixColors.surfaceAlt)
                    }
                    .buttonStyle(.plain)
                }
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))

                // Discount value
                HStack(spacing: Spacing.xs) {
                    TextField("0", value: $viewModel.discount, format: .number.precision(.fractionLength(2)))
                        .keyboardType(.decimalPad)
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)
                        .multilineTextAlignment(.trailing)

                    Text(viewModel.discountType == .percent ? "%" : "$")
                        .font(.body)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 10)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.border, lineWidth: 1)
                )
            }
        }
    }

    // MARK: - Tax Section

    private var taxSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Toggle(isOn: $viewModel.requiresInvoice) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "doc.text")
                        .foregroundStyle(SolennixColors.textSecondary)

                    Text(tr("events.form.finances.invoice", "Requiere factura (IVA)"))
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                }
            }
            .tint(SolennixColors.primary)

            if viewModel.requiresInvoice {
                HStack(spacing: Spacing.sm) {
                    Text(tr("events.form.finances.tax_rate", "Tasa IVA:"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.xs) {
                        TextField("16", value: $viewModel.taxRate, format: .number.precision(.fractionLength(0)))
                            .keyboardType(.decimalPad)
                            .font(.body)
                            .foregroundStyle(SolennixColors.text)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 50)

                        Text("%")
                            .font(.body)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 6)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.sm)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )

                    Spacer()
                }
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
    }

    // MARK: - Deposit Section

    private var depositSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(tr("events.form.finances.deposit", "Anticipo"))
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            HStack(spacing: Spacing.sm) {
                HStack(spacing: Spacing.xs) {
                    TextField("50", value: $viewModel.depositPercent, format: .number.precision(.fractionLength(0)))
                        .keyboardType(.decimalPad)
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)
                        .multilineTextAlignment(.trailing)

                    Text("%")
                        .font(.body)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 10)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.border, lineWidth: 1)
                )

                Spacer()

                Text(formatCurrency(viewModel.depositAmount))
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.primary)
            }
        }
    }

    // MARK: - Cancellation Section

    private var cancellationSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(tr("events.form.finances.cancellation_policy", "Política de cancelación"))
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            HStack(spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(tr("events.form.finances.cancellation_days", "Días anticipación"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.xs) {
                        TextField("3", value: $viewModel.cancellationDays, format: .number.precision(.fractionLength(0)))
                            .keyboardType(.numberPad)
                            .font(.body)
                            .foregroundStyle(SolennixColors.text)
                            .multilineTextAlignment(.trailing)

                        Text(tr("events.form.finances.days", "días"))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, 10)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(tr("events.form.finances.refund", "Reembolso"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.xs) {
                        TextField("50", value: $viewModel.refundPercent, format: .number.precision(.fractionLength(0)))
                            .keyboardType(.decimalPad)
                            .font(.body)
                            .foregroundStyle(SolennixColors.text)
                            .multilineTextAlignment(.trailing)

                        Text("%")
                            .font(.body)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, 10)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
                }
            }
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(tr("events.form.finances.notes", "Notas"))
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            TextEditor(text: $viewModel.notes)
                .frame(minHeight: 80)
                .font(.body)
                .foregroundStyle(SolennixColors.text)
                .scrollContentBackground(.hidden)
                .padding(Spacing.sm)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.border, lineWidth: 1)
                )
        }
    }

    // MARK: - Totals Card
    //
    // Parity con Android StepSummary: muestra subtotales separados
    // (productos/extras), descuento, IVA, total, anticipo, y sección de
    // Rentabilidad (costos totales, ganancia neta, margen %).

    private var totalsCard: some View {
        VStack(spacing: Spacing.sm) {
            Text(tr("events.form.finances.summary", "Resumen"))
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)

            if viewModel.hasPendingProductCosts {
                Text(tr("events.form.finances.pending_costs", "Algunos costos de productos siguen cargando. La rentabilidad puede ajustarse en segundos."))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.warning)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            totalRow(label: tr("events.form.finances.subtotal_products", "Subtotal productos"), value: viewModel.productsSubtotal)
            totalRow(label: tr("events.form.finances.subtotal_extras", "Subtotal extras"), value: viewModel.extrasSubtotal)

            if viewModel.discountAmount > 0 {
                totalRow(label: tr("events.form.finances.discount", "Descuento"), value: -viewModel.discountAmount, color: SolennixColors.error)
            }

            if viewModel.requiresInvoice && viewModel.taxAmount > 0 {
                totalRow(label: trf("events.form.finances.tax_label", "IVA (%@%%)", String(format: "%.0f", viewModel.taxRate)), value: viewModel.taxAmount)
            }

            Divider()
                .foregroundStyle(SolennixColors.border)

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

            // Deposit
            totalRow(
                label: trf("events.form.finances.deposit_label", "Anticipo (%@%%)", String(format: "%.0f", viewModel.depositPercent)),
                value: viewModel.depositAmount,
                color: SolennixColors.primary
            )

            Divider()
                .foregroundStyle(SolennixColors.border)

            // Profitability
            Text(tr("events.form.finances.profitability", "Rentabilidad"))
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)

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
                    .foregroundStyle(viewModel.profitMargin >= 20 ? SolennixColors.success : SolennixColors.warning)
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .stroke(SolennixColors.primary.opacity(0.3), lineWidth: 1)
        )
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

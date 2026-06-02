import SwiftUI
import SolennixDesign

public struct PaymentEntrySheet: View {

    public typealias PaymentMethodOption = (key: String, label: String)

    @Binding var amount: String
    @Binding var method: String
    @Binding var notes: String
    let title: String
    let confirmLabel: String
    let isSaving: Bool
    let onCancel: () -> Void
    let onConfirm: () -> Void
    let methods: [PaymentMethodOption]

    public init(
        amount: Binding<String>,
        method: Binding<String>,
        notes: Binding<String>,
        title: String? = nil,
        confirmLabel: String? = nil,
        isSaving: Bool = false,
        methods: [PaymentMethodOption]? = nil,
        onCancel: @escaping () -> Void,
        onConfirm: @escaping () -> Void
    ) {
        self._amount = amount
        self._method = method
        self._notes = notes
        self.title = title ?? CommonStrings.paymentEntryDefaultTitle
        self.confirmLabel = confirmLabel ?? CommonStrings.paymentEntryDefaultConfirm
        self.isSaving = isSaving
        self.methods = methods ?? [
            (key: "cash", label: CommonStrings.paymentMethodCash),
            (key: "transfer", label: CommonStrings.paymentMethodTransfer),
            (key: "card", label: CommonStrings.paymentMethodCard),
            (key: "check", label: CommonStrings.paymentMethodCheck)
        ]
        self.onCancel = onCancel
        self.onConfirm = onConfirm
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                Text(title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(CommonStrings.paymentEntryAmountLabel)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    TextField("0.00", text: $amount)
                        .keyboardType(.decimalPad)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(CommonStrings.paymentEntryMethodLabel)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.sm) {
                        ForEach(methods, id: \.key) { option in
                            Button {
                                method = option.key
                            } label: {
                                Text(option.label)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundStyle(method == option.key ? .white : SolennixColors.text)
                                    .padding(.horizontal, Spacing.md)
                                    .padding(.vertical, Spacing.sm)
                                    .background(method == option.key ? SolennixColors.primary : SolennixColors.surface)
                                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(CommonStrings.paymentEntryNotesLabel)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    TextField(CommonStrings.paymentEntryNotesPlaceholder, text: $notes)
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }

                Spacer()

                PremiumButton(
                    title: confirmLabel,
                    isLoading: isSaving,
                    isDisabled: amount.isEmpty
                ) {
                    onConfirm()
                }
            }
            .padding(Spacing.lg)
            .background(SolennixColors.background)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(CommonStrings.paymentEntryCancelButton) { onCancel() }
                        .foregroundStyle(SolennixColors.primary)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

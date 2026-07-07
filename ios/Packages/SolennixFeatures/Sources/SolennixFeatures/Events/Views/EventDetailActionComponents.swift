import SwiftUI
import SolennixDesign

struct EventDetailDocumentsCard: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let title: String
    let options: [(key: String, label: String, icon: String)]
    let onTap: (String) -> Void

    private var columns: [GridItem] {
        if dynamicTypeSize >= .accessibility1 {
            return [GridItem(.flexible(), spacing: Spacing.sm)]
        } else {
            return [GridItem(.flexible(), spacing: Spacing.sm),
                    GridItem(.flexible(), spacing: Spacing.sm)]
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "doc.text.fill")
                    .font(.body)
                    .foregroundStyle(SolennixColors.primary)
                Text(title)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
            }

            LazyVGrid(columns: columns,
                      spacing: Spacing.sm) {
                ForEach(options, id: \.key) { option in
                    Button {
                        onTap(option.key)
                    } label: {
                        VStack(spacing: Spacing.xs) {
                            Image(systemName: option.icon)
                                .font(.title3)
                                .foregroundStyle(SolennixColors.primary)
                            Text(option.label)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(SolennixColors.text)
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(Spacing.lg)
    }
}

struct EventDetailPaymentSheetContent: View {
    @Binding var amount: String
    @Binding var method: String
    @Binding var notes: String

    let title: String
    let amountLabel: String
    let methodLabel: String
    let notesLabel: String
    let notesPlaceholder: String
    let saveLabel: String
    let cancelLabel: String
    let methods: [(key: String, label: String)]
    let isSaving: Bool
    let isSaveDisabled: Bool
    let onSave: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                Text(title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(amountLabel)
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
                    Text(methodLabel)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.sm) {
                        ForEach(methods, id: \.key) { methodOption in
                            Button {
                                method = methodOption.key
                            } label: {
                                Text(methodOption.label)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundStyle(
                                        method == methodOption.key
                                            ? SolennixColors.textInverse
                                            : SolennixColors.text
                                    )
                                    .padding(.horizontal, Spacing.md)
                                    .padding(.vertical, Spacing.sm)
                                    .background(
                                        method == methodOption.key
                                            ? SolennixColors.primary
                                            : SolennixColors.surface
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(notesLabel)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    TextField(notesPlaceholder, text: $notes)
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }

                Spacer()

                PremiumButton(
                    title: saveLabel,
                    isLoading: isSaving,
                    isDisabled: isSaveDisabled
                ) {
                    onSave()
                }
            }
            .padding(Spacing.lg)
            .background(SolennixColors.background)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(cancelLabel) {
                        onCancel()
                    }
                    .foregroundStyle(SolennixColors.primary)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

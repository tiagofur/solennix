import SwiftUI
import SolennixCore
import SolennixDesign

struct EventDetailQuickInfoItem: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(SolennixColors.primary)
                .frame(width: 16)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .textCase(.uppercase)

                Text(value)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                    .lineLimit(1)
            }

            Spacer()
        }
    }
}

struct EventDetailMiniKPI: View {
    let label: String
    let value: String
    let color: Color
    let bgColor: Color

    var body: some View {
        VStack(spacing: Spacing.xs) {
            Text(value)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}

struct EventDetailDateBox: View {
    let month: String
    let day: String

    var body: some View {
        VStack(spacing: Spacing.xxs) {
            Text(month)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.primary)
                .textCase(.uppercase)

            Text(day)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(width: 56, height: 56)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}

struct EventDetailSummaryNavCard: View {
    let icon: String
    let title: String
    let count: Int?
    let subtitle: String?
    let color: Color
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: icon)
                        .font(.body)
                        .foregroundStyle(color)

                    Spacer()

                    if let count, count > 0 {
                        Text("\(count)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(color)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(color.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .lineLimit(1)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }
}

struct EventDetailDocumentsCard: View {
    let title: String
    let options: [(key: String, label: String, icon: String)]
    let onTap: (String) -> Void

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

            LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.sm),
                                GridItem(.flexible(), spacing: Spacing.sm)],
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
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
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
                                            ? .white
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
    }
}

struct EventDetailPhotosSummaryCard: View {
    let title: String
    let count: Int
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "camera.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.info)

                    Spacer()

                    if count > 0 {
                        Text("\(count)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.info)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(SolennixColors.infoBg)
                            .clipShape(Capsule())
                    }
                }

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }
}

struct EventDetailPhotosPreviewCard: View {
    let title: String
    let photos: [String]
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)
                    Spacer()
                    Text("\(photos.count)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.info)
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                HStack(spacing: Spacing.sm) {
                    ForEach(Array(photos.prefix(4).enumerated()), id: \.offset) { index, url in
                        AsyncImage(url: APIClient.resolveURL(url)) { image in
                            image
                                .resizable()
                                .scaledToFill()
                        } placeholder: {
                            ProgressView()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(SolennixColors.surfaceAlt)
                        }
                        .frame(height: 60)
                        .frame(maxWidth: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                        .overlay {
                            if index == 3 && photos.count > 4 {
                                RoundedRectangle(cornerRadius: CornerRadius.sm)
                                    .fill(.black.opacity(0.5))
                                Text("+\(photos.count - 4)")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)
                            }
                        }
                    }
                }
            }
            .padding(Spacing.md)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }
}

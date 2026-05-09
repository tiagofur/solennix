import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Settings Shared Components

struct SettingsCardContainer<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(title)
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            VStack(alignment: .leading, spacing: Spacing.sm) {
                content
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }
}

struct SettingsNavRow: View {
    let title: String
    let systemImage: String

    var body: some View {
        HStack {
            Label(title, systemImage: systemImage)
                .foregroundStyle(SolennixColors.text)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .contentShape(Rectangle())
    }
}

struct SettingsExternalRow: View {
    let title: String
    let systemImage: String
    var color: Color = SolennixColors.text

    var body: some View {
        HStack {
            Label(title, systemImage: systemImage)
                .foregroundStyle(color)

            Spacer()

            Image(systemName: "arrow.up.right.square")
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .contentShape(Rectangle())
    }
}

struct SettingsUserHeaderContent: View {
    let user: User

    var body: some View {
        HStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(SolennixGradient.premium)
                    .frame(width: 60, height: 60)

                Text(user.name.prefix(1).uppercased())
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(user.name)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)

                Text(user.email)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)

                HStack(spacing: Spacing.xs) {
                    PlanBadge(plan: user.plan)

                    if let businessName = user.businessName, !businessName.isEmpty {
                        Text(businessName)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            }

            Spacer()
        }
    }
}

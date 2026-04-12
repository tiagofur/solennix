import SwiftUI

// MARK: - Upgrade Banner View

public enum UpgradeBannerType {
    case limitReached
    case upsell
}

public struct UpgradeBannerView: View {

    let type: UpgradeBannerType
    let resource: String?
    let currentUsage: Int?
    let limit: Int?
    let onUpgrade: () -> Void

    public init(
        type: UpgradeBannerType,
        resource: String? = nil,
        currentUsage: Int? = nil,
        limit: Int? = nil,
        onUpgrade: @escaping () -> Void
    ) {
        self.type = type
        self.resource = resource
        self.currentUsage = currentUsage
        self.limit = limit
        self.onUpgrade = onUpgrade
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Header
            HStack(spacing: Spacing.xs) {
                Image(systemName: "bolt.fill")
                    .font(.subheadline)
                    .foregroundStyle(iconColor)

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(iconColor)
            }

            // Description
            Text(description)
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)

            // Button
            Button(action: onUpgrade) {
                Text("Ver planes")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.xs)
                    .background(buttonColor)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .padding(.top, Spacing.xs)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    // MARK: - Computed Properties

    private var isLimitReached: Bool {
        type == .limitReached
    }

    private var title: String {
        if isLimitReached {
            return "Limite alcanzado\(resource != nil ? " (\(resource!))" : "")"
        } else {
            return "Desbloquea mas con Pro"
        }
    }

    private var description: String {
        if isLimitReached {
            let usageStr = currentUsage.map { "\($0)" } ?? "?"
            let limitStr = limit.map { "\($0)" } ?? "?"
            return "Has usado \(usageStr) de \(limitStr). Actualiza tu plan para continuar."
        } else {
            return "Obten eventos ilimitados, mas clientes y todas las funcionalidades."
        }
    }

    private var backgroundColor: Color {
        isLimitReached ? SolennixColors.warningBg : SolennixColors.infoBg
    }

    private var iconColor: Color {
        isLimitReached ? SolennixColors.warning : SolennixColors.info
    }

    private var buttonColor: Color {
        isLimitReached ? SolennixColors.warning : SolennixColors.primary
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.md) {
        UpgradeBannerView(
            type: .upsell,
            onUpgrade: {}
        )

        UpgradeBannerView(
            type: .limitReached,
            resource: "Eventos",
            currentUsage: 5,
            limit: 5,
            onUpgrade: {}
        )
    }
    .padding()
    .background(SolennixColors.background)
}

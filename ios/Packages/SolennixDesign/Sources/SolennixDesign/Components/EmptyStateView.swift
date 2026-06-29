import SwiftUI

/// Empty content placeholder with icon, title, message, and optional CTA.
///
/// Use `iconColor` to apply brand color to the icon (e.g. `.primary` for gold).
/// Works both standalone and inside List rows.
public struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    var iconColor: Color? = nil

    @ScaledMetric(relativeTo: .largeTitle) private var iconSize: CGFloat = 56

    public init(
        icon: String,
        title: String,
        message: String,
        actionTitle: String? = nil,
        iconColor: Color? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.iconColor = iconColor
        self.action = action
    }

    public var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: iconSize))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(iconColor ?? SolennixColors.textTertiary)

            Text(title)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)
                .multilineTextAlignment(.center)

            Text(message)
                .font(.body)
                .foregroundStyle(SolennixColors.textSecondary)
                .multilineTextAlignment(.center)

            if let actionTitle, let action {
                PremiumButton(title: actionTitle, fullWidth: false, action: action)
                    .padding(.top, Spacing.sm)
            }
        }
        .padding(Spacing.xxl)
        .frame(maxWidth: .infinity, minHeight: 300, maxHeight: .infinity, alignment: .center)
    }
}

// MARK: - Preview

#Preview("Empty State") {
    VStack {
        EmptyStateView(
            icon: "calendar.badge.plus",
            title: "Sin eventos",
            message: "Aun no tienes eventos programados. Crea tu primer evento para comenzar.",
            actionTitle: "Crear Evento",
            iconColor: SolennixColors.primary
        ) {
            // action
        }

        Divider()

        EmptyStateView(
            icon: "person.2",
            title: "Sin clientes",
            message: "Agrega tu primer cliente para comenzar a organizar eventos.",
            iconColor: SolennixColors.primary
        )
    }
    .background(SolennixColors.background)
}

import SwiftUI

/// Empty content placeholder with icon, title, message, and optional CTA.
public struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    public init(
        icon: String,
        title: String,
        message: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    public var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 56))
                .foregroundStyle(SolennixColors.textTertiary)

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
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }
}

// MARK: - Preview

#Preview("Empty State") {
    VStack {
        EmptyStateView(
            icon: "calendar.badge.plus",
            title: "Sin eventos",
            message: "Aun no tienes eventos programados. Crea tu primer evento para comenzar.",
            actionTitle: "Crear Evento"
        ) {
            // action
        }

        Divider()

        EmptyStateView(
            icon: "person.2",
            title: "Sin clientes",
            message: "Agrega tu primer cliente para comenzar a organizar eventos."
        )
    }
    .background(SolennixColors.background)
}

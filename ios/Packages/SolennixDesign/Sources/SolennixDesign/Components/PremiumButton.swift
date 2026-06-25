import SwiftUI

/// Primary CTA button with Apple Liquid Glass style.
///
/// Use `.primary` (default) for main actions and `.secondary` for back/cancel.
/// Changing the style here updates every usage across the app.
public struct PremiumButton: View {

    public enum Style {
        /// primaryLight background + primaryDark text + adaptiveGlass
        case primary
        /// surfaceAlt background + textSecondary + adaptiveGlass
        case secondary
    }

    public enum IconPosition {
        case leading, trailing
    }

    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false
    var fullWidth: Bool = true
    var style: Style = .primary
    var icon: String? = nil
    var iconPosition: IconPosition = .leading

    public init(
        title: String,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        fullWidth: Bool = true,
        style: Style = .primary,
        icon: String? = nil,
        iconPosition: IconPosition = .leading,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.fullWidth = fullWidth
        self.style = style
        self.icon = icon
        self.iconPosition = iconPosition
        self.action = action
    }

    public var body: some View {
        Button(action: {
            guard !isLoading && !isDisabled else { return }
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.prepare()
            generator.impactOccurred()
            action()
        }) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(loadingTintColor)
                } else {
                    if let icon, iconPosition == .leading {
                        Image(systemName: icon)
                    }
                    Text(title)
                    if let icon, iconPosition == .trailing {
                        Image(systemName: icon)
                    }
                }
            }
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(labelColor)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, 12)
            .background(backgroundColor)
            .clipShape(Capsule())
            .adaptiveGlass(in: Capsule(), fallback: .material)
            .opacity(isDisabled || isLoading ? 0.5 : 1.0)
        }
        .disabled(isDisabled || isLoading)
    }

    // MARK: - Style Resolvers

    private var backgroundColor: Color {
        switch style {
        case .primary: SolennixColors.primaryLight
        case .secondary: SolennixColors.surfaceAlt
        }
    }

    private var labelColor: Color {
        switch style {
        case .primary: SolennixColors.primaryDark
        case .secondary: SolennixColors.textSecondary
        }
    }

    private var loadingTintColor: Color {
        switch style {
        case .primary: SolennixColors.primaryDark
        case .secondary: SolennixColors.textSecondary
        }
    }
}

// MARK: - Preview

#Preview("Premium Button States") {
    VStack(spacing: Spacing.md) {
        PremiumButton(title: "Iniciar Sesion") {}

        PremiumButton(title: "Cargando...", isLoading: true) {}

        PremiumButton(title: "Deshabilitado", isDisabled: true) {}

        PremiumButton(title: "Compacto", fullWidth: false) {}

        PremiumButton(title: "Secundario", style: .secondary) {}

        PremiumButton(title: "Anterior", style: .secondary, icon: "chevron.left") {}

        PremiumButton(title: "Siguiente", icon: "chevron.right", iconPosition: .trailing) {}

        PremiumButton(title: "Guardar", icon: "checkmark") {}
    }
    .padding()
    .background(SolennixColors.background)
}

import SwiftUI

/// Primary CTA button with premium gold gradient background.
public struct PremiumButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false
    var fullWidth: Bool = true

    public init(
        title: String,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        fullWidth: Bool = true,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.fullWidth = fullWidth
        self.action = action
    }

    public var body: some View {
        Button(action: {
            guard !isLoading && !isDisabled else { return }
            // Haptic feedback for premium feel.
            // prepare() is called before impactOccurred() to reduce latency.
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.prepare()
            generator.impactOccurred()
            action()
        }) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        // Use fixed navy — contrast on gold gradient ≥4.9:1 (WCAG AA).
                        .tint(SolennixColors.onPrimary)
                } else {
                    Text(title)
                        .font(.headline)
                        // Use fixed navy — contrast on gold gradient ≥4.9:1 (WCAG AA).
                        .foregroundStyle(SolennixColors.onPrimary)
                }
            }
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, 16)
            .background(SolennixGradient.premium)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .opacity(isDisabled || isLoading ? 0.5 : 1.0)
        }
        .disabled(isDisabled || isLoading)
        .if(!isDisabled && !isLoading) { view in
            view.shadowFab()
        }
    }
}

// MARK: - Conditional modifier helper

private extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

// MARK: - Preview

#Preview("Premium Button States") {
    VStack(spacing: Spacing.md) {
        PremiumButton(title: "Iniciar Sesion") {
            // action
        }

        PremiumButton(title: "Cargando...", isLoading: true) {
            // action
        }

        PremiumButton(title: "Deshabilitado", isDisabled: true) {
            // action
        }

        PremiumButton(title: "Compacto", fullWidth: false) {
            // action
        }
    }
    .padding()
    .background(SolennixColors.background)
}

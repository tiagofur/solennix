import SwiftUI
import SolennixDesign

// MARK: - Onboarding Page View

/// A reusable page component for the onboarding flow.
/// Displays a gradient-filled SF Symbol, title, description, and optional feature list.
struct OnboardingPageView: View {

    let iconName: String
    let title: String
    var description: String?
    var features: [String]?

    // MARK: - Body

    var body: some View {
        VStack(spacing: Spacing.xl) {
            Spacer()

            // Icon with premium gradient fill
            Image(systemName: iconName)
                .font(.system(size: 72, weight: .light))
                .foregroundStyle(SolennixGradient.premium)
                .symbolRenderingMode(.hierarchical)
                .padding(.bottom, Spacing.md)

            // Title
            Text(title)
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
                .multilineTextAlignment(.center)

            // Description (optional)
            if let description {
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, Spacing.xxl)
            }

            // Feature list (optional)
            if let features {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    ForEach(features, id: \.self) { feature in
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.body)
                                .foregroundStyle(SolennixColors.primary)

                            Text(feature)
                                .font(.subheadline)
                                .foregroundStyle(SolennixColors.text)
                        }
                    }
                }
                .padding(.horizontal, Spacing.xxxl)
                .padding(.top, Spacing.sm)
            }

            Spacer()
            Spacer()
        }
        .padding(.horizontal, Spacing.xl)
    }
}

// MARK: - Preview

#Preview("Page with Description") {
    OnboardingPageView(
        iconName: "sparkles.rectangle.stack",
        title: "Bienvenido a Solennix",
        description: "La herramienta definitiva para organizar tus eventos de manera profesional"
    )
    .background(SolennixColors.background)
}

#Preview("Page with Features") {
    OnboardingPageView(
        iconName: "rectangle.stack.fill",
        title: "Todo en un Solo Lugar",
        features: [
            "Gestiona clientes y contactos",
            "Crea cotizaciones y contratos",
            "Controla tu inventario",
            "Programa eventos en calendario"
        ]
    )
    .background(SolennixColors.background)
}

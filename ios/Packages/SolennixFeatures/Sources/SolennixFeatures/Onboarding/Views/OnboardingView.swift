import SwiftUI
import SolennixDesign

// MARK: - Onboarding View

/// Full-screen onboarding experience shown on first launch.
/// Guides the user through app features with a paged tab view.
public struct OnboardingView: View {

    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    @State private var currentPage = 0
    @Environment(\.dismiss) private var dismiss

    private let totalPages = 4

    public init() {}

    // MARK: - Body

    public var body: some View {
        ZStack {
            // Background
            SolennixColors.background
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Skip button
                HStack {
                    Spacer()
                    Button {
                        completeOnboarding()
                    } label: {
                        Text("Omitir")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                    .padding(.trailing, Spacing.xl)
                    .padding(.top, Spacing.sm)
                    .opacity(currentPage < totalPages - 1 ? 1 : 0)
                    .animation(.easeInOut(duration: 0.2), value: currentPage)
                }

                // Paged content
                TabView(selection: $currentPage) {
                    welcomePage
                        .tag(0)

                    coreFeaturesPage
                        .tag(1)

                    appleFeaturesPage
                        .tag(2)

                    getStartedPage
                        .tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut(duration: 0.3), value: currentPage)

                // Page indicator & navigation
                VStack(spacing: Spacing.lg) {
                    // Custom page dots
                    HStack(spacing: Spacing.sm) {
                        ForEach(0..<totalPages, id: \.self) { index in
                            Circle()
                                .fill(index == currentPage
                                      ? SolennixColors.primary
                                      : SolennixColors.border)
                                .frame(width: index == currentPage ? 10 : 8,
                                       height: index == currentPage ? 10 : 8)
                                .animation(.easeInOut(duration: 0.2), value: currentPage)
                        }
                    }

                    // Navigation button
                    if currentPage < totalPages - 1 {
                        Button {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                currentPage += 1
                            }
                        } label: {
                            HStack(spacing: Spacing.sm) {
                                Text("Siguiente")
                                    .font(.headline)
                                Image(systemName: "arrow.right")
                                    .font(.headline)
                            }
                            .foregroundStyle(SolennixColors.primary)
                            .padding(.vertical, Spacing.md)
                            .frame(maxWidth: .infinity)
                        }
                    } else {
                        PremiumButton(title: "Comenzar") {
                            completeOnboarding()
                        }
                        .padding(.horizontal, Spacing.xl)
                    }
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.bottom, Spacing.xxl)
            }
        }
    }

    // MARK: - Pages

    private var welcomePage: some View {
        OnboardingPageView(
            iconName: "sparkles.rectangle.stack",
            title: "Bienvenido a Solennix",
            description: "La herramienta definitiva para organizar tus eventos de manera profesional"
        )
    }

    private var coreFeaturesPage: some View {
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
    }

    private var appleFeaturesPage: some View {
        OnboardingPageView(
            iconName: "iphone",
            title: "Diseñado para Apple",
            features: [
                "Widgets en tu pantalla de inicio",
                "Comandos de Siri",
                "Búsqueda desde Spotlight",
                "Actividades en Vivo el día del evento",
                "Face ID y Touch ID"
            ]
        )
    }

    private var getStartedPage: some View {
        OnboardingPageView(
            iconName: "arrow.right.circle.fill",
            title: "Comienza Ahora",
            description: "Crea tu cuenta o inicia sesión para empezar"
        )
    }

    // MARK: - Actions

    private func completeOnboarding() {
        withAnimation(.easeInOut(duration: 0.3)) {
            hasSeenOnboarding = true
        }
        dismiss()
    }
}

// MARK: - Preview

#Preview("Onboarding") {
    OnboardingView()
}

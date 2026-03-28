import SwiftUI
import SolennixDesign

// MARK: - Onboarding View

/// Full-screen onboarding experience shown on first launch.
/// Guides the user through app features with a paged tab view.
public struct OnboardingView: View {

    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    @State private var currentPage = 0
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    private let totalPages = 4

    public init() {}

    // MARK: - Body

    public var body: some View {
        ZStack {
            // Background
            SolennixColors.background
                .ignoresSafeArea()

            if sizeClass == .regular {
                iPadBody
            } else {
                iPhoneBody
            }
        }
    }

    // MARK: - iPhone Body

    private var iPhoneBody: some View {
        VStack(spacing: 0) {
            // Skip button
            skipButton

            // Paged content
            pagedTabView

            // Page indicator & navigation
            pageIndicatorAndNavigation
        }
    }

    // MARK: - iPad Body

    private var iPadBody: some View {
        VStack(spacing: 0) {
            // Skip button
            skipButton

            HStack(spacing: 0) {
                // Left: illustration/icon
                currentPageIllustration
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(SolennixGradient.premium.opacity(0.1))

                // Right: text + navigation
                VStack(spacing: Spacing.xl) {
                    Spacer()

                    currentPageText

                    Spacer()

                    pageIndicatorAndNavigation
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, Spacing.xxxl)
            }
        }
    }

    // MARK: - Shared Components

    private var skipButton: some View {
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
    }

    private var pagedTabView: some View {
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
    }

    private var pageIndicatorAndNavigation: some View {
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
                    .frame(maxWidth: sizeClass == .regular ? 440 : .infinity)
                }
            } else {
                PremiumButton(title: "Comenzar") {
                    completeOnboarding()
                }
                .frame(maxWidth: sizeClass == .regular ? 440 : .infinity)
                .padding(.horizontal, Spacing.xl)
            }
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.bottom, Spacing.xxl)
    }

    // MARK: - iPad Page Content

    @ViewBuilder
    private var currentPageIllustration: some View {
        let iconName: String = {
            switch currentPage {
            case 0: return "sparkles.rectangle.stack"
            case 1: return "rectangle.stack.fill"
            case 2: return "iphone"
            case 3: return "arrow.right.circle.fill"
            default: return "sparkles.rectangle.stack"
            }
        }()

        VStack {
            Spacer()
            Image(systemName: iconName)
                .font(.system(size: 120, weight: .light))
                .foregroundStyle(SolennixGradient.premium)
                .symbolRenderingMode(.hierarchical)
            Spacer()
        }
        .animation(.easeInOut(duration: 0.3), value: currentPage)
    }

    @ViewBuilder
    private var currentPageText: some View {
        Group {
            switch currentPage {
            case 0:
                iPadTextContent(
                    title: "Bienvenido a Solennix",
                    description: "La herramienta definitiva para organizar tus eventos de manera profesional"
                )
            case 1:
                iPadTextContent(
                    title: "Todo en un Solo Lugar",
                    features: [
                        "Gestiona clientes y contactos",
                        "Crea cotizaciones y contratos",
                        "Controla tu inventario",
                        "Programa eventos en calendario"
                    ]
                )
            case 2:
                iPadTextContent(
                    title: "Diseñado para Apple",
                    features: [
                        "Widgets en tu pantalla de inicio",
                        "Comandos de Siri",
                        "Busqueda desde Spotlight",
                        "Actividades en Vivo el dia del evento",
                        "Face ID y Touch ID"
                    ]
                )
            case 3:
                iPadTextContent(
                    title: "Comienza Ahora",
                    description: "Crea tu cuenta o inicia sesion para empezar"
                )
            default:
                EmptyView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: currentPage)
    }

    private func iPadTextContent(
        title: String,
        description: String? = nil,
        features: [String]? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            Text(title)
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)

            if let description {
                Text(description)
                    .font(.title3)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineSpacing(4)
            }

            if let features {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    ForEach(features, id: \.self) { feature in
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.title3)
                                .foregroundStyle(SolennixColors.primary)

                            Text(feature)
                                .font(.body)
                                .foregroundStyle(SolennixColors.text)
                        }
                    }
                }
                .padding(.top, Spacing.sm)
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

import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Subscription View

/// Displays the user's current subscription plan, status, and included features.
/// Provides a way to upgrade or manage the subscription via the full PricingView.
public struct SubscriptionView: View {

    @State private var viewModel: SettingsViewModel
    @State private var legalSheetURL: IdentifiableURL?
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    private let apiClient: APIClient

    public init(apiClient: APIClient, authManager: AuthManager) {
        self.apiClient = apiClient
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Current plan card
                currentPlanCard

                // Plan status
                if subscriptionManager.isPremium {
                    activeStatusBanner
                }

                // Provider badge + cross-platform cancel instructions
                if let sub = subscriptionManager.subscriptionStatus?.subscription {
                    providerSection(sub)
                }

                // Features included in current plan
                featuresSection

                // Actions
                actionsSection

                // Legal links
                legalFooter
            }
            .padding(Spacing.lg)
            .frame(maxWidth: sizeClass == .regular ? 600 : .infinity)
            .frame(maxWidth: .infinity)
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Suscripcion")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadUser()
            await subscriptionManager.checkEntitlementStatus()
            await subscriptionManager.fetchBackendStatus(apiClient: apiClient)
        }
        .sheet(item: $legalSheetURL) { wrapper in
            SafariView(url: wrapper.url)
                .ignoresSafeArea()
        }
    }

    // MARK: - Current Plan Card

    private var currentPlanCard: some View {
        VStack(spacing: Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Plan actual")
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.primary)

                    Text(currentPlanName)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)
                }

                Spacer()

                if let user = viewModel.user {
                    PlanBadge(plan: user.plan)
                }
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.primary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Active Status Banner

    private var activeStatusBanner: some View {
        HStack {
            Image(systemName: "crown.fill")
                .foregroundStyle(SolennixColors.warning)

            Text("Suscripcion activa")
                .font(.subheadline)
                .fontWeight(.semibold)

            Spacer()

            HStack(spacing: Spacing.xs) {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(SolennixColors.success)

                Text("Activo")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.success)
            }
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 4)
            .background(SolennixColors.success.opacity(0.15))
            .clipShape(Capsule())
        }
        .padding(Spacing.md)
        .background(SolennixColors.success.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Features Section

    private var featuresSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Funciones incluidas")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            VStack(spacing: 0) {
                ForEach(currentPlanFeatures, id: \.self) { feature in
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.success)

                        Text(feature)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.text)

                        Spacer()
                    }
                    .padding(.vertical, Spacing.sm)
                    .padding(.horizontal, Spacing.md)

                    if feature != currentPlanFeatures.last {
                        Divider()
                            .padding(.leading, 44)
                    }
                }
            }
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
    }

    // MARK: - Provider Section

    private func providerSection(_ sub: SubscriptionInfo) -> some View {
        VStack(spacing: Spacing.sm) {
            // Provider badge
            HStack(spacing: Spacing.sm) {
                Image(systemName: providerIcon(sub.provider))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)

                Text(sub.provider.badge)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()
            }
            .padding(Spacing.md)
            .background(SolennixColors.surfaceAlt)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

            // Cross-platform cancel instructions (only when provider != apple)
            if !sub.provider.isCurrentPlatform {
                HStack(alignment: .top, spacing: Spacing.sm) {
                    Image(systemName: "info.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.info)

                    Text(sub.provider.cancelInstructions)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.text)
                }
                .padding(Spacing.md)
                .background(SolennixColors.info.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
    }

    private func providerIcon(_ provider: SubscriptionProvider) -> String {
        switch provider {
        case .apple: return "apple.logo"
        case .google: return "play.rectangle.fill"
        case .stripe: return "globe"
        }
    }

    // MARK: - Actions Section

    private var actionsSection: some View {
        VStack(spacing: Spacing.md) {
            if !isPremiumUser {
                // Upgrade button
                NavigationLink(value: Route.pricing) {
                    HStack {
                        Image(systemName: "arrow.up.circle.fill")
                        Text("Mejorar plan")
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(SolennixGradient.premium)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
                .buttonStyle(.plain)
            }

            // View all plans
            NavigationLink(value: Route.pricing) {
                HStack {
                    Image(systemName: "list.bullet.rectangle")
                    Text("Ver todos los planes")
                }
                .font(.subheadline)
                .foregroundStyle(SolennixColors.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(SolennixColors.primary.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .buttonStyle(.plain)

            // Manage subscription (only if premium and subscribed via Apple or unknown provider)
            if subscriptionManager.isPremium &&
                (subscriptionManager.subscriptionStatus?.subscription?.provider.isCurrentPlatform ?? true) {
                Button {
                    Task { await subscriptionManager.openSubscriptionManagement() }
                } label: {
                    HStack {
                        Image(systemName: "gearshape")
                        Text("Administrar suscripcion")
                    }
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                }
                .buttonStyle(.plain)
            }

            // Restore purchases
            Button {
                Task { await subscriptionManager.restorePurchases() }
            } label: {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Restaurar compras")
                }
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.sm)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Computed Properties

    private var currentPlanName: String {
        if subscriptionManager.isPremium {
            return "Premium"
        }
        guard let user = viewModel.user else { return "Basico" }
        switch user.plan {
        case .premium: return "Premium"
        case .basic: return "Basico"
        }
    }

    private var isPremiumUser: Bool {
        subscriptionManager.isPremium || viewModel.user?.plan == .premium
    }

    private var currentPlanFeatures: [String] {
        if isPremiumUser {
            return [
                "Productos ilimitados",
                "Clientes ilimitados",
                "Eventos ilimitados",
                "Widgets de iOS",
                "Comandos de Siri",
                "Soporte prioritario",
                "Sin marca de agua en PDFs",
                "Marca personalizada"
            ]
        } else {
            return [
                "Hasta 20 productos",
                "Hasta 50 clientes",
                "Hasta 3 eventos por mes",
                "Generacion de contratos",
                "Calendario de eventos",
                "Reportes basicos"
            ]
        }
    }

    // MARK: - Legal Footer

    private var legalFooter: some View {
        VStack(spacing: Spacing.md) {
            Divider()
                .padding(.vertical, Spacing.sm)

            HStack(spacing: Spacing.lg) {
                Button {
                    HapticsHelper.play(.selection)
                    legalSheetURL = IdentifiableURL(LegalURL.terms)
                } label: {
                    Text("Terminos")
                }
                .accessibilityHint("Abre los terminos de uso en Safari")

                Text("•")
                    .foregroundStyle(SolennixColors.textTertiary)

                Button {
                    HapticsHelper.play(.selection)
                    legalSheetURL = IdentifiableURL(LegalURL.privacy)
                } label: {
                    Text("Privacidad")
                }
                .accessibilityHint("Abre la politica de privacidad en Safari")
            }
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(SolennixColors.primary)
            .buttonStyle(.plain)

            Text("© 2025 Solennix por Creapolis")
                .font(.caption2)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .padding(.top, Spacing.md)
    }
}

// MARK: - Preview

#Preview("Subscription") {
    NavigationStack {
        SubscriptionView(apiClient: APIClient(), authManager: AuthManager(keychain: KeychainHelper.standard))
            .environment(SubscriptionManager())
    }
}

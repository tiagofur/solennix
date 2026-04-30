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

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
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
        .navigationTitle(tr("settings.subscription.title", "Suscripción"))
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
        let sub = subscriptionManager.subscriptionStatus?.subscription
        return VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(tr("settings.subscription.current_plan", "Plan actual"))
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

            if let price = priceLine(sub) {
                Text(price)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.text)
            }

            if let renewal = renewalLine(sub) {
                Text(renewal)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.primary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Current Plan Card Helpers

    private func renewalLine(_ sub: SubscriptionInfo?) -> String? {
        guard let iso = sub?.currentPeriodEnd, !iso.isEmpty else { return nil }
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime]
        guard let date = isoFormatter.date(from: iso) else { return nil }
        let displayFormatter = DateFormatter()
        displayFormatter.locale = FeatureL10n.locale
        displayFormatter.dateStyle = .long
        let formatted = displayFormatter.string(from: date)
        return (sub?.cancelAtPeriodEnd == true)
            ? FeatureL10n.format("settings.subscription.expires_on", "Vence el %@", formatted)
            : FeatureL10n.format("settings.subscription.renews_on", "Se renueva el %@", formatted)
    }

    /// Formats the price line when the backend exposes it (Stripe provider).
    /// Returns nil for Apple/Google — the store is the source of truth there.
    private func priceLine(_ sub: SubscriptionInfo?) -> String? {
        guard let cents = sub?.amountCents, let currency = sub?.currency else {
            return nil
        }
        let interval: String
        switch sub?.billingInterval {
        case "month": interval = tr("settings.subscription.interval_month", "/mes")
        case "year": interval = tr("settings.subscription.interval_year", "/año")
        default: interval = ""
        }
        let amount = Double(cents) / 100.0
        let formatted = String(format: "%.2f", locale: FeatureL10n.locale, amount)
        return "\(currency.uppercased()) \(formatted)\(interval)"
    }

    // MARK: - Active Status Banner

    private var activeStatusBanner: some View {
        let cancelPending = subscriptionManager.subscriptionStatus?.subscription?.cancelAtPeriodEnd == true
        let accent = cancelPending ? SolennixColors.warning : SolennixColors.success
        return HStack {
            Image(systemName: "crown.fill")
                .foregroundStyle(SolennixColors.warning)

            Text(cancelPending ? tr("settings.subscription.cancel_pending", "Cancela al vencer") : tr("settings.subscription.active_title", "Suscripción activa"))
                .font(.subheadline)
                .fontWeight(.semibold)

            Spacer()

            HStack(spacing: Spacing.xs) {
                Image(systemName: cancelPending ? "exclamationmark.triangle.fill" : "checkmark.seal.fill")
                    .foregroundStyle(accent)

                Text(cancelPending ? tr("settings.subscription.pending", "Pendiente") : tr("settings.subscription.active", "Activo"))
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(accent)
            }
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 4)
            .background(accent.opacity(0.15))
            .clipShape(Capsule())
        }
        .padding(Spacing.md)
        .background(accent.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Features Section

    private var featuresSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(tr("settings.subscription.features_included", "Funciones incluidas"))
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
        // Server-authored strings are the source of truth. Fall back to the
        // enum only when talking to an older backend that did not yet
        // populate `source_badge` / `cancel_instructions`.
        let badgeText = (sub.sourceBadge?.isEmpty == false ? sub.sourceBadge : nil)
            ?? providerBadgeFallback(sub.provider)
        let instructionsText = (sub.cancelInstructions?.isEmpty == false ? sub.cancelInstructions : nil)
            ?? providerCancelFallback(sub.provider)

        return VStack(spacing: Spacing.sm) {
            // Provider badge
            HStack(spacing: Spacing.sm) {
                Image(systemName: providerIcon(sub.provider))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)

                Text(badgeText)
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

                    Text(instructionsText)
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

    private func providerBadgeFallback(_ provider: SubscriptionProvider) -> String {
        switch provider {
        case .stripe: return tr("settings.subscription.provider_web", "Suscrito vía web")
        case .apple: return tr("settings.subscription.provider_ios", "Suscrito vía App Store")
        case .google: return tr("settings.subscription.provider_android", "Suscrito vía Google Play")
        }
    }

    private func providerCancelFallback(_ provider: SubscriptionProvider) -> String {
        switch provider {
        case .stripe:
            return tr("settings.subscription.cancel_web", "Tu suscripción fue realizada desde la web. Para cancelarla, ingresá a solennix.com > Configuración > Suscripción.")
        case .apple:
            return tr("settings.subscription.cancel_ios", "Para cancelar, abrí Configuración > tu Apple ID > Suscripciones en tu iPhone o iPad.")
        case .google:
            return tr("settings.subscription.cancel_android", "Tu suscripción fue realizada desde Android. Para cancelarla, abrí Google Play Store > Pagos y suscripciones.")
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
                        Text(tr("settings.subscription.upgrade_plan", "Mejorar plan"))
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
                    Text(tr("settings.subscription.view_all_plans", "Ver todos los planes"))
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
                        Text(tr("settings.subscription.manage", "Administrar suscripción"))
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
                    Text(tr("settings.subscription.restore_purchases", "Restaurar compras"))
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

    /// Label strategy (mirrors backend/Stripe/RevenueCat contract): display
    /// the literal plan the user is on. `.premium` is a legacy DB value that
    /// predates the Pro/Business split and is rendered as "Pro". The
    /// `subscriptionManager.isPremium` flag is just "RC entitlement active"
    /// and cannot distinguish Pro from Business, so the user model wins.
    private var currentPlanName: String {
        guard let user = viewModel.user else {
            return subscriptionManager.isPremium ? tr("settings.plan.pro", "Pro") : tr("settings.plan.basic", "Básico")
        }
        switch user.plan {
        case .basic:
            return subscriptionManager.isPremium ? tr("settings.plan.pro", "Pro") : tr("settings.plan.basic", "Básico")
        case .pro, .premium: return tr("settings.plan.pro", "Pro")
        case .business: return tr("settings.plan.business", "Business")
        }
    }

    private var isPremiumUser: Bool {
        subscriptionManager.isPremium || (viewModel.user?.plan.isPaid ?? false)
    }

    private var currentPlanFeatures: [String] {
        if isPremiumUser {
            return [
                tr("settings.subscription.feature.unlimited_products", "Productos ilimitados"),
                tr("settings.subscription.feature.unlimited_clients", "Clientes ilimitados"),
                tr("settings.subscription.feature.unlimited_events", "Eventos ilimitados"),
                tr("settings.subscription.feature.ios_widgets", "Widgets de iOS"),
                tr("settings.subscription.feature.siri_shortcuts", "Comandos de Siri"),
                tr("settings.subscription.feature.priority_support", "Soporte prioritario"),
                tr("settings.subscription.feature.no_pdf_watermark", "Sin marca de agua en PDFs"),
                tr("settings.subscription.feature.custom_branding", "Marca personalizada")
            ]
        } else {
            return [
                tr("settings.subscription.feature.up_to_20_products", "Hasta 20 productos"),
                tr("settings.subscription.feature.up_to_50_clients", "Hasta 50 clientes"),
                tr("settings.subscription.feature.up_to_3_events", "Hasta 3 eventos por mes"),
                tr("settings.subscription.feature.contract_generation", "Generación de contratos"),
                tr("settings.subscription.feature.event_calendar", "Calendario de eventos"),
                tr("settings.subscription.feature.basic_reports", "Reportes básicos")
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
                    Text(tr("settings.subscription.terms", "Términos"))
                }
                .accessibilityHint(tr("settings.subscription.terms_hint", "Abre los términos de uso en Safari"))

                Text("•")
                    .foregroundStyle(SolennixColors.textTertiary)

                Button {
                    HapticsHelper.play(.selection)
                    legalSheetURL = IdentifiableURL(LegalURL.privacy)
                } label: {
                    Text(tr("settings.subscription.privacy", "Privacidad"))
                }
                .accessibilityHint(tr("settings.subscription.privacy_hint", "Abre la política de privacidad en Safari"))
            }
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(SolennixColors.primary)
            .buttonStyle(.plain)

            Text(tr("settings.subscription.footer", "© 2025 Solennix por Creapolis"))
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

import SwiftUI
import StoreKit
import SolennixCore
import SolennixDesign
import SolennixNetwork
import RevenueCat

// MARK: - Pricing View

public struct PricingView: View {

    @State private var viewModel: SettingsViewModel
    @State private var selectedPlan: Plan = .basic
    @State private var showError: Bool = false
    @State private var purchaseErrorMessage: String = ""
    @State private var legalSheetURL: IdentifiableURL?
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Header
                headerSection

                // Estado de suscripcion activa
                if subscriptionManager.isPremium {
                    activeSubscriptionSection
                }

                // Plan cards
                planCardsSection

                // Feature comparison
                featureComparisonSection

                // Restaurar compras y administrar suscripcion
                subscriptionActionsSection

                // API Legal requirements (EULA and Privacy)
                subscriptionDisclosureSection
                legalLinksSection

                // FAQ section
                faqSection
            }
            .padding(Spacing.lg)
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("settings.pricing.title", "Planes y Precios"))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadUser()
            if let user = viewModel.user {
                selectedPlan = user.plan
            }
            await subscriptionManager.loadOfferings()
            await subscriptionManager.checkEntitlementStatus()
        }
        .alert(tr("settings.pricing.error.title", "Error"), isPresented: $showError) {
            Button(tr("settings.pricing.alert.accept", "Aceptar"), role: .cancel) {}
        } message: {
            Text(purchaseErrorMessage)
        }
        .sheet(item: $legalSheetURL) { wrapper in
            SafariView(url: wrapper.url)
                .ignoresSafeArea()
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: Spacing.md) {
            if let user = viewModel.user {
                HStack {
                    Text(tr("settings.pricing.current_plan_label", "Tu plan actual:"))
                    PlanBadge(plan: user.plan)
                }
                .font(.subheadline)
            }

            Text(tr("settings.pricing.subtitle", "Elige el plan que mejor se adapte a tu negocio"))
                .font(.headline)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Active Subscription Section

    private var activeSubscriptionSection: some View {
        VStack(spacing: Spacing.sm) {
            HStack {
                Image(systemName: "crown.fill")
                    .foregroundStyle(SolennixColors.warning)

                Text(activeSubscriptionTitle)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(SolennixColors.success)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.success.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Plan Cards Section

    private var planCardsSection: some View {
        let layout = sizeClass == .regular
            ? AnyLayout(HStackLayout(alignment: .top, spacing: Spacing.md))
            : AnyLayout(VStackLayout(spacing: Spacing.md))

        return layout {
            // Basic plan
            planCard(
                plan: .basic,
                title: tr("settings.pricing.plan.basic", "Básico"),
                price: tr("settings.pricing.plan.free", "Gratis"),
                features: [
                    tr("settings.pricing.features.basic.products", "Hasta 20 productos"),
                    tr("settings.pricing.features.basic.clients", "Hasta 50 clientes"),
                    tr("settings.pricing.features.basic.contracts", "Generación de contratos"),
                    tr("settings.pricing.features.basic.calendar", "Calendario de eventos")
                ],
                isCurrentPlan: viewModel.user?.plan == .basic
            )

            // Pro plan
            planCard(
                plan: .pro,
                title: tr("settings.pricing.plan.pro", "Pro"),
                price: formattedProPrice,
                features: [
                    tr("settings.pricing.features.pro.products", "Productos ilimitados"),
                    tr("settings.pricing.features.pro.clients", "Clientes ilimitados"),
                    tr("settings.pricing.features.pro.widgets", "Widgets de iOS"),
                    tr("settings.pricing.features.pro.siri", "Comandos de Siri"),
                    tr("settings.pricing.features.pro.support", "Soporte prioritario"),
                    tr("settings.pricing.features.pro.no_watermark", "Sin marca de agua en PDFs")
                ],
                isCurrentPlan: isCurrentProTier,
                isRecommended: true
            )
        }
    }

    // MARK: - Formatted Pro Price

    /// Muestra el precio del package mensual (RevenueCat → StoreKit → fallback).
    private var formattedProPrice: String {
        if let monthly = subscriptionManager.monthlyPackage {
            return FeatureL10n.format("settings.pricing.period.monthly_value", "%@/mes", monthly.storeProduct.localizedPriceString)
        }
        if let fallback = subscriptionManager.fallbackMonthlyProduct {
            return FeatureL10n.format("settings.pricing.period.monthly_value", "%@/mes", fallback.displayPrice)
        }
        return tr("settings.pricing.period.monthly_fallback", "$6.99 USD/mes")
    }

    /// Precio anual formateado (RevenueCat → StoreKit → fallback).
    private var formattedYearlyPrice: String {
        if let yearly = subscriptionManager.yearlyPackage {
            return FeatureL10n.format("settings.pricing.period.yearly_value", "%@/año", yearly.storeProduct.localizedPriceString)
        }
        if let fallback = subscriptionManager.fallbackYearlyProduct {
            return FeatureL10n.format("settings.pricing.period.yearly_value", "%@/año", fallback.displayPrice)
        }
        return tr("settings.pricing.period.yearly_fallback", "$49.99 USD/año")
    }

    // MARK: - Plan Card

    private func planCard(
        plan: Plan,
        title: String,
        price: String,
        features: [String],
        isCurrentPlan: Bool,
        isRecommended: Bool = false
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack {
                        Text(title)
                            .font(.title3)
                            .fontWeight(.bold)

                        if isRecommended {
                            Text(tr("settings.pricing.recommended", "Recomendado"))
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.onPrimary)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, 2)
                                .background(SolennixGradient.premium)
                                .clipShape(Capsule())
                        }
                    }

                    Text(price)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.primary)

                    // Mostrar precio anual para la tarjeta Pro (incluye alias legacy premium).
                    if plan == .pro || plan == .premium {
                        Text(formattedYearlyPrice)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()

                if isCurrentPlan {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(SolennixColors.success)
                }
            }

            Divider()

            // Features
            VStack(alignment: .leading, spacing: Spacing.sm) {
                ForEach(features, id: \.self) { feature in
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "checkmark")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.success)

                        Text(feature)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }
            }

            // Action button — solo mostrar si el plan pago no está activo
            if !isCurrentPlan && plan == .pro && !subscriptionManager.isPremium {
                purchaseButtonsSection
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .stroke(
                    isCurrentPlan ? SolennixColors.primary : Color.clear,
                    lineWidth: 2
                )
        )
        .shadowSm()
    }

    // MARK: - Purchase Buttons Section

    private var purchaseButtonsSection: some View {
        VStack(spacing: Spacing.sm) {
            // Boton mensual — RevenueCat package o StoreKit fallback
            if let monthly = subscriptionManager.monthlyPackage {
                purchaseButton(
                    title: FeatureL10n.format("settings.pricing.button.monthly", "Suscribirse Mensual - %@", monthly.storeProduct.localizedPriceString),
                    isPrimary: true
                ) {
                    await handlePurchase(monthly)
                }
            } else if let product = subscriptionManager.fallbackMonthlyProduct {
                purchaseButton(
                    title: FeatureL10n.format("settings.pricing.button.monthly", "Suscribirse Mensual - %@", product.displayPrice),
                    isPrimary: true
                ) {
                    await handleStoreKitPurchase(product)
                }
            } else {
                // Hardcoded fallback — always show a buy button
                purchaseButton(
                    title: FeatureL10n.format("settings.pricing.button.monthly", "Suscribirse Mensual - %@", "$6.99 USD"),
                    isPrimary: true
                ) {
                    await subscriptionManager.loadOfferings()
                    if let monthly = subscriptionManager.monthlyPackage {
                        await handlePurchase(monthly)
                    } else if let product = subscriptionManager.fallbackMonthlyProduct {
                        await handleStoreKitPurchase(product)
                    } else {
                        purchaseErrorMessage = tr("settings.pricing.error.load_products", "No se pudieron cargar los productos. Verifica tu conexion e intenta de nuevo.")
                        showError = true
                    }
                }
            }

            // Boton anual — RevenueCat package o StoreKit fallback
            if let yearly = subscriptionManager.yearlyPackage {
                purchaseButton(
                    title: FeatureL10n.format("settings.pricing.button.yearly", "Suscribirse Anual - %@", yearly.storeProduct.localizedPriceString),
                    isPrimary: false
                ) {
                    await handlePurchase(yearly)
                }
            } else if let product = subscriptionManager.fallbackYearlyProduct {
                purchaseButton(
                    title: FeatureL10n.format("settings.pricing.button.yearly", "Suscribirse Anual - %@", product.displayPrice),
                    isPrimary: false
                ) {
                    await handleStoreKitPurchase(product)
                }
            } else {
                // Hardcoded fallback — always show a buy button
                purchaseButton(
                    title: FeatureL10n.format("settings.pricing.button.yearly", "Suscribirse Anual - %@", "$49.99 USD"),
                    isPrimary: false
                ) {
                    await subscriptionManager.loadOfferings()
                    if let yearly = subscriptionManager.yearlyPackage {
                        await handlePurchase(yearly)
                    } else if let product = subscriptionManager.fallbackYearlyProduct {
                        await handleStoreKitPurchase(product)
                    } else {
                        purchaseErrorMessage = tr("settings.pricing.error.load_products", "No se pudieron cargar los productos. Verifica tu conexion e intenta de nuevo.")
                        showError = true
                    }
                }
            }

            // Error message
            if let error = subscriptionManager.errorMessage, subscriptionManager.currentOffering == nil && subscriptionManager.storeProducts.isEmpty {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .multilineTextAlignment(.center)
                    .padding(.top, Spacing.xs)
            }

            if subscriptionManager.isLoading {
                ProgressView()
                    .padding(.vertical, Spacing.sm)
            }
        }
    }

    // MARK: - Purchase Button Helper

    private func purchaseButton(
        title: String,
        isPrimary: Bool,
        action: @escaping () async -> Void
    ) -> some View {
        Button {
            HapticsHelper.play(.medium)
            Task { await action() }
        } label: {
            HStack {
                if subscriptionManager.isPurchasing {
                    ProgressView()
                        .tint(isPrimary ? SolennixColors.onPrimary : SolennixColors.primary)
                }
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            .foregroundStyle(isPrimary ? SolennixColors.onPrimary : SolennixColors.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.sm)
            .background(isPrimary ? AnyShapeStyle(SolennixGradient.premium) : AnyShapeStyle(SolennixColors.primary.opacity(0.1)))
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        }
        .buttonStyle(.plain)
        .disabled(subscriptionManager.isPurchasing)
    }

    // MARK: - Subscription Actions Section

    private var subscriptionActionsSection: some View {
        VStack(spacing: Spacing.sm) {
            // Restaurar compras
            Button {
                HapticsHelper.play(.light)
                Task { await subscriptionManager.restorePurchases() }
            } label: {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text(tr("settings.pricing.actions.restore", "Restaurar compras"))
                }
                .font(.subheadline)
                .foregroundStyle(SolennixColors.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.sm)
            }
            .buttonStyle(.plain)
            .disabled(subscriptionManager.isLoading)

            // Administrar suscripcion (solo si es premium)
            if subscriptionManager.isPremium {
                Button {
                    Task { await subscriptionManager.openSubscriptionManagement() }
                } label: {
                    HStack {
                        Image(systemName: "gearshape")
                        Text(tr("settings.pricing.actions.manage", "Administrar suscripción"))
                    }
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Handle Purchase

    private func handlePurchase(_ package: RevenueCat.Package) async {
        do {
            try await subscriptionManager.purchase(package)
            HapticsHelper.play(.success)
        } catch let error as SubscriptionError {
            if case .userCancelled = error {
                return
            }
            HapticsHelper.play(.error)
            purchaseErrorMessage = error.localizedDescription
            showError = true
        } catch {
            HapticsHelper.play(.error)
            purchaseErrorMessage = tr("settings.pricing.purchase.error_unexpected", "Ocurrió un error inesperado al procesar la compra.")
            showError = true
        }
    }

    // MARK: - Handle StoreKit Purchase (Fallback)

    private func handleStoreKitPurchase(_ product: StoreKit.Product) async {
        do {
            try await subscriptionManager.purchaseStoreKitProduct(product)
            HapticsHelper.play(.success)
        } catch let error as SubscriptionError {
            if case .userCancelled = error { return }
            HapticsHelper.play(.error)
            purchaseErrorMessage = error.localizedDescription
            showError = true
        } catch {
            HapticsHelper.play(.error)
            purchaseErrorMessage = tr("settings.pricing.purchase.error_unexpected", "Ocurrió un error inesperado al procesar la compra.")
            showError = true
        }
    }

    // MARK: - Feature Comparison Section

    private var featureComparisonSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(tr("settings.pricing.comparison.title", "Comparación de funciones"))
                .font(.headline)

            VStack(spacing: 0) {
                comparisonRow(feature: tr("settings.pricing.comparison.feature.products", "Productos"), basic: "20", premium: tr("settings.pricing.comparison.unlimited", "Ilimitados"))
                comparisonRow(feature: tr("settings.pricing.comparison.feature.clients", "Clientes"), basic: "50", premium: tr("settings.pricing.comparison.unlimited", "Ilimitados"))
                comparisonRow(feature: tr("settings.pricing.comparison.feature.pdf", "Generación de PDFs"), basic: true, premium: true)
                comparisonRow(feature: tr("settings.pricing.comparison.feature.widgets", "Widgets"), basic: false, premium: true)
                comparisonRow(feature: tr("settings.pricing.comparison.feature.siri", "Comandos de Siri"), basic: false, premium: true)
                comparisonRow(feature: tr("settings.pricing.comparison.feature.support", "Soporte prioritario"), basic: false, premium: true)
            }
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
    }

    private func comparisonRow(feature: String, basic: String, premium: String) -> some View {
        HStack {
            Text(feature)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text(basic)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .frame(width: 80)

            Text(premium)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.primary)
                .frame(width: 80)
        }
        .padding(Spacing.md)
    }

    private func comparisonRow(feature: String, basic: Bool, premium: Bool) -> some View {
        HStack {
            Text(feature)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)

            Image(systemName: basic ? "checkmark" : "xmark")
                .font(.subheadline)
                .foregroundStyle(basic ? SolennixColors.success : SolennixColors.textTertiary)
                .frame(width: 80)

            Image(systemName: premium ? "checkmark" : "xmark")
                .font(.subheadline)
                .foregroundStyle(premium ? SolennixColors.success : SolennixColors.textTertiary)
                .frame(width: 80)
        }
        .padding(Spacing.md)
    }

    // MARK: - FAQ Section

    private var faqSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(tr("settings.pricing.faq.title", "Preguntas frecuentes"))
                .font(.headline)

            faqItem(
                question: tr("settings.pricing.faq.cancel_anytime.q", "¿Puedo cancelar en cualquier momento?"),
                answer: tr("settings.pricing.faq.cancel_anytime.a", "Sí, puedes cancelar tu suscripción en cualquier momento. Tu plan premium seguirá activo hasta el final del período de facturación.")
            )

            faqItem(
                question: tr("settings.pricing.faq.downgrade.q", "¿Qué pasa con mis datos si bajo de plan?"),
                answer: tr("settings.pricing.faq.downgrade.a", "Tus datos se mantienen, pero no podrás crear más productos o clientes si excedes los límites del plan básico.")
            )

            faqItem(
                question: tr("settings.pricing.faq.trial.q", "¿Hay período de prueba?"),
                answer: tr("settings.pricing.faq.trial.a", "Sí. Ofrecemos 14 días de prueba gratuita del plan Pro. Al finalizar el período de prueba, la suscripción se renovará automáticamente al precio del plan seleccionado, a menos que la canceles al menos 24 horas antes de que termine el trial. Puedes cancelar en cualquier momento desde los Ajustes de tu Apple ID.")
            )
        }
    }

    // MARK: - Plan Helpers

    /// Android parity: Business is a paid tier but not the same as Pro.
    /// Keep Pro card highlighted only for users on Pro (or legacy Premium)
    /// and for RC-only users where backend plan is not yet loaded.
    private var isCurrentProTier: Bool {
        if let user = viewModel.user {
            return user.plan == .pro || user.plan == .premium
        }
        return subscriptionManager.isPremium
    }

    private var activeSubscriptionTitle: String {
        if let user = viewModel.user {
            switch user.plan {
            case .basic:
                return tr("settings.pricing.status.premium_active", "Suscripción activa")
            case .business:
                return tr("settings.pricing.status.business_active", "Suscripción Business activa")
            case .pro:
                return tr("settings.pricing.status.pro_active", "Suscripción Pro activa")
            case .premium:
                return tr("settings.pricing.status.premium_active", "Suscripción activa")
            }
        }
        return subscriptionManager.isPremium
            ? tr("settings.pricing.status.pro_active", "Suscripción Pro activa")
            : tr("settings.pricing.status.premium_active", "Suscripción activa")
    }

    private func faqItem(question: String, answer: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(question)
                .font(.subheadline)
                .fontWeight(.medium)

            Text(answer)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Subscription Disclosure Section

    private var subscriptionDisclosureSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(tr("settings.pricing.disclosure.title", "Información de suscripción"))
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.textSecondary)

            Text(tr("settings.pricing.disclosure.body", "El pago se cargará a tu cuenta de Apple ID al confirmar la compra. La suscripción se renovará automáticamente a menos que sea cancelada al menos 24 horas antes del final del período actual. Se cobrará a tu cuenta la renovación dentro de las 24 horas anteriores al final del período actual, al precio del plan seleccionado. Las suscripciones pueden ser administradas por el usuario y la renovación automática puede desactivarse yendo a los Ajustes de la cuenta del App Store después de la compra. No se permite la cancelación de la suscripción actual durante el período activo."))
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
                .lineSpacing(2)
        }
        .padding(Spacing.md)
        .background(SolennixColors.surfaceAlt)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Legal Links Section

    private var legalLinksSection: some View {
        VStack(spacing: Spacing.md) {
            HStack(spacing: Spacing.lg) {
                Button {
                    HapticsHelper.play(.selection)
                    legalSheetURL = IdentifiableURL(LegalURL.terms)
                } label: {
                    Text(tr("settings.pricing.legal.terms", "Términos de Uso (EULA)"))
                }
                .accessibilityHint(tr("settings.pricing.legal.terms_hint", "Abre los términos de uso en Safari"))

                Text("•")
                    .foregroundStyle(SolennixColors.textTertiary)

                Button {
                    HapticsHelper.play(.selection)
                    legalSheetURL = IdentifiableURL(LegalURL.privacy)
                } label: {
                    Text(tr("settings.pricing.legal.privacy", "Privacidad"))
                }
                .accessibilityHint(tr("settings.pricing.legal.privacy_hint", "Abre la política de privacidad en Safari"))
            }
            .font(.body)
            .fontWeight(.bold)
            .foregroundStyle(SolennixColors.primary)
            .buttonStyle(.plain)

            Text(tr("settings.pricing.legal.creapolis", "Solennix es un producto de Creapolis"))
                .font(.caption2)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.xl)
    }
}

// MARK: - Preview

#Preview("Pricing") {
    NavigationStack {
        PricingView(apiClient: APIClient(), authManager: AuthManager(keychain: KeychainHelper.standard))
            .environment(SubscriptionManager())
    }
}

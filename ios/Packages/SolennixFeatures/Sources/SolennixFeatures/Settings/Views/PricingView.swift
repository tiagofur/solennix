import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork
import StoreKit

// MARK: - Pricing View

public struct PricingView: View {

    @State private var viewModel: SettingsViewModel
    @State private var selectedPlan: Plan = .basic
    @State private var showError: Bool = false
    @State private var purchaseErrorMessage: String = ""
    @Environment(SubscriptionManager.self) private var subscriptionManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient))
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

                // FAQ section
                faqSection
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("Planes y Precios")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadUser()
            if let user = viewModel.user {
                selectedPlan = user.plan
            }
            await subscriptionManager.loadProducts()
            await subscriptionManager.updateSubscriptionStatus()
        }
        .alert("Error", isPresented: $showError) {
            Button("Aceptar", role: .cancel) {}
        } message: {
            Text(purchaseErrorMessage)
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: Spacing.md) {
            if let user = viewModel.user {
                HStack {
                    Text("Tu plan actual:")
                    PlanBadge(plan: user.plan)
                }
                .font(.subheadline)
            }

            Text("Elige el plan que mejor se adapte a tu negocio")
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

                Text("Suscripcion Premium activa")
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
        VStack(spacing: Spacing.md) {
            // Basic plan
            planCard(
                plan: .basic,
                title: "Basico",
                price: "Gratis",
                features: [
                    "Hasta 20 productos",
                    "Hasta 50 clientes",
                    "Generacion de contratos",
                    "Calendario de eventos"
                ],
                isCurrentPlan: viewModel.user?.plan == .basic
            )

            // Premium plan
            planCard(
                plan: .premium,
                title: "Premium",
                price: formattedPremiumPrice,
                features: [
                    "Productos ilimitados",
                    "Clientes ilimitados",
                    "Widgets de iOS",
                    "Comandos de Siri",
                    "Soporte prioritario",
                    "Sin marca de agua en PDFs"
                ],
                isCurrentPlan: viewModel.user?.plan == .premium || subscriptionManager.isPremium,
                isRecommended: true
            )
        }
    }

    // MARK: - Formatted Premium Price

    /// Muestra el precio del producto mensual de StoreKit, o el precio por defecto.
    private var formattedPremiumPrice: String {
        if let monthly = subscriptionManager.monthlyProduct {
            return "\(monthly.displayPrice)/mes"
        }
        return "$199 MXN/mes"
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
                            Text("Recomendado")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, 2)
                                .background(SolennixGradient.premium)
                                .clipShape(Capsule())
                        }
                    }

                    Text(price)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.primary)

                    // Mostrar precio anual si esta disponible
                    if plan == .premium, let yearly = subscriptionManager.yearlyProduct {
                        Text("\(yearly.displayPrice)/ano")
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

            // Action button - solo mostrar si no es premium activo
            if !isCurrentPlan && plan == .premium && !subscriptionManager.isPremium {
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
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    // MARK: - Purchase Buttons Section

    private var purchaseButtonsSection: some View {
        VStack(spacing: Spacing.sm) {
            // Boton mensual
            if let monthly = subscriptionManager.monthlyProduct {
                Button {
                    Task { await handlePurchase(monthly) }
                } label: {
                    HStack {
                        if subscriptionManager.isPurchasing {
                            ProgressView()
                                .tint(.white)
                        }
                        Text("Suscribirse Mensual - \(monthly.displayPrice)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                    .background(SolennixGradient.premium)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
                .buttonStyle(.plain)
                .disabled(subscriptionManager.isPurchasing)
            }

            // Boton anual
            if let yearly = subscriptionManager.yearlyProduct {
                Button {
                    Task { await handlePurchase(yearly) }
                } label: {
                    HStack {
                        if subscriptionManager.isPurchasing {
                            ProgressView()
                                .tint(SolennixColors.primary)
                        }
                        Text("Suscribirse Anual - \(yearly.displayPrice)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(SolennixColors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                    .background(SolennixColors.primary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
                .buttonStyle(.plain)
                .disabled(subscriptionManager.isPurchasing)
            }

            // Fallback si los productos no se cargaron
            if subscriptionManager.products.isEmpty && !subscriptionManager.isLoading {
                Button {
                    Task { await subscriptionManager.loadProducts() }
                } label: {
                    Text("Actualizar a Premium")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.sm)
                        .background(SolennixGradient.premium)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
                .buttonStyle(.plain)
            }

            if subscriptionManager.isLoading {
                ProgressView()
                    .padding(.vertical, Spacing.sm)
            }
        }
    }

    // MARK: - Subscription Actions Section

    private var subscriptionActionsSection: some View {
        VStack(spacing: Spacing.sm) {
            // Restaurar compras
            Button {
                Task { await subscriptionManager.restorePurchases() }
            } label: {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Restaurar compras")
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
                        Text("Administrar suscripcion")
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

    private func handlePurchase(_ product: Product) async {
        do {
            try await subscriptionManager.purchase(product)
        } catch let error as SubscriptionError {
            if case .userCancelled = error {
                // No mostrar error si el usuario cancelo voluntariamente
                return
            }
            purchaseErrorMessage = error.localizedDescription
            showError = true
        } catch {
            purchaseErrorMessage = "Ocurrio un error inesperado al procesar la compra."
            showError = true
        }
    }

    // MARK: - Feature Comparison Section

    private var featureComparisonSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Comparacion de funciones")
                .font(.headline)

            VStack(spacing: 0) {
                comparisonRow(feature: "Productos", basic: "20", premium: "Ilimitados")
                comparisonRow(feature: "Clientes", basic: "50", premium: "Ilimitados")
                comparisonRow(feature: "Generacion de PDFs", basic: true, premium: true)
                comparisonRow(feature: "Widgets", basic: false, premium: true)
                comparisonRow(feature: "Comandos de Siri", basic: false, premium: true)
                comparisonRow(feature: "Soporte prioritario", basic: false, premium: true)
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
            Text("Preguntas frecuentes")
                .font(.headline)

            faqItem(
                question: "Puedo cancelar en cualquier momento?",
                answer: "Si, puedes cancelar tu suscripcion en cualquier momento. Tu plan premium seguira activo hasta el final del periodo de facturacion."
            )

            faqItem(
                question: "Que pasa con mis datos si bajo de plan?",
                answer: "Tus datos se mantienen, pero no podras crear mas productos o clientes si excedes los limites del plan basico."
            )

            faqItem(
                question: "Hay periodo de prueba?",
                answer: "Puedes probar todas las funciones premium durante 14 dias gratis."
            )
        }
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
}

// MARK: - Preview

#Preview("Pricing") {
    NavigationStack {
        PricingView(apiClient: APIClient())
            .environment(SubscriptionManager())
    }
}

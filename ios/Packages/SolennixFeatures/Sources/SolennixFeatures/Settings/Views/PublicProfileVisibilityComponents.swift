import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Visibility Section

/// The 8 visibility toggles. Free features are bound directly; Pro features
/// use gated bindings (read falls back to `false` unless paid) and show a lock.
/// Tapping a locked row surfaces pricing via `onLockedTap`.
struct PublicProfileVisibilitySection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel
    let onLockedTap: () -> Void

    var body: some View {
        Section {
            visibilityToggle(
                title: FeatureL10n.text("settings.public_profile.show_prices", "Mostrar precios en mis servicios"),
                icon: "dollarsign.circle",
                isOn: $viewModel.showPrices,
                locked: false
            )
            visibilityToggle(
                title: FeatureL10n.text("settings.public_profile.show_services", "Mostrar servicios"),
                icon: "shippingbox",
                isOn: $viewModel.showServices,
                locked: false
            )
            visibilityToggle(
                title: FeatureL10n.text("settings.public_profile.show_contact", "Mostrar contacto"),
                icon: "phone",
                isOn: $viewModel.showContact,
                locked: false
            )

            visibilityToggle(
                title: FeatureL10n.text("settings.public_profile.show_reviews", "Mostrar reseñas de clientes"),
                icon: "star",
                isOn: paidBinding($viewModel.showReviews),
                locked: !viewModel.isPaid
            )
            visibilityToggle(
                title: FeatureL10n.text("settings.public_profile.show_portfolio", "Mostrar portafolio"),
                icon: "photo.on.rectangle",
                isOn: paidBinding($viewModel.showPortfolio),
                locked: !viewModel.isPaid
            )
            visibilityToggle(
                title: FeatureL10n.text("settings.public_profile.show_packages", "Mostrar paquetes"),
                icon: "shippingbox.fill",
                isOn: paidBinding($viewModel.showPackages),
                locked: !viewModel.isPaid
            )
            visibilityToggle(
                title: FeatureL10n.text("settings.public_profile.show_faq", "Mostrar preguntas frecuentes"),
                icon: "questionmark.bubble",
                isOn: paidBinding($viewModel.showFaq),
                locked: !viewModel.isPaid
            )
            visibilityToggle(
                title: FeatureL10n.text("settings.public_profile.show_policies", "Mostrar políticas"),
                icon: "doc.text",
                isOn: paidBinding($viewModel.showPolicies),
                locked: !viewModel.isPaid
            )
        } header: {
            Text(FeatureL10n.text("settings.public_profile.visibility", "Visibilidad"))
        } footer: {
            Text(FeatureL10n.text(
                "settings.public_profile.visibility_hint",
                "Los servicios salen de tus productos. Precios e imágenes se actualizan solos."
            ))
        }
    }

    /// Wraps a paid-only flag so free users read `false` and cannot write.
    @MainActor
    private func paidBinding(_ source: Binding<Bool>) -> Binding<Bool> {
        Binding(
            get: { viewModel.isPaid ? source.wrappedValue : false },
            set: { if viewModel.isPaid { source.wrappedValue = $0 } }
        )
    }

    @ViewBuilder
    private func visibilityToggle(
        title: String,
        icon: String,
        isOn: Binding<Bool>,
        locked: Bool
    ) -> some View {
        Toggle(isOn: isOn) {
            Label {
                HStack(spacing: Spacing.xs) {
                    Text(title)
                    if locked {
                        Image(systemName: "lock.fill")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            } icon: {
                Image(systemName: icon)
            }
        }
        .disabled(locked)
        .opacity(locked ? 0.55 : 1)
        .solennixRow()
        .onTapGesture {
            if locked {
                onLockedTap()
            }
        }
    }
}

// MARK: - Pro Upsell Section

/// Shown only when the user is not on a paid plan. Tapping opens pricing.
struct PublicProfileProUpsellSection: View {
    let onTap: () -> Void

    var body: some View {
        Section {
            Button(action: onTap) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "lock.fill")
                        .foregroundStyle(SolennixColors.primary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(FeatureL10n.text(
                            "settings.public_profile.pro_only_title",
                            "Reseñas, portafolio y redes en Pro"
                        ))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)
                        Text(FeatureL10n.text(
                            "settings.public_profile.pro_only_hint",
                            "Mejorá tu plan para mostrar reseñas públicas, portafolio de eventos y redes sociales."
                        ))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(Spacing.sm)
                .background(SolennixColors.primaryLight)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .buttonStyle(.plain)
            .solennixRow()
        }
    }
}

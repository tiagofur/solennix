import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - About / Business Details Section (Pro+)

/// Shows a Pro-only hint when free, otherwise the full business detail form:
/// about, service areas, event types, languages, guest range and response time.
struct PublicProfileAboutSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel

    var body: some View {
        Section {
            if !viewModel.isPaid {
                Text(FeatureL10n.text(
                    "settings.public_profile.about_pro_hint",
                    "La descripción y los detalles del negocio están disponibles en el plan Pro."
                ))
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
                .solennixRow()
            } else {
                TextField(
                    FeatureL10n.text("settings.public_profile.about", "Sobre tu negocio"),
                    text: $viewModel.about,
                    axis: .vertical
                )
                .lineLimit(3...6)
                .solennixRow()

                TextField(
                    FeatureL10n.text("settings.public_profile.service_areas", "Zonas de servicio"),
                    text: $viewModel.serviceAreasText
                )
                .solennixRow()

                TextField(
                    FeatureL10n.text("settings.public_profile.event_types", "Tipos de evento"),
                    text: $viewModel.eventTypesText
                )
                .solennixRow()

                TextField(
                    FeatureL10n.text("settings.public_profile.languages", "Idiomas"),
                    text: $viewModel.languagesText
                )
                .solennixRow()

                AdaptiveFormRow {
                    HStack(spacing: Spacing.sm) {
                        TextField(
                            FeatureL10n.text("settings.public_profile.min_guests", "Invitados mín."),
                            text: $viewModel.minGuestsText
                        )
                        .keyboardType(.numberPad)
                        TextField(
                            FeatureL10n.text("settings.public_profile.max_guests", "Invitados máx."),
                            text: $viewModel.maxGuestsText
                        )
                        .keyboardType(.numberPad)
                    }
                } right: {
                    TextField(
                        FeatureL10n.text("settings.public_profile.response_time", "Tiempo de respuesta"),
                        text: $viewModel.responseTime
                    )
                }
                .solennixRow()
            }
        } header: {
            HStack(spacing: Spacing.xs) {
                Text(FeatureL10n.text("settings.public_profile.about_section", "Sobre tu negocio"))
                if !viewModel.isPaid {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        } footer: {
            if viewModel.isPaid {
                Text(FeatureL10n.text(
                    "settings.public_profile.lists_hint",
                    "Listas separadas por coma (ej. Bodas, Corporativos, Cumpleaños)."
                ))
            }
        }
    }
}

// MARK: - Socials Section (Pro+)

/// Social handles text field, disabled and dimmed for free users.
struct PublicProfileSocialsSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel

    var body: some View {
        Section {
            TextField(
                FeatureL10n.text(
                    "settings.public_profile.socials_placeholder",
                    "instagram=@mipagina,site=https://mipagina.com"
                ),
                text: $viewModel.socialsText,
                axis: .vertical
            )
            .lineLimit(2...4)
            .disabled(!viewModel.isPaid)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .foregroundStyle(viewModel.isPaid ? SolennixColors.text : SolennixColors.textTertiary)
            .solennixRow()
        } header: {
            HStack(spacing: Spacing.xs) {
                Text(FeatureL10n.text("settings.public_profile.socials", "Redes sociales"))
                if !viewModel.isPaid {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        } footer: {
            Text(
                viewModel.isPaid
                    ? FeatureL10n.text(
                        "settings.public_profile.socials_hint",
                        "Formato: red=valor, separados por coma."
                    )
                    : FeatureL10n.text(
                        "settings.public_profile.socials_pro_hint",
                        "Las redes sociales están disponibles en el plan Pro."
                    )
            )
        }
    }
}

import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Shared closure type

/// View-scoped async trigger shared by the async sections (Services/Packages/
/// FAQ/Portfolio). Wraps `ViewScopedTask.start` so operations are cancelled on
/// disappear. Declared as a typealias so it can be stored on a struct (a plain
/// closure stored property cannot be `@escaping`, but a named type can).
public typealias PublicProfileScopedStart = (@escaping @MainActor () async -> Void) -> Void

// MARK: - Intro + Enable Section

/// Description text and the master "enable public profile" toggle.
struct PublicProfileIntroSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel

    var body: some View {
        Section {
            Text(FeatureL10n.text(
                "settings.public_profile.description",
                "Creá una página pública para que tus clientes te conozcan."
            ))
            .font(.subheadline)
            .foregroundStyle(SolennixColors.textSecondary)
            .solennixRow()

            Toggle(isOn: $viewModel.isEnabled) {
                Label {
                    Text(FeatureL10n.text("settings.public_profile.enable", "Activar perfil público"))
                } icon: {
                    Image(systemName: "globe")
                }
            }
            .solennixRow()
        } footer: {
            Text(FeatureL10n.text(
                "settings.public_profile.enable_hint",
                "Cuando está activo, cualquiera puede ver tu página en solennix.com/u/tu-slug."
            ))
        }
    }
}

// MARK: - Headline Section

struct PublicProfileHeadlineSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel

    var body: some View {
        Section {
            TextField(
                FeatureL10n.text("settings.public_profile.headline", "Frase destacada"),
                text: $viewModel.headline,
                axis: .vertical
            )
            .lineLimit(2...4)
            .solennixRow()
        } header: {
            Text(FeatureL10n.text("settings.public_profile.headline", "Frase destacada"))
        } footer: {
            Text(FeatureL10n.text(
                "settings.public_profile.headline_hint",
                "Una frase corta que aparece bajo el nombre de tu negocio."
            ))
        }
    }
}

// MARK: - Location Section (2-col on iPad via AdaptiveFormRow)

struct PublicProfileLocationSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel

    var body: some View {
        Section {
            AdaptiveFormRow {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    TextField(
                        FeatureL10n.text("settings.public_profile.city", "Ciudad"),
                        text: $viewModel.city
                    )
                    TextField(
                        FeatureL10n.text("settings.public_profile.region", "Región"),
                        text: $viewModel.region
                    )
                }
            } right: {
                TextField(
                    FeatureL10n.text("settings.public_profile.country", "País"),
                    text: $viewModel.country
                )
            }
            .solennixRow()
        } header: {
            Text(FeatureL10n.text("settings.public_profile.location", "Ubicación"))
        }
    }
}

// MARK: - Contact Section

struct PublicProfileContactSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel

    private func contactTypeLabel(_ type: PublicContactType) -> String {
        switch type {
        case .phone:
            return FeatureL10n.text("settings.public_profile.contact_types.phone", "Teléfono")
        case .whatsapp:
            return FeatureL10n.text("settings.public_profile.contact_types.whatsapp", "WhatsApp")
        case .email:
            return FeatureL10n.text("settings.public_profile.contact_types.email", "Email")
        case .url:
            return FeatureL10n.text("settings.public_profile.contact_types.url", "Sitio web")
        }
    }

    private var contactKeyboard: UIKeyboardType {
        switch viewModel.contactType {
        case .phone, .whatsapp: return .phonePad
        case .email: return .emailAddress
        case .url: return .URL
        }
    }

    var body: some View {
        Section {
            Picker(
                FeatureL10n.text("settings.public_profile.contact_type", "Tipo"),
                selection: $viewModel.contactType
            ) {
                ForEach(PublicContactType.allCases, id: \.self) { type in
                    Text(contactTypeLabel(type)).tag(type)
                }
            }
            .solennixRow()

            TextField(
                FeatureL10n.text("settings.public_profile.contact_value", "Valor de contacto"),
                text: $viewModel.contactValue
            )
            .keyboardType(contactKeyboard)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .solennixRow()
        } header: {
            Text(FeatureL10n.text("settings.public_profile.contact", "Contacto público"))
        } footer: {
            Text(FeatureL10n.text(
                "settings.public_profile.contact_hint",
                "Un solo canal público (email, WhatsApp, teléfono o web)."
            ))
        }
    }
}

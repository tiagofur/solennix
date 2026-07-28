import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Public Profile Settings View

public struct PublicProfileSettingsView: View {

    @State private var viewModel: PublicProfileSettingsViewModel
    @State private var scoped: ViewScopedTask?
    @Environment(\.dismiss) private var dismiss

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: PublicProfileSettingsViewModel(apiClient: apiClient))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView(tr("settings.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                formContent
            }
        }
        .navigationTitle(
            tr("settings.public_profile.title", "Perfil público profesional")
        )
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                SolennixSaveButton(
                    title: tr("common.save", "Guardar"),
                    action: {
                        scoped?.start {
                            _ = await viewModel.save()
                        }
                    },
                    isValid: viewModel.slugError == nil,
                    isSaving: viewModel.isSaving
                )
            }
        }
        .task {
            await viewModel.load()
        }
        .viewScopedTask(scoped: $scoped)
    }

    // MARK: - Form

    private var formContent: some View {
        Form {
            Section {
                Text(
                    tr(
                        "settings.public_profile.description",
                        "Creá una página pública para que tus clientes te conozcan."
                    )
                )
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

                Toggle(isOn: $viewModel.isEnabled) {
                    Text(tr("settings.public_profile.enable", "Activar perfil público"))
                }
            }

            // Slug + share
            Section {
                TextField(
                    tr("settings.public_profile.slug_placeholder", "mi-negocio"),
                    text: Binding(
                        get: { viewModel.slug },
                        set: { viewModel.handleSlugChange($0) }
                    )
                )
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.asciiCapable)

                if let slugError = viewModel.slugError {
                    Text(slugError)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                }

                if let shareURL = viewModel.shareURL {
                    Text(shareURL)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .textSelection(.enabled)

                    HStack(spacing: Spacing.sm) {
                        ShareLink(item: shareURL) {
                            Label(
                                tr("settings.public_profile.share", "Compartir"),
                                systemImage: "square.and.arrow.up"
                            )
                        }

                        Button {
                            UIPasteboard.general.string = shareURL
                            viewModel.markCopied()
                        } label: {
                            Label(
                                viewModel.didCopyShareURL
                                    ? tr("settings.public_profile.copied", "¡Copiado!")
                                    : tr("settings.public_profile.copy", "Copiar"),
                                systemImage: viewModel.didCopyShareURL
                                    ? "checkmark"
                                    : "doc.on.doc"
                            )
                        }
                    }
                }
            } header: {
                Text(tr("settings.public_profile.slug", "Dirección pública (slug)"))
            }

            // Headline
            Section {
                TextField(
                    tr("settings.public_profile.headline", "Frase destacada"),
                    text: $viewModel.headline
                )
            } header: {
                Text(tr("settings.public_profile.headline", "Frase destacada"))
            }

            // Location
            Section {
                TextField(
                    tr("settings.public_profile.city", "Ciudad"),
                    text: $viewModel.city
                )
                TextField(
                    tr("settings.public_profile.region", "Región"),
                    text: $viewModel.region
                )
                TextField(
                    tr("settings.public_profile.country", "País"),
                    text: $viewModel.country
                )
            } header: {
                Text(tr("settings.public_profile.location", "Ubicación"))
            }

            // Contact
            Section {
                Picker(
                    tr("settings.public_profile.contact_type", "Tipo"),
                    selection: $viewModel.contactType
                ) {
                    ForEach(PublicContactType.allCases, id: \.self) { type in
                        Text(contactTypeLabel(type)).tag(type)
                    }
                }
                TextField(
                    tr("settings.public_profile.contact_value", "Valor de contacto"),
                    text: $viewModel.contactValue
                )
                .keyboardType(contactKeyboard)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            } header: {
                Text(tr("settings.public_profile.contact", "Contacto público"))
            }

            // Visibility toggles
            Section {
                Toggle(
                    tr("settings.public_profile.show_prices", "Mostrar precios en mis servicios"),
                    isOn: $viewModel.showPrices
                )
                Toggle(
                    tr("settings.public_profile.show_services", "Mostrar servicios"),
                    isOn: $viewModel.showServices
                )
                Toggle(
                    tr("settings.public_profile.show_contact", "Mostrar contacto"),
                    isOn: $viewModel.showContact
                )

                Toggle(isOn: Binding(
                    get: { viewModel.isPaid ? viewModel.showReviews : false },
                    set: { if viewModel.isPaid { viewModel.showReviews = $0 } }
                )) {
                    HStack {
                        Text(tr("settings.public_profile.show_reviews", "Mostrar reseñas de clientes"))
                        if !viewModel.isPaid {
                            Image(systemName: "lock.fill")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                    }
                }
                .disabled(!viewModel.isPaid)

                Toggle(isOn: Binding(
                    get: { viewModel.isPaid ? viewModel.showPortfolio : false },
                    set: { if viewModel.isPaid { viewModel.showPortfolio = $0 } }
                )) {
                    HStack {
                        Text(tr("settings.public_profile.show_portfolio", "Mostrar portafolio"))
                        if !viewModel.isPaid {
                            Image(systemName: "lock.fill")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                    }
                }
                .disabled(!viewModel.isPaid)
            } header: {
                Text(tr("settings.public_profile.visibility", "Visibilidad"))
            }

            // Socials (Pro+)
            Section {
                TextField(
                    tr(
                        "settings.public_profile.socials_placeholder",
                        "instagram=@mipagina,site=https://mipagina.com"
                    ),
                    text: $viewModel.socialsText
                )
                .disabled(!viewModel.isPaid)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

                if !viewModel.isPaid {
                    Text(
                        tr(
                            "settings.public_profile.socials_pro_hint",
                            "Las redes sociales están disponibles en el plan Pro."
                        )
                    )
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
                }
            } header: {
                HStack {
                    Text(tr("settings.public_profile.socials", "Redes sociales"))
                    if !viewModel.isPaid {
                        Image(systemName: "lock.fill")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            }

            // Portfolio (Pro+)
            portfolioSection

            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                }
            }
        }
    }

    // MARK: - Portfolio section

    @ViewBuilder
    private var portfolioSection: some View {
        Section {
            if !viewModel.isPaid {
                Text(
                    tr(
                        "settings.public_profile.portfolio_pro_hint",
                        "El portafolio está disponible en el plan Pro."
                    )
                )
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
            } else if viewModel.portfolioLoading {
                ProgressView()
            } else if viewModel.portfolio.isEmpty {
                Text(
                    tr(
                        "settings.public_profile.portfolio_empty",
                        "Todavía no hay elementos en el portafolio."
                    )
                )
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            } else {
                ForEach(viewModel.portfolio) { item in
                    HStack(spacing: Spacing.sm) {
                        AsyncImage(url: URL(string: item.thumbnailUrl ?? item.photoUrl)) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFill()
                            default:
                                Color.gray.opacity(0.15)
                            }
                        }
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.title)
                                .font(.subheadline.weight(.medium))
                                .lineLimit(1)
                            if let date = item.eventDate, !date.isEmpty {
                                Text(date)
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                        }

                        Spacer()

                        Button(role: .destructive) {
                            scoped?.start {
                                await viewModel.deletePortfolioItem(id: item.id)
                            }
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.borderless)
                    }
                }
            }

            if viewModel.isPaid, viewModel.portfolio.count < PublicProfileSettingsViewModel.portfolioMax {
                TextField(
                    tr("settings.public_profile.portfolio_title", "Título"),
                    text: $viewModel.newPortfolioTitle
                )
                TextField(
                    tr("settings.public_profile.portfolio_photo_url", "URL de la foto"),
                    text: $viewModel.newPortfolioPhotoUrl
                )
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
                TextField(
                    tr("settings.public_profile.portfolio_event_date", "Fecha del evento (YYYY-MM-DD)"),
                    text: $viewModel.newPortfolioEventDate
                )
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

                Button {
                    scoped?.start {
                        await viewModel.addPortfolioItem()
                    }
                } label: {
                    if viewModel.isAddingPortfolio {
                        ProgressView()
                    } else {
                        Text(tr("settings.public_profile.portfolio_add", "Agregar"))
                    }
                }
                .disabled(
                    viewModel.isAddingPortfolio
                        || viewModel.newPortfolioTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        || viewModel.newPortfolioPhotoUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                )
            }

            if viewModel.isPaid, viewModel.portfolio.count >= PublicProfileSettingsViewModel.portfolioMax {
                Text(
                    tr(
                        "settings.public_profile.portfolio_max",
                        "Ya tenés 6 elementos en el portafolio."
                    )
                )
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            }

            if let portfolioError = viewModel.portfolioError {
                Text(portfolioError)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
            }
        } header: {
            HStack {
                Text(tr("settings.public_profile.portfolio", "Portafolio"))
                if !viewModel.isPaid {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        } footer: {
            if viewModel.isPaid {
                Text(
                    tr(
                        "settings.public_profile.portfolio_description",
                        "Mostrá hasta 6 eventos en tu página pública (Pro)."
                    )
                )
            }
        }
    }

    // MARK: - Helpers

    private func contactTypeLabel(_ type: PublicContactType) -> String {
        switch type {
        case .phone:
            return tr("settings.public_profile.contact_types.phone", "Teléfono")
        case .whatsapp:
            return tr("settings.public_profile.contact_types.whatsapp", "WhatsApp")
        case .email:
            return tr("settings.public_profile.contact_types.email", "Email")
        case .url:
            return tr("settings.public_profile.contact_types.url", "Sitio web")
        }
    }

    private var contactKeyboard: UIKeyboardType {
        switch viewModel.contactType {
        case .phone, .whatsapp: return .phonePad
        case .email: return .emailAddress
        case .url: return .URL
        }
    }
}

#Preview {
    NavigationStack {
        PublicProfileSettingsView(apiClient: APIClient())
    }
}

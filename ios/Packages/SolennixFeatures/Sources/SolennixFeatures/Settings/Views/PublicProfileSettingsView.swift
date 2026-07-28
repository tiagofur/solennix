import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Public Profile Settings View

/// Settings screen for the organizer public professional profile.
/// Visual style matches `EditProfileView` / `BusinessSettingsView`
/// (Form + `.solennixListStyle()` + `.solennixRow()` + design tokens).
public struct PublicProfileSettingsView: View {

    @State private var viewModel: PublicProfileSettingsViewModel
    @State private var scoped: ViewScopedTask?
    @State private var showPricingSheet = false
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthManager.self) private var authManager
    @Environment(\.apiClient) private var apiClient

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
        .sheet(isPresented: $showPricingSheet) {
            PricingView(apiClient: apiClient, authManager: authManager)
        }
        .task {
            await viewModel.load()
        }
        .viewScopedTask(scoped: $scoped)
    }

    // MARK: - Form

    private var formContent: some View {
        Form {
            // Intro + enable
            Section {
                Text(
                    tr(
                        "settings.public_profile.description",
                        "Creá una página pública para que tus clientes te conozcan."
                    )
                )
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .solennixRow()

                Toggle(isOn: $viewModel.isEnabled) {
                    Label {
                        Text(tr("settings.public_profile.enable", "Activar perfil público"))
                    } icon: {
                        Image(systemName: "globe")
                    }
                }
                .solennixRow()
            } footer: {
                Text(
                    tr(
                        "settings.public_profile.enable_hint",
                        "Cuando está activo, cualquiera puede ver tu página en solennix.com/u/tu-slug."
                    )
                )
            }

            // Slug + share
            Section {
                VStack(alignment: .leading, spacing: Spacing.xs) {
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
                    .textContentType(.URL)

                    if let slugError = viewModel.slugError {
                        Text(slugError)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                    }
                }
                .solennixRow()

                if let shareURL = viewModel.shareURL {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text(shareURL)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                            .textSelection(.enabled)

                        HStack(spacing: Spacing.md) {
                            ShareLink(item: shareURL) {
                                Label(
                                    tr("settings.public_profile.share", "Compartir"),
                                    systemImage: "square.and.arrow.up"
                                )
                                .font(.subheadline.weight(.medium))
                            }
                            .buttonStyle(.bordered)

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
                                .font(.subheadline.weight(.medium))
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .solennixRow()
                }
            } header: {
                Text(tr("settings.public_profile.slug", "Dirección pública (slug)"))
            } footer: {
                Text(
                    tr(
                        "settings.public_profile.slug_hint",
                        "Solo minúsculas, números y guiones. Es el enlace que compartirás."
                    )
                )
            }

            // Headline
            Section {
                TextField(
                    tr("settings.public_profile.headline", "Frase destacada"),
                    text: $viewModel.headline,
                    axis: .vertical
                )
                .lineLimit(2...4)
                .solennixRow()
            } header: {
                Text(tr("settings.public_profile.headline", "Frase destacada"))
            } footer: {
                Text(
                    tr(
                        "settings.public_profile.headline_hint",
                        "Una frase corta que aparece bajo el nombre de tu negocio."
                    )
                )
            }

            // Location (2-col on iPad via AdaptiveFormRow)
            Section {
                AdaptiveFormRow {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        TextField(
                            tr("settings.public_profile.city", "Ciudad"),
                            text: $viewModel.city
                        )
                        TextField(
                            tr("settings.public_profile.region", "Región"),
                            text: $viewModel.region
                        )
                    }
                } right: {
                    TextField(
                        tr("settings.public_profile.country", "País"),
                        text: $viewModel.country
                    )
                }
                .solennixRow()
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
                .solennixRow()

                TextField(
                    tr("settings.public_profile.contact_value", "Valor de contacto"),
                    text: $viewModel.contactValue
                )
                .keyboardType(contactKeyboard)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .solennixRow()
            } header: {
                Text(tr("settings.public_profile.contact", "Contacto público"))
            } footer: {
                Text(
                    tr(
                        "settings.public_profile.contact_hint",
                        "Un solo canal público (email, WhatsApp, teléfono o web)."
                    )
                )
            }

            // Visibility toggles
            Section {
                visibilityToggle(
                    title: tr("settings.public_profile.show_prices", "Mostrar precios en mis servicios"),
                    icon: "dollarsign.circle",
                    isOn: $viewModel.showPrices,
                    locked: false
                )
                visibilityToggle(
                    title: tr("settings.public_profile.show_services", "Mostrar servicios"),
                    icon: "shippingbox",
                    isOn: $viewModel.showServices,
                    locked: false
                )
                visibilityToggle(
                    title: tr("settings.public_profile.show_contact", "Mostrar contacto"),
                    icon: "phone",
                    isOn: $viewModel.showContact,
                    locked: false
                )

                visibilityToggle(
                    title: tr("settings.public_profile.show_reviews", "Mostrar reseñas de clientes"),
                    icon: "star",
                    isOn: Binding(
                        get: { viewModel.isPaid ? viewModel.showReviews : false },
                        set: { if viewModel.isPaid { viewModel.showReviews = $0 } }
                    ),
                    locked: !viewModel.isPaid
                )

                visibilityToggle(
                    title: tr("settings.public_profile.show_portfolio", "Mostrar portafolio"),
                    icon: "photo.on.rectangle",
                    isOn: Binding(
                        get: { viewModel.isPaid ? viewModel.showPortfolio : false },
                        set: { if viewModel.isPaid { viewModel.showPortfolio = $0 } }
                    ),
                    locked: !viewModel.isPaid
                )
            } header: {
                Text(tr("settings.public_profile.visibility", "Visibilidad"))
            } footer: {
                Text(
                    tr(
                        "settings.public_profile.visibility_hint",
                        "Los servicios salen de tus productos. Precios e imágenes se actualizan solos."
                    )
                )
            }

            // Pro upsell for locked features
            if !viewModel.isPaid {
                Section {
                    Button {
                        showPricingSheet = true
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "lock.fill")
                                .foregroundStyle(SolennixColors.primary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(
                                    tr(
                                        "settings.public_profile.pro_only_title",
                                        "Reseñas, portafolio y redes en Pro"
                                    )
                                )
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.text)
                                Text(
                                    tr(
                                        "settings.public_profile.pro_only_hint",
                                        "Mejorá tu plan para mostrar reseñas públicas, portafolio de eventos y redes sociales."
                                    )
                                )
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

            // Socials (Pro+)
            Section {
                TextField(
                    tr(
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
                    Text(tr("settings.public_profile.socials", "Redes sociales"))
                    if !viewModel.isPaid {
                        Image(systemName: "lock.fill")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            } footer: {
                Text(
                    viewModel.isPaid
                        ? tr(
                            "settings.public_profile.socials_hint",
                            "Formato: red=valor, separados por coma."
                        )
                        : tr(
                            "settings.public_profile.socials_pro_hint",
                            "Las redes sociales están disponibles en el plan Pro."
                        )
                )
            }

            // Portfolio (Pro+)
            portfolioSection

            // Error
            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                        .solennixRow()
                }
            }
        }
        .solennixListStyle()
    }

    // MARK: - Visibility toggle row

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
                showPricingSheet = true
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
                .solennixRow()
            } else if viewModel.portfolioLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .solennixRow()
            } else if viewModel.portfolio.isEmpty {
                Text(
                    tr(
                        "settings.public_profile.portfolio_empty",
                        "Todavía no hay elementos en el portafolio."
                    )
                )
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .solennixRow()
            } else {
                ForEach(viewModel.portfolio) { item in
                    portfolioRow(item)
                        .solennixRow()
                }
            }

            if viewModel.isPaid, viewModel.portfolio.count < PublicProfileSettingsViewModel.portfolioMax {
                TextField(
                    tr("settings.public_profile.portfolio_title", "Título"),
                    text: $viewModel.newPortfolioTitle
                )
                .solennixRow()

                TextField(
                    tr("settings.public_profile.portfolio_photo_url", "URL de la foto"),
                    text: $viewModel.newPortfolioPhotoUrl
                )
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
                .solennixRow()

                TextField(
                    tr("settings.public_profile.portfolio_event_date", "Fecha del evento (YYYY-MM-DD)"),
                    text: $viewModel.newPortfolioEventDate
                )
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .solennixRow()

                Button {
                    scoped?.start {
                        await viewModel.addPortfolioItem()
                    }
                } label: {
                    HStack {
                        Spacer()
                        if viewModel.isAddingPortfolio {
                            ProgressView()
                        } else {
                            Label(
                                tr("settings.public_profile.portfolio_add", "Agregar"),
                                systemImage: "plus.circle.fill"
                            )
                            .font(.subheadline.weight(.semibold))
                        }
                        Spacer()
                    }
                }
                .disabled(
                    viewModel.isAddingPortfolio
                        || viewModel.newPortfolioTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        || viewModel.newPortfolioPhotoUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                )
                .solennixRow()
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
                .solennixRow()
            }

            if let portfolioError = viewModel.portfolioError {
                Text(portfolioError)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .solennixRow()
            }
        } header: {
            HStack(spacing: Spacing.xs) {
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

    private func portfolioRow(_ item: OrganizerPublicPortfolioItem) -> some View {
        HStack(spacing: Spacing.sm) {
            portfolioThumbnail(for: item)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(SolennixColors.text)
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
                    .foregroundStyle(SolennixColors.error)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(tr("common.delete", "Eliminar"))
        }
        .padding(.vertical, Spacing.xs)
    }

    @ViewBuilder
    private func portfolioThumbnail(for item: OrganizerPublicPortfolioItem) -> some View {
        let raw = item.thumbnailUrl ?? item.photoUrl
        let url = APIClient.resolveURL(raw) ?? URL(string: raw)
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
            case .empty:
                ProgressView()
            default:
                ZStack {
                    SolennixColors.surface
                    Image(systemName: "photo")
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        }
        .frame(width: 48, height: 48)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.sm)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
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

// MARK: - Preview

#Preview {
    NavigationStack {
        PublicProfileSettingsView(apiClient: APIClient())
    }
}

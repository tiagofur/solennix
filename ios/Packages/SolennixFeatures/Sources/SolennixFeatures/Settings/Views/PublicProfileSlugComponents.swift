import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Slug + Share Section

/// Public slug editor (with validation error) and the share/copy block.
struct PublicProfileSlugSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                TextField(
                    FeatureL10n.text("settings.public_profile.slug_placeholder", "mi-negocio"),
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
                PublicProfileShareBlock(shareURL: shareURL, viewModel: viewModel)
                    .solennixRow()
            }

            let trimmedSlug = viewModel.slug.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmedSlug.isEmpty, viewModel.slugError == nil {
                NavigationLink(value: Route.publicProfilePreview(slug: trimmedSlug)) {
                    Label(
                        FeatureL10n.text("settings.public_profile.preview", "Ver perfil público"),
                        systemImage: "eye"
                    )
                    .font(.subheadline.weight(.medium))
                }
                .solennixRow()
            }
        } header: {
            Text(FeatureL10n.text("settings.public_profile.slug", "Dirección pública (slug)"))
        } footer: {
            Text(FeatureL10n.text(
                "settings.public_profile.slug_hint",
                "Solo minúsculas, números y guiones. Es el enlace que compartirás."
            ))
        }
    }
}

// MARK: - Share Block

/// Renders the resolved public URL with share + copy buttons.
/// `viewModel.markCopied()` flips `didCopyShareURL` so the copy label/icon swaps.
private struct PublicProfileShareBlock: View {
    let shareURL: String
    @Bindable var viewModel: PublicProfileSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(shareURL)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
                .textSelection(.enabled)

            HStack(spacing: Spacing.md) {
                ShareLink(item: shareURL) {
                    Label(
                        FeatureL10n.text("settings.public_profile.share", "Compartir"),
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
                            ? FeatureL10n.text("settings.public_profile.copied", "¡Copiado!")
                            : FeatureL10n.text("settings.public_profile.copy", "Copiar"),
                        systemImage: viewModel.didCopyShareURL
                            ? "checkmark"
                            : "doc.on.doc"
                    )
                    .font(.subheadline.weight(.medium))
                }
                .buttonStyle(.bordered)
            }
        }
    }
}

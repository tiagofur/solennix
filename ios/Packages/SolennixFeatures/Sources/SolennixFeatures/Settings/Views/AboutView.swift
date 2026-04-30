import SwiftUI
import SolennixDesign
import SolennixCore

// MARK: - About View

public struct AboutView: View {

    @Environment(\.openURL) private var openURL
    @State private var legalSheetURL: IdentifiableURL?

    public init() {}

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        ScrollView {
            AdaptiveCenteredContent(maxWidth: 600) {
                VStack(spacing: Spacing.xl) {
                    // App icon and name
                    appHeaderSection

                    // App info
                    appInfoSection

                    // Legal info
                    legalSection

                    // Social links
                    socialLinksSection

                    // Credits
                    creditsSection
                }
                .padding(Spacing.lg)
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("settings.action.about", "Acerca de"))
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $legalSheetURL) { wrapper in
            SafariView(url: wrapper.url)
                .ignoresSafeArea()
        }
    }

    // MARK: - App Header Section

    private var appHeaderSection: some View {
        VStack(spacing: Spacing.md) {
            // App icon
            Image(systemName: "sparkles.rectangle.stack")
                .font(.system(size: 64))
                .foregroundStyle(SolennixGradient.premium)

            Text("Solennix")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text(tr("settings.about.subtitle", "Gestión de eventos simplificada"))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .padding(.vertical, Spacing.lg)
    }

    // MARK: - App Info Section

    private var appInfoSection: some View {
        VStack(spacing: Spacing.sm) {
            infoRow(label: tr("settings.about.version", "Versión"), value: Bundle.main.appVersion)
            infoRow(label: tr("settings.about.developed_by", "Desarrollado por"), value: "Creapolis")
            infoRow(label: tr("settings.about.website", "Sitio web"), value: "solennix.com", isLink: true)
            infoRow(label: tr("settings.about.support", "Soporte"), value: "soporte@solennix.com", isLink: true)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    private func infoRow(label: String, value: String, isLink: Bool = false) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(SolennixColors.textSecondary)

            Spacer()

            if isLink {
                Text(value)
                    .foregroundStyle(SolennixColors.primary)
            } else {
                Text(value)
                    .foregroundStyle(SolennixColors.text)
            }
        }
        .font(.subheadline)
    }

    // MARK: - Legal Section

    private var legalSection: some View {
        VStack(spacing: 0) {
            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.terms)
            } label: {
                HStack {
                    Text(tr("settings.about.terms_eula", "Términos de uso (EULA)"))
                    Spacer()
                    Image(systemName: "arrow.up.right.square")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(Spacing.md)
                .contentShape(Rectangle())
            }
            .accessibilityHint(tr("settings.about.terms_hint", "Abre los términos de uso en Safari"))

            Divider()
                .padding(.leading, Spacing.md)

            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.privacy)
            } label: {
                HStack {
                    Text(tr("settings.about.privacy_policy", "Política de privacidad"))
                    Spacer()
                    Image(systemName: "arrow.up.right.square")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(Spacing.md)
                .contentShape(Rectangle())
            }
            .accessibilityHint(tr("settings.about.privacy_hint", "Abre la política de privacidad en Safari"))
        }
        .font(.subheadline)
        .foregroundStyle(SolennixColors.text)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .buttonStyle(.plain)
    }

    // MARK: - Social Links Section

    private var socialLinksSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(tr("settings.about.follow_us", "Síguenos"))
                .font(.headline)

            HStack(spacing: Spacing.lg) {
                socialButton(icon: "globe", label: "Web", urlString: "https://solennix.com")
                socialButton(icon: "camera", label: "Instagram", urlString: "https://instagram.com/solennix")
                socialButton(icon: "message", label: "Twitter", urlString: "https://x.com/solennix")
                socialButton(icon: "play.rectangle", label: "YouTube", urlString: "https://youtube.com/@solennix")
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func socialButton(icon: String, label: String, urlString: String) -> some View {
        Button {
            guard let url = URL(string: urlString) else { return }
            HapticsHelper.play(.selection)
            openURL(url)
        } label: {
            VStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(SolennixColors.primary)

                Text(label)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
            .frame(width: 60)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Credits Section

    private var creditsSection: some View {
        VStack(spacing: Spacing.md) {
            Text(tr("settings.about.credits", "Agradecimientos"))
                .font(.headline)

            Text(tr("settings.about.credits_message", "Gracias a todos nuestros usuarios por confiar en Solennix para gestionar sus eventos. Tu retroalimentación nos ayuda a mejorar constantemente."))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .multilineTextAlignment(.center)

            Text(tr("settings.about.made_in", "Hecho con amor en México"))
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .padding(Spacing.md)
    }
}

// MARK: - Preview

#Preview("About") {
    NavigationStack {
        AboutView()
    }
}

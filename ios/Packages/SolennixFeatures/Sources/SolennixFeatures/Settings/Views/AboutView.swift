import SwiftUI
import SolennixDesign
import SolennixCore

// MARK: - About View

public struct AboutView: View {

    @State private var legalSheetURL: IdentifiableURL?

    public init() {}

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
        .navigationTitle("Acerca de")
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

            Text("Gestion de eventos simplificada")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .padding(.vertical, Spacing.lg)
    }

    // MARK: - App Info Section

    private var appInfoSection: some View {
        VStack(spacing: Spacing.sm) {
            infoRow(label: "Version", value: Bundle.main.appVersion)
            infoRow(label: "Desarrollado por", value: "Creapolis")
            infoRow(label: "Sitio web", value: "solennix.com", isLink: true)
            infoRow(label: "Soporte", value: "soporte@solennix.com", isLink: true)
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
                    Text("Terminos de Uso (EULA)")
                    Spacer()
                    Image(systemName: "arrow.up.right.square")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(Spacing.md)
                .contentShape(Rectangle())
            }
            .accessibilityHint("Abre los terminos de uso en Safari")

            Divider()
                .padding(.leading, Spacing.md)

            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.privacy)
            } label: {
                HStack {
                    Text("Politica de Privacidad")
                    Spacer()
                    Image(systemName: "arrow.up.right.square")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(Spacing.md)
                .contentShape(Rectangle())
            }
            .accessibilityHint("Abre la politica de privacidad en Safari")
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
            Text("Siguenos")
                .font(.headline)

            HStack(spacing: Spacing.lg) {
                socialButton(icon: "globe", label: "Web")
                socialButton(icon: "camera", label: "Instagram")
                socialButton(icon: "message", label: "Twitter")
                socialButton(icon: "play.rectangle", label: "YouTube")
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func socialButton(icon: String, label: String) -> some View {
        Button {
            // TODO: Open social link
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
            Text("Agradecimientos")
                .font(.headline)

            Text("Gracias a todos nuestros usuarios por confiar en Solennix para gestionar sus eventos. Tu retroalimentacion nos ayuda a mejorar constantemente.")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .multilineTextAlignment(.center)

            Text("Hecho con amor en Mexico")
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

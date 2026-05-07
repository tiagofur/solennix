import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Appearance Theme Enum

public enum AppearanceTheme: String, CaseIterable, Identifiable {
    case system = "system"
    case light = "light"
    case dark = "dark"
    
    public var id: String { self.rawValue }
    
    public var displayName: String {
        switch self {
        case .system: return FeatureL10n.text("settings.theme.system_default", "Predeterminado del sistema")
        case .light: return FeatureL10n.text("settings.theme.light", "Claro")
        case .dark: return FeatureL10n.text("settings.theme.dark", "Oscuro")
        }
    }
}

// MARK: - Settings View

public struct SettingsView: View {

    @State private var viewModel: SettingsViewModel
    @State private var showLogoutConfirm: Bool = false
    @State private var legalSheetURL: IdentifiableURL?
    @State private var selectedLanguage: String = "es"

    @AppStorage("appearance") private var appearance: String = "system"
    @AppStorage("preferredLocale") private var preferredLocale: String = ""
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(ToastManager.self) private var toastManager

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
    }

    public var body: some View {
        settingsList
            .frame(maxWidth: sizeClass == .regular ? 640 : .infinity)
            .frame(maxWidth: .infinity)
            .listStyle(.insetGrouped)
            .tint(SolennixColors.primary)
            .scrollContentBackground(.hidden)
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle(tr("settings.title", "Ajustes"))
            .navigationBarTitleDisplayMode(.large)
            .confirmationDialog(
                tr("settings.action.logout", "Cerrar sesión"),
                isPresented: $showLogoutConfirm
            ) {
                Button(tr("settings.action.logout", "Cerrar sesión"), role: .destructive) {
                    Task { await viewModel.logout() }
                }
                Button(tr("common.cancel", "Cancelar"), role: .cancel) {}
            } message: {
                Text(tr("settings.logout.confirmation", "¿Estás seguro de que quieres cerrar sesión?"))
            }
            .refreshable {
                await viewModel.loadUser()
                syncSelectedLanguage()
            }
            .task {
                await viewModel.loadUser()
                syncSelectedLanguage()
            }
            .onChange(of: viewModel.user?.preferredLanguage) { _, _ in
                syncSelectedLanguage()
            }
            .onChange(of: selectedLanguage) { oldValue, newValue in
                guard oldValue != newValue else { return }
                Task { await persistLanguageChange(from: oldValue, to: newValue) }
            }
            .sheet(item: $legalSheetURL) { wrapper in
                SafariView(url: wrapper.url)
                    .ignoresSafeArea()
            }
    }

    // MARK: - Settings List

    private var settingsList: some View {
        List {
            // User profile header
            if let user = viewModel.user {
                userHeaderSection(user)
            }

            Section(tr("settings.section.appearance", "Apariencia")) {
                appearanceContent
            }

            Section(tr("settings.section.account", "Cuenta")) {
                accountContent
            }

            Section(tr("settings.section.subscription", "Suscripción")) {
                subscriptionContent
            }

            Section(tr("settings.section.business", "Negocio")) {
                businessContent
            }

            Section(tr("settings.section.legal", "Legal")) {
                legalContent
            }

            // Logout
            Section {
                Button(role: .destructive) {
                    showLogoutConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text(tr("settings.action.logout", "Cerrar sesión"))
                    }
                }
            }

            // App version
            Section {
                HStack {
                    Text(tr("settings.version", "Versión"))
                    Spacer()
                    Text(Bundle.main.appVersion)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
    }

    // MARK: - Section Content Views

    @ViewBuilder
    private var appearanceContent: some View {
        Picker(selection: $appearance, label: Label(tr("settings.theme.label", "Tema"), systemImage: "paintbrush")) {
            ForEach(AppearanceTheme.allCases) { theme in
                Text(theme.displayName).tag(theme.rawValue)
            }
        }

        Picker(selection: $selectedLanguage, label: Label(tr("settings.profile.language", "Idioma"), systemImage: "globe")) {
            Text(tr("settings.language.option.es", "Español")).tag("es")
            Text(tr("settings.language.option.en", "English")).tag("en")
        }
    }

    @ViewBuilder
    private var accountContent: some View {
        NavigationLink(value: Route.editProfile) {
            Label(tr("settings.action.edit_profile", "Editar perfil"), systemImage: "person.circle")
        }

        NavigationLink(value: Route.changePassword) {
            Label(tr("settings.action.change_password", "Cambiar contraseña"), systemImage: "lock.rotation")
        }

        NavigationLink(value: Route.notificationPreferences) {
            Label(tr("settings.tab.notifications", "Notificaciones"), systemImage: "bell.badge")
        }
    }

    @ViewBuilder
    private var subscriptionContent: some View {
        NavigationLink(value: Route.subscription) {
            planRow
        }
    }

    @ViewBuilder
    private var businessContent: some View {
        NavigationLink(value: Route.businessSettings) {
            Label(tr("settings.action.business_settings", "Ajustes del negocio"), systemImage: "building.2")
        }

        NavigationLink(value: Route.contractDefaults) {
            Label(tr("settings.action.contract_defaults", "Valores del contrato"), systemImage: "doc.text")
        }
    }

    @ViewBuilder
    private var legalContent: some View {
        Button {
            HapticsHelper.play(.selection)
            if let url = URL(string: "https://solennix.com/help") {
                legalSheetURL = IdentifiableURL(url)
            }
        } label: {
            HStack {
                Label(tr("settings.action.help", "Centro de ayuda"), systemImage: "questionmark.circle")
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .accessibilityHint(tr("settings.legal.help_hint", "Abre el centro de ayuda en Safari"))

        NavigationLink(value: Route.about) {
            Label(tr("settings.action.about", "Acerca de"), systemImage: "info.circle")
        }

        Button {
            HapticsHelper.play(.selection)
            if let url = URL(string: "https://creapolis.dev/privacy-policy") {
                legalSheetURL = IdentifiableURL(url)
            }
        } label: {
            HStack {
                Label(tr("settings.action.privacy_policy", "Política de privacidad"), systemImage: "hand.raised")
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .accessibilityHint(tr("settings.legal.privacy_hint", "Abre la política de privacidad en Safari"))

        Button {
            HapticsHelper.play(.selection)
            legalSheetURL = IdentifiableURL(LegalURL.terms)
        } label: {
            HStack {
                Label(tr("settings.action.terms_conditions", "Términos y condiciones"), systemImage: "doc.plaintext")
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .accessibilityHint(tr("settings.legal.terms_hint", "Abre los términos de servicio en Safari"))

        Button {
            HapticsHelper.play(.selection)
            if let url = URL(string: "https://creapolis.dev/delete-account") {
                legalSheetURL = IdentifiableURL(url)
            }
        } label: {
            HStack {
                Label(tr("settings.action.delete_account", "Eliminar cuenta"), systemImage: "trash")
                    .foregroundStyle(SolennixColors.error)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .accessibilityHint(tr("settings.legal.delete_hint", "Abre la página de solicitud de eliminación de cuenta en Safari"))
    }

    // MARK: - User Header Section

    private func userHeaderSection(_ user: User) -> some View {
        Section {
            HStack(spacing: Spacing.md) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(SolennixGradient.premium)
                        .frame(width: 60, height: 60)

                    Text(user.name.prefix(1).uppercased())
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(user.name)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Text(user.email)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.xs) {
                        PlanBadge(plan: user.plan)

                        if let businessName = user.businessName, !businessName.isEmpty {
                            Text(businessName)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                    }
                }

                Spacer()
            }
            .padding(.vertical, Spacing.xs)
        }
    }

    // MARK: - Plan Row

    private var planRow: some View {
        HStack {
            Label(tr("settings.action.manage_plan", "Gestionar plan"), systemImage: "star")

            Spacer()

            if let user = viewModel.user {
                PlanBadge(plan: user.plan)
            }
        }
    }

    private func syncSelectedLanguage() {
        let stored = normalizedLanguage(preferredLocale)
        let userLanguage = normalizedLanguage(viewModel.user?.preferredLanguage ?? "")
        let resolved = stored.isEmpty ? (userLanguage.isEmpty ? "es" : userLanguage) : stored
        if selectedLanguage != resolved {
            selectedLanguage = resolved
        }
    }

    private func normalizedLanguage(_ value: String) -> String {
        let code = value.split(separator: "-").first.map(String.init) ?? value
        return ["es", "en"].contains(code) ? code : ""
    }

    @MainActor
    private func persistLanguageChange(from oldValue: String, to newValue: String) async {
        preferredLocale = newValue
        let success = await viewModel.updatePreferredLanguage(newValue)
        if success {
            toastManager.show(message: tr("settings.profile.language_updated", "Idioma actualizado"), type: .success)
        } else {
            preferredLocale = oldValue
            selectedLanguage = oldValue
            toastManager.show(message: viewModel.errorMessage ?? tr("common.error.retry", "Ocurrió un error inesperado. Intenta de nuevo."), type: .error)
        }
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}

// MARK: - Plan Badge

public struct PlanBadge: View {

    let plan: Plan

    public init(plan: Plan) {
        self.plan = plan
    }

    private var planLabel: String {
        switch plan {
        case .basic: return FeatureL10n.text("settings.plan.basic", "Básico")
        case .pro, .premium: return FeatureL10n.text("settings.plan.pro", "Pro")
        case .business: return FeatureL10n.text("settings.plan.business", "Business")
        }
    }

    public var body: some View {
        Text(planLabel)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(plan.isPaid ? .white : SolennixColors.text)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 2)
            .background(
                plan.isPaid
                    ? AnyShapeStyle(SolennixGradient.premium)
                    : AnyShapeStyle(SolennixColors.surface)
            )
            .clipShape(Capsule())
    }
}

// MARK: - Bundle Extension

extension Bundle {
    var appVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}

// MARK: - Preview

#Preview("Settings") {
    NavigationStack {
        SettingsView(apiClient: APIClient(), authManager: AuthManager(keychain: KeychainHelper.standard))
    }
}

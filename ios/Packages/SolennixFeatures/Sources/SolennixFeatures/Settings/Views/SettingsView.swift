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
    private var isRegularWidth: Bool { sizeClass == .regular }
    private var sectionHorizontalPadding: CGFloat { isRegularWidth ? Spacing.xl : Spacing.md }

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
    }

    public var body: some View {
        settingsContent
            .tint(SolennixColors.primary)
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

    // MARK: - Adaptive Layout

    @ViewBuilder
    private var settingsContent: some View {
        if isRegularWidth {
            settingsGridRegular
        } else {
            settingsListCompact
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
        }
    }

    private var settingsGridRegular: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                if let user = viewModel.user {
                    userHeaderCard(user)
                        .padding(.horizontal, sectionHorizontalPadding)
                }

                LazyVGrid(
                    columns: [
                        GridItem(.flexible(), spacing: Spacing.md),
                        GridItem(.flexible(), spacing: Spacing.md)
                    ],
                    spacing: Spacing.md
                ) {
                    appearanceCard
                    accountCard
                    subscriptionCard
                    businessCard
                    legalCard
                    sessionCard
                }
                .padding(.horizontal, sectionHorizontalPadding)

                versionCard
                    .padding(.horizontal, sectionHorizontalPadding)

                Spacer(minLength: Spacing.xl)
            }
            .padding(.vertical, Spacing.sm)
        }
    }

    // MARK: - Settings List

    private var settingsListCompact: some View {
        List {
            // User profile header
            if let user = viewModel.user {
                userHeaderSection(user)
            }

            Section(header: Text(tr("settings.section.appearance", "Apariencia")).foregroundStyle(SolennixColors.text)) {
                appearanceContent
            }
            .listRowBackground(SolennixColors.card)

            Section(header: Text(tr("settings.section.account", "Cuenta")).foregroundStyle(SolennixColors.text)) {
                accountContent
            }
            .listRowBackground(SolennixColors.card)

            Section(header: Text(tr("settings.section.subscription", "Suscripción")).foregroundStyle(SolennixColors.text)) {
                subscriptionContent
            }
            .listRowBackground(SolennixColors.card)

            Section(header: Text(tr("settings.section.business", "Negocio")).foregroundStyle(SolennixColors.text)) {
                businessContent
            }
            .listRowBackground(SolennixColors.card)

            Section(header: Text(tr("settings.section.legal", "Legal")).foregroundStyle(SolennixColors.text)) {
                legalContent
            }
            .listRowBackground(SolennixColors.card)

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
            .listRowBackground(SolennixColors.card)

            // App version
            Section {
                HStack {
                    Text(tr("settings.version", "Versión"))
                    Spacer()
                    Text(Bundle.main.appVersion)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .listRowBackground(SolennixColors.card)
        }
    }

    // MARK: - Regular Width Cards

    private var appearanceCard: some View {
        SettingsCardContainer(title: tr("settings.section.appearance", "Apariencia")) {
            HStack(spacing: Spacing.sm) {
                Label(tr("settings.theme.label", "Tema"), systemImage: "paintbrush")
                Spacer()
                Picker("", selection: $appearance) {
                    ForEach(AppearanceTheme.allCases) { theme in
                        Text(theme.displayName).tag(theme.rawValue)
                    }
                }
                .pickerStyle(.menu)
                .labelsHidden()
            }

            Divider()

            HStack(spacing: Spacing.sm) {
                Label(tr("settings.profile.language", "Idioma"), systemImage: "globe")
                Spacer()
                Picker("", selection: $selectedLanguage) {
                    Text(tr("settings.language.option.es", "Español")).tag("es")
                    Text(tr("settings.language.option.en", "English")).tag("en")
                }
                .pickerStyle(.menu)
                .labelsHidden()
            }
        }
    }

    private var accountCard: some View {
        SettingsCardContainer(title: tr("settings.section.account", "Cuenta")) {
            NavigationLink(value: Route.editProfile) {
                SettingsNavRow(title: tr("settings.action.edit_profile", "Editar perfil"), systemImage: "person.circle")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.changePassword) {
                SettingsNavRow(title: tr("settings.action.change_password", "Cambiar contraseña"), systemImage: "lock.rotation")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.notificationPreferences) {
                SettingsNavRow(title: tr("settings.tab.notifications", "Notificaciones"), systemImage: "bell.badge")
            }
            .buttonStyle(.plain)
        }
    }

    private var subscriptionCard: some View {
        SettingsCardContainer(title: tr("settings.section.subscription", "Suscripción")) {
            NavigationLink(value: Route.subscription) {
                HStack {
                    Label(tr("settings.action.manage_plan", "Gestionar plan"), systemImage: "star")
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    if let user = viewModel.user {
                        PlanBadge(plan: user.plan)
                    }

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var businessCard: some View {
        SettingsCardContainer(title: tr("settings.section.business", "Negocio")) {
            NavigationLink(value: Route.businessSettings) {
                SettingsNavRow(title: tr("settings.action.business_settings", "Ajustes del negocio"), systemImage: "building.2")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.contractDefaults) {
                SettingsNavRow(title: tr("settings.action.contract_defaults", "Valores del contrato"), systemImage: "doc.text")
            }
            .buttonStyle(.plain)
        }
    }

    private var legalCard: some View {
        SettingsCardContainer(title: tr("settings.section.legal", "Legal")) {
            Button {
                HapticsHelper.play(.selection)
                if let url = URL(string: "https://solennix.com/help") {
                    legalSheetURL = IdentifiableURL(url)
                }
            } label: {
                SettingsExternalRow(title: tr("settings.action.help", "Centro de ayuda"), systemImage: "questionmark.circle")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.about) {
                SettingsNavRow(title: tr("settings.action.about", "Acerca de"), systemImage: "info.circle")
            }
            .buttonStyle(.plain)

            Divider()

            Button {
                HapticsHelper.play(.selection)
                if let url = URL(string: "https://creapolis.dev/privacy-policy") {
                    legalSheetURL = IdentifiableURL(url)
                }
            } label: {
                SettingsExternalRow(title: tr("settings.action.privacy_policy", "Política de privacidad"), systemImage: "hand.raised")
            }
            .buttonStyle(.plain)

            Divider()

            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.terms)
            } label: {
                SettingsExternalRow(title: tr("settings.action.terms_conditions", "Términos y condiciones"), systemImage: "doc.plaintext")
            }
            .buttonStyle(.plain)

            Divider()

            Button {
                HapticsHelper.play(.selection)
                if let url = URL(string: "https://creapolis.dev/delete-account") {
                    legalSheetURL = IdentifiableURL(url)
                }
            } label: {
                SettingsExternalRow(
                    title: tr("settings.action.delete_account", "Eliminar cuenta"),
                    systemImage: "trash",
                    color: SolennixColors.error
                )
            }
            .buttonStyle(.plain)
        }
    }

    private var sessionCard: some View {
        SettingsCardContainer(title: tr("settings.action.logout", "Cerrar sesión")) {
            Button(role: .destructive) {
                showLogoutConfirm = true
            } label: {
                HStack {
                    Label(tr("settings.action.logout", "Cerrar sesión"), systemImage: "rectangle.portrait.and.arrow.right")
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var versionCard: some View {
        HStack {
            Text(tr("settings.version", "Versión"))
                .foregroundStyle(SolennixColors.text)
            Spacer()
            Text(Bundle.main.appVersion)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    private func userHeaderCard(_ user: User) -> some View {
        SettingsUserHeaderContent(user: user)
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
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
        .listRowSeparator(.hidden)

        NavigationLink(value: Route.changePassword) {
            Label(tr("settings.action.change_password", "Cambiar contraseña"), systemImage: "lock.rotation")
        }
        .listRowSeparator(.hidden)

        NavigationLink(value: Route.notificationPreferences) {
            Label(tr("settings.tab.notifications", "Notificaciones"), systemImage: "bell.badge")
        }
        .listRowSeparator(.hidden)
    }

    @ViewBuilder
    private var subscriptionContent: some View {
        NavigationLink(value: Route.subscription) {
            planRow
        }
        .listRowSeparator(.hidden)
    }

    @ViewBuilder
    private var businessContent: some View {
        NavigationLink(value: Route.businessSettings) {
            Label(tr("settings.action.business_settings", "Ajustes del negocio"), systemImage: "building.2")
        }
        .listRowSeparator(.hidden)

        NavigationLink(value: Route.contractDefaults) {
            Label(tr("settings.action.contract_defaults", "Valores del contrato"), systemImage: "doc.text")
        }
        .listRowSeparator(.hidden)
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
        .listRowSeparator(.hidden)
        .accessibilityHint(tr("settings.legal.help_hint", "Abre el centro de ayuda en Safari"))

        NavigationLink(value: Route.about) {
            Label(tr("settings.action.about", "Acerca de"), systemImage: "info.circle")
        }
        .listRowSeparator(.hidden)

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
        .listRowSeparator(.hidden)
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
        .listRowSeparator(.hidden)
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
        .listRowSeparator(.hidden)
        .accessibilityHint(tr("settings.legal.delete_hint", "Abre la página de solicitud de eliminación de cuenta en Safari"))
    }

    // MARK: - User Header Section

    private func userHeaderSection(_ user: User) -> some View {
        Section {
            SettingsUserHeaderContent(user: user)
            .padding(.vertical, Spacing.sm)
        }
        .listRowBackground(SolennixColors.card)
        .listRowSeparator(.hidden)
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

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
        case .system: return SettingsStrings.themeSystemDefault
        case .light: return SettingsStrings.themeLight
        case .dark: return SettingsStrings.themeDark
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

    public init(apiClient: APIClient, authManager: AuthManager, subscriptionManager: SubscriptionManager? = nil) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager, subscriptionManager: subscriptionManager))
    }

    public var body: some View {
        settingsContent
            .tint(SolennixColors.primary)
            .background(SolennixColors.surfaceGrouped)
            .softScrollEdgeEffectIfAvailable()
            .navigationTitle(SettingsStrings.title)
            .navigationBarTitleDisplayMode(.large)
            .confirmationDialog(
                SettingsStrings.actionLogout,
                isPresented: $showLogoutConfirm
            ) {
                Button(SettingsStrings.actionLogout, role: .destructive) {
                    Task { await viewModel.logout() }
                }
                Button(SettingsStrings.commonCancel, role: .cancel) {}
            } message: {
                Text(SettingsStrings.logoutConfirmation)
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

            Section(header: Text(SettingsStrings.sectionAppearance).foregroundStyle(SolennixColors.text)) {
                appearanceContent
            }
            .listRowBackground(SolennixColors.card)

            Section(header: Text(SettingsStrings.sectionAccount).foregroundStyle(SolennixColors.text)) {
                accountContent
            }
            .listRowBackground(SolennixColors.card)

            Section(header: Text(SettingsStrings.sectionSubscription).foregroundStyle(SolennixColors.text)) {
                subscriptionContent
            }
            .listRowBackground(SolennixColors.card)

            Section(header: Text(SettingsStrings.sectionBusiness).foregroundStyle(SolennixColors.text)) {
                businessContent
            }
            .listRowBackground(SolennixColors.card)

            Section(header: Text(SettingsStrings.sectionLegal).foregroundStyle(SolennixColors.text)) {
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
                        Text(SettingsStrings.actionLogout)
                    }
                }
            }
            .listRowBackground(SolennixColors.card)

            // App version
            Section {
                HStack {
                    Text(SettingsStrings.version)
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
        SettingsCardContainer(title: SettingsStrings.sectionAppearance) {
            HStack(spacing: Spacing.sm) {
                Label(SettingsStrings.themeLabel, systemImage: "paintbrush")
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
                Label(SettingsStrings.profileLanguage, systemImage: "globe")
                Spacer()
                Picker("", selection: $selectedLanguage) {
                    Text(SettingsStrings.languageOptionEs).tag("es")
                    Text(SettingsStrings.languageOptionEn).tag("en")
                }
                .pickerStyle(.menu)
                .labelsHidden()
            }
        }
    }

    private var accountCard: some View {
        SettingsCardContainer(title: SettingsStrings.sectionAccount) {
            NavigationLink(value: Route.editProfile) {
                SettingsNavRow(title: SettingsStrings.actionEditProfile, systemImage: "person.circle")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.changePassword) {
                SettingsNavRow(title: SettingsStrings.actionChangePassword, systemImage: "lock.rotation")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.notificationPreferences) {
                SettingsNavRow(title: SettingsStrings.tabNotifications, systemImage: "bell.badge")
            }
            .buttonStyle(.plain)
        }
    }

    private var subscriptionCard: some View {
        SettingsCardContainer(title: SettingsStrings.sectionSubscription) {
            NavigationLink(value: Route.subscription) {
                HStack {
                    Label(SettingsStrings.actionManagePlan, systemImage: "star")
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
        SettingsCardContainer(title: SettingsStrings.sectionBusiness) {
            NavigationLink(value: Route.businessSettings) {
                SettingsNavRow(title: SettingsStrings.actionBusinessSettings, systemImage: "building.2")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.contractDefaults) {
                SettingsNavRow(title: SettingsStrings.actionContractDefaults, systemImage: "doc.text")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.reviews) {
                SettingsNavRow(title: SettingsStrings.actionReviews, systemImage: "star.bubble")
            }
            .buttonStyle(.plain)
        }
    }

    private var legalCard: some View {
        SettingsCardContainer(title: SettingsStrings.sectionLegal) {
            Button {
                HapticsHelper.play(.selection)
                if let url = URL(string: "https://solennix.com/help") {
                    legalSheetURL = IdentifiableURL(url)
                }
            } label: {
                SettingsExternalRow(title: SettingsStrings.actionHelp, systemImage: "questionmark.circle")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.about) {
                SettingsNavRow(title: SettingsStrings.actionAbout, systemImage: "info.circle")
            }
            .buttonStyle(.plain)

            Divider()

            Button {
                HapticsHelper.play(.selection)
                if let url = URL(string: "https://creapolis.dev/privacy-policy") {
                    legalSheetURL = IdentifiableURL(url)
                }
            } label: {
                SettingsExternalRow(title: SettingsStrings.actionPrivacyPolicy, systemImage: "hand.raised")
            }
            .buttonStyle(.plain)

            Divider()

            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.terms)
            } label: {
                SettingsExternalRow(title: SettingsStrings.actionTermsConditions, systemImage: "doc.plaintext")
            }
            .buttonStyle(.plain)

            Divider()

            NavigationLink(value: Route.deleteAccount) {
                HStack {
                    Label(SettingsStrings.actionDeleteAccount, systemImage: "trash")
                        .foregroundStyle(SolennixColors.error)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var sessionCard: some View {
        SettingsCardContainer(title: SettingsStrings.actionLogout) {
            Button(role: .destructive) {
                showLogoutConfirm = true
            } label: {
                HStack {
                    Label(SettingsStrings.actionLogout, systemImage: "rectangle.portrait.and.arrow.right")
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var versionCard: some View {
        HStack {
            Text(SettingsStrings.version)
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
        Picker(selection: $appearance, label: Label(SettingsStrings.themeLabel, systemImage: "paintbrush")) {
            ForEach(AppearanceTheme.allCases) { theme in
                Text(theme.displayName).tag(theme.rawValue)
            }
        }

        Picker(selection: $selectedLanguage, label: Label(SettingsStrings.profileLanguage, systemImage: "globe")) {
            Text(SettingsStrings.languageOptionEs).tag("es")
            Text(SettingsStrings.languageOptionEn).tag("en")
        }
    }

    @ViewBuilder
    private var accountContent: some View {
        NavigationLink(value: Route.editProfile) {
            Label(SettingsStrings.actionEditProfile, systemImage: "person.circle")
        }
        .listRowSeparator(.hidden)

        NavigationLink(value: Route.changePassword) {
            Label(SettingsStrings.actionChangePassword, systemImage: "lock.rotation")
        }
        .listRowSeparator(.hidden)

        NavigationLink(value: Route.notificationPreferences) {
            Label(SettingsStrings.tabNotifications, systemImage: "bell.badge")
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
            Label(SettingsStrings.actionBusinessSettings, systemImage: "building.2")
        }
        .listRowSeparator(.hidden)

        NavigationLink(value: Route.contractDefaults) {
            Label(SettingsStrings.actionContractDefaults, systemImage: "doc.text")
        }
        .listRowSeparator(.hidden)

        NavigationLink(value: Route.reviews) {
            Label(SettingsStrings.actionReviews, systemImage: "star.bubble")
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
                Label(SettingsStrings.actionHelp, systemImage: "questionmark.circle")
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .listRowSeparator(.hidden)
        .accessibilityHint(SettingsStrings.legalHelpHint)

        NavigationLink(value: Route.about) {
            Label(SettingsStrings.actionAbout, systemImage: "info.circle")
        }
        .listRowSeparator(.hidden)

        Button {
            HapticsHelper.play(.selection)
            if let url = URL(string: "https://creapolis.dev/privacy-policy") {
                legalSheetURL = IdentifiableURL(url)
            }
        } label: {
            HStack {
                Label(SettingsStrings.actionPrivacyPolicy, systemImage: "hand.raised")
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .listRowSeparator(.hidden)
        .accessibilityHint(SettingsStrings.legalPrivacyHint)

        Button {
            HapticsHelper.play(.selection)
            legalSheetURL = IdentifiableURL(LegalURL.terms)
        } label: {
            HStack {
                Label(SettingsStrings.actionTermsConditions, systemImage: "doc.plaintext")
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .listRowSeparator(.hidden)
        .accessibilityHint(SettingsStrings.legalTermsHint)

        NavigationLink(value: Route.deleteAccount) {
            HStack {
                Label(SettingsStrings.actionDeleteAccount, systemImage: "trash")
                    .foregroundStyle(SolennixColors.error)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .listRowSeparator(.hidden)
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
            Label(SettingsStrings.actionManagePlan, systemImage: "star")

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
            toastManager.show(message: SettingsStrings.profileLanguageUpdated, type: .success)
        } else {
            preferredLocale = oldValue
            selectedLanguage = oldValue
            toastManager.show(message: viewModel.errorMessage ?? SettingsStrings.commonErrorRetry, type: .error)
        }
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
        case .basic: return SettingsStrings.planBasic
        case .pro, .premium: return SettingsStrings.planPro
        case .business: return SettingsStrings.planBusiness
        }
    }

    public var body: some View {
        Text(planLabel)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(plan.isPaid ? SolennixColors.onPrimary : SolennixColors.text)
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

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
        case .system: return "Predeterminado del Sistema"
        case .light: return "Claro"
        case .dark: return "Oscuro"
        }
    }
}

// MARK: - Settings View

public struct SettingsView: View {

    @State private var viewModel: SettingsViewModel
    @State private var showLogoutConfirm: Bool = false
    @State private var legalSheetURL: IdentifiableURL?

    @AppStorage("appearance") private var appearance: String = "system"
    @Environment(\.horizontalSizeClass) private var sizeClass

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
            .navigationTitle("Ajustes")
            .navigationBarTitleDisplayMode(.large)
            .confirmationDialog(
                "Cerrar Sesión",
                isPresented: $showLogoutConfirm
            ) {
                Button("Cerrar Sesión", role: .destructive) {
                    Task { await viewModel.logout() }
                }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text("¿Estás seguro de que quieres cerrar sesión?")
            }
            .refreshable { await viewModel.loadUser() }
            .task { await viewModel.loadUser() }
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

            Section("Apariencia") {
                appearanceContent
            }

            Section("Cuenta") {
                accountContent
            }

            Section("Suscripción") {
                subscriptionContent
            }

            Section("Negocio") {
                businessContent
            }

            Section("Legal") {
                legalContent
            }

            // Logout
            Section {
                Button(role: .destructive) {
                    showLogoutConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Cerrar Sesión")
                    }
                }
            }

            // App version
            Section {
                HStack {
                    Text("Versión")
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
        Picker(selection: $appearance, label: Label("Tema", systemImage: "paintbrush")) {
            ForEach(AppearanceTheme.allCases) { theme in
                Text(theme.displayName).tag(theme.rawValue)
            }
        }
    }

    @ViewBuilder
    private var accountContent: some View {
        NavigationLink(value: Route.editProfile) {
            Label("Editar Perfil", systemImage: "person.circle")
        }

        NavigationLink(value: Route.changePassword) {
            Label("Cambiar Contrasena", systemImage: "lock.rotation")
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
            Label("Ajustes del Negocio", systemImage: "building.2")
        }

        NavigationLink(value: Route.contractDefaults) {
            Label("Valores del Contrato", systemImage: "doc.text")
        }
    }

    @ViewBuilder
    private var legalContent: some View {
        NavigationLink(value: Route.about) {
            Label("Acerca de", systemImage: "info.circle")
        }

        Button {
            HapticsHelper.play(.selection)
            legalSheetURL = IdentifiableURL(LegalURL.privacy)
        } label: {
            HStack {
                Label("Politica de Privacidad", systemImage: "hand.raised")
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .accessibilityHint("Abre la politica de privacidad en Safari")

        Button {
            HapticsHelper.play(.selection)
            legalSheetURL = IdentifiableURL(LegalURL.terms)
        } label: {
            HStack {
                Label("Terminos de Servicio", systemImage: "doc.plaintext")
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .accessibilityHint("Abre los terminos de servicio en Safari")
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
            Label("Gestionar Plan", systemImage: "star")

            Spacer()

            if let user = viewModel.user {
                PlanBadge(plan: user.plan)
            }
        }
    }
}

// MARK: - Plan Badge

public struct PlanBadge: View {

    let plan: Plan

    public init(plan: Plan) {
        self.plan = plan
    }

    public var body: some View {
        Text(plan == .premium ? "Premium" : "Basico")
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(plan == .premium ? .white : SolennixColors.text)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 2)
            .background(
                plan == .premium
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

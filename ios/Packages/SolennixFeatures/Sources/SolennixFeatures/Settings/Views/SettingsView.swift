import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Settings View

public struct SettingsView: View {

    @State private var viewModel: SettingsViewModel
    @State private var showLogoutConfirm: Bool = false

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
    }

    public var body: some View {
        List {
            // User profile header
            if let user = viewModel.user {
                userHeaderSection(user)
            }

            // Account section
            Section("Cuenta") {
                NavigationLink(value: Route.editProfile) {
                    Label("Editar Perfil", systemImage: "person.circle")
                }

                NavigationLink(value: Route.changePassword) {
                    Label("Cambiar Contrasena", systemImage: "lock.rotation")
                }
            }

            // Business section
            Section("Negocio") {
                NavigationLink(value: Route.businessSettings) {
                    Label("Ajustes del Negocio", systemImage: "building.2")
                }

                NavigationLink(value: Route.contractDefaults) {
                    Label("Valores del Contrato", systemImage: "doc.text")
                }

                NavigationLink(value: Route.pricing) {
                    planRow
                }
            }

            // Legal section
            Section("Legal") {
                NavigationLink(value: Route.about) {
                    Label("Acerca de", systemImage: "info.circle")
                }

                NavigationLink(value: Route.privacy) {
                    Label("Politica de Privacidad", systemImage: "hand.raised")
                }

                NavigationLink(value: Route.terms) {
                    Label("Terminos de Servicio", systemImage: "doc.plaintext")
                }
            }

            // Logout
            Section {
                Button(role: .destructive) {
                    showLogoutConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Cerrar Sesion")
                    }
                }
            }

            // App version
            Section {
                HStack {
                    Text("Version")
                    Spacer()
                    Text(Bundle.main.appVersion)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Ajustes")
        .confirmationDialog(
            "Cerrar Sesion",
            isPresented: $showLogoutConfirm
        ) {
            Button("Cerrar Sesion", role: .destructive) {
                Task { await viewModel.logout() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Estas seguro de que quieres cerrar sesion?")
        }
        .refreshable { await viewModel.loadUser() }
        .task { await viewModel.loadUser() }
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
            Label("Plan", systemImage: "creditcard")

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

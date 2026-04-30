import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Edit Profile View

public struct EditProfileView: View {

    @State private var viewModel: SettingsViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
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
        .navigationTitle(tr("settings.action.edit_profile", "Editar perfil"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                saveButton
            }
        }
        .task { await viewModel.loadUser() }
    }

    // MARK: - Form Content

    private var formContent: some View {
        Form {
            Section {
                AdaptiveFormRow {
                    // Name field
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        TextField(tr("settings.profile.name_label", "Nombre"), text: $viewModel.editName)
                            .textContentType(.name)
                            .autocorrectionDisabled()

                        if let error = viewModel.nameError {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.error)
                        }
                    }
                } right: {
                    // Email field
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        TextField(tr("settings.profile.email_label", "Correo electrónico"), text: $viewModel.editEmail)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()

                        if let error = viewModel.emailError {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.error)
                        }
                    }
                }
            } header: {
                Text(tr("settings.profile.personal_info", "Información personal"))
            } footer: {
                Text(tr("settings.profile.personal_info_hint", "Tu nombre aparecerá en los contratos y documentos que generes."))
            }

            // Error message
            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task {
                let success = await viewModel.saveProfile()
                if success {
                    dismiss()
                }
            }
        } label: {
            if viewModel.isSavingProfile {
                ProgressView()
            } else {
                Text(tr("common.save", "Guardar"))
                    .fontWeight(.semibold)
            }
        }
        .disabled(viewModel.isSavingProfile)
    }
}

// MARK: - Preview

#Preview("Edit Profile") {
    NavigationStack {
        EditProfileView(apiClient: APIClient(), authManager: AuthManager(keychain: KeychainHelper.standard))
    }
}

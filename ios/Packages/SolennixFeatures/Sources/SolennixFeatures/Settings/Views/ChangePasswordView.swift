import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Change Password View

public struct ChangePasswordView: View {

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
        AdaptiveCenteredContent(maxWidth: 500) {
            Form {
                Section {
                    SecureField(tr("settings.password.current_label", "Contraseña actual"), text: $viewModel.currentPassword)
                        .textContentType(.password)
                } header: {
                    Text(tr("settings.password.current_section", "Contraseña actual"))
                }

                Section {
                    SecureField(tr("settings.password.new_label", "Nueva contraseña"), text: $viewModel.newPassword)
                        .textContentType(.newPassword)

                    SecureField(tr("settings.password.confirm_label", "Confirmar contraseña"), text: $viewModel.confirmPassword)
                        .textContentType(.newPassword)
                } header: {
                    Text(tr("settings.password.new_section", "Nueva contraseña"))
                } footer: {
                    Text(tr("settings.password.hint", "La contraseña debe tener al menos 8 caracteres."))
                }

                // Error message
                if let error = viewModel.passwordError {
                    Section {
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.error)
                    }
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.error)
                    }
                }

                // Success message
                if viewModel.passwordSuccess {
                    Section {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(SolennixColors.success)
                            Text(tr("settings.password.success", "Contraseña actualizada correctamente"))
                                .foregroundStyle(SolennixColors.success)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(SolennixColors.surfaceGrouped)
        }
        .navigationTitle(tr("settings.action.change_password", "Cambiar contraseña"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                saveButton
            }
        }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task {
                let success = await viewModel.changePassword()
                if success {
                    // Optionally dismiss after a short delay to show success
                    try? await Task.sleep(for: .seconds(1.5))
                    dismiss()
                }
            }
        } label: {
            if viewModel.isSavingPassword {
                ProgressView()
            } else {
                Text(tr("common.save", "Guardar"))
                    .fontWeight(.semibold)
            }
        }
        .disabled(viewModel.isSavingPassword || viewModel.currentPassword.isEmpty || viewModel.newPassword.isEmpty)
    }
}

// MARK: - Preview

#Preview("Change Password") {
    NavigationStack {
        ChangePasswordView(apiClient: APIClient(), authManager: AuthManager(keychain: KeychainHelper.standard))
    }
}

import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

// MARK: - Change Password View

public struct ChangePasswordView: View {

    @State private var viewModel: SettingsViewModel
    @State private var scoped: ViewScopedTask?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var showDiscardConfirm = false

    private var isDirty: Bool {
        !viewModel.currentPassword.isEmpty
            || !viewModel.newPassword.isEmpty
            || !viewModel.confirmPassword.isEmpty
    }

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
    }

    public var body: some View {
        AdaptiveCenteredContent(maxWidth: 500) {
            Form {
                Section {
                    SecureField(SettingsStrings.passwordCurrentLabel, text: $viewModel.currentPassword)
                        .textContentType(.password)
                        .solennixRow()
                } header: {
                    Text(SettingsStrings.passwordCurrentSection)
                }

                Section {
                    SecureField(SettingsStrings.passwordNewLabel, text: $viewModel.newPassword)
                        .textContentType(.newPassword)
                        .solennixRow()

                    SecureField(SettingsStrings.passwordConfirmLabel, text: $viewModel.confirmPassword)
                        .textContentType(.password)
                        .solennixRow()
                } header: {
                    Text(SettingsStrings.passwordNewSection)
                } footer: {
                    Text(SettingsStrings.passwordHint)
                }

                // Error message
                if let error = viewModel.passwordError {
                    Section {
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.error)
                            .solennixRow()
                    }
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.error)
                            .solennixRow()
                    }
                }

                // Success message
                if viewModel.passwordSuccess {
                    Section {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(SolennixColors.success)
                            Text(SettingsStrings.passwordSuccess)
                                .foregroundStyle(SolennixColors.success)
                        }
                        .solennixRow()
                    }
                }
            }
            .solennixListStyle()
        }
        .navigationTitle(SettingsStrings.actionChangePassword)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(isDirty)
        .confirmationDialog(
            tr("common.discard_unsaved_confirm", "¿Descartar los cambios sin guardar?"),
            isPresented: $showDiscardConfirm,
            titleVisibility: .visible
        ) {
            Button(tr("common.discard_changes", "Descartar cambios"), role: .destructive) { dismiss() }
            Button(tr("common.keep_editing", "Seguir editando"), role: .cancel) {}
        }
        .toolbar {
            if isDirty {
                ToolbarItem(placement: .topBarLeading) {
                    SolennixCancelButton(title: tr("common.back", "Atrás")) {
                        showDiscardConfirm = true
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                SolennixSaveButton(
                    title: SettingsStrings.commonSave,
                    action: {
                        scoped?.start {
                            let success = await viewModel.changePassword()
                            if success {
                                // Optionally dismiss after a short delay to show success
                                try? await Task.sleep(for: .seconds(1.5))
                                dismiss()
                            }
                        }
                    },
                    isValid: !viewModel.currentPassword.isEmpty
                        && !viewModel.newPassword.isEmpty
                        && !viewModel.confirmPassword.isEmpty,
                    isSaving: viewModel.isSavingPassword
                )
            }
        }
        .viewScopedTask(scoped: $scoped)
    }

}

// MARK: - Preview

#Preview("Change Password") {
    NavigationStack {
        ChangePasswordView(apiClient: APIClient(), authManager: AuthManager(keychain: KeychainHelper.standard))
    }
}

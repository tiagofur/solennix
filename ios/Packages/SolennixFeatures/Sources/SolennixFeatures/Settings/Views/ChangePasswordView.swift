import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Change Password View

public struct ChangePasswordView: View {

    @State private var viewModel: SettingsViewModel
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
                } header: {
                    Text(SettingsStrings.passwordCurrentSection)
                }
                .listRowBackground(SolennixColors.card)

                Section {
                    SecureField(SettingsStrings.passwordNewLabel, text: $viewModel.newPassword)
                        .textContentType(.newPassword)

                    SecureField(SettingsStrings.passwordConfirmLabel, text: $viewModel.confirmPassword)
                        .textContentType(.password)
                } header: {
                    Text(SettingsStrings.passwordNewSection)
                } footer: {
                    Text(SettingsStrings.passwordHint)
                }
                .listRowBackground(SolennixColors.card)

                // Error message
                if let error = viewModel.passwordError {
                    Section {
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.error)
                    }
                    .listRowBackground(SolennixColors.card)
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.error)
                    }
                    .listRowBackground(SolennixColors.card)
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
                    }
                    .listRowBackground(SolennixColors.card)
                }
            }
            .scrollContentBackground(.hidden)
            .background(SolennixColors.surfaceGrouped)
        }
        .navigationTitle(SettingsStrings.actionChangePassword)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(isDirty)
        .confirmationDialog(
            "¿Descartar los cambios sin guardar?",
            isPresented: $showDiscardConfirm,
            titleVisibility: .visible
        ) {
            Button("Descartar cambios", role: .destructive) { dismiss() }
            Button("Seguir editando", role: .cancel) {}
        }
        .toolbar {
            if isDirty {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showDiscardConfirm = true
                    } label: {
                        Label("Atrás", systemImage: "chevron.backward")
                    }
                }
            }
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
                Text(SettingsStrings.commonSave)
                    .fontWeight(.semibold)
            }
        }
        .disabled(viewModel.isSavingPassword || viewModel.currentPassword.isEmpty || viewModel.newPassword.isEmpty || viewModel.confirmPassword.isEmpty)
    }
}

// MARK: - Preview

#Preview("Change Password") {
    NavigationStack {
        ChangePasswordView(apiClient: APIClient(), authManager: AuthManager(keychain: KeychainHelper.standard))
    }
}

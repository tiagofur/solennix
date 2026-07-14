import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Edit Profile View

public struct EditProfileView: View {

    @State private var viewModel: SettingsViewModel
    @State private var scoped: ViewScopedTask?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var initialName: String = ""
    @State private var initialEmail: String = ""
    @State private var showDiscardConfirm = false

    private var isDirty: Bool {
        viewModel.editName != initialName || viewModel.editEmail != initialEmail
    }

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
                    title: tr("common.save", "Guardar"),
                    action: {
                        scoped?.start {
                            let success = await viewModel.saveProfile()
                            if success {
                                dismiss()
                            }
                        }
                    },
                    isValid: true,
                    isSaving: viewModel.isSavingProfile
                )
            }
        }
        .task {
            await viewModel.loadUser()
            initialName = viewModel.editName
            initialEmail = viewModel.editEmail
        }
        .viewScopedTask(scoped: $scoped)
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
                            .disabled(true)
                            .foregroundStyle(SolennixColors.textSecondary)

                        if let error = viewModel.emailError {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.error)
                        }
                    }
                }
                .solennixRow()
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
                        .solennixRow()
                }
            }
        }
        .solennixListStyle()
    }

}

// MARK: - Preview

#Preview("Edit Profile") {
    NavigationStack {
        EditProfileView(apiClient: APIClient(), authManager: AuthManager(keychain: KeychainHelper.standard))
    }
}

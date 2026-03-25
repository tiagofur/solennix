import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Edit Profile View

public struct EditProfileView: View {

    @State private var viewModel: SettingsViewModel
    @Environment(\.dismiss) private var dismiss

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                formContent
            }
        }
        .navigationTitle("Editar Perfil")
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
                // Name field
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    TextField("Nombre", text: $viewModel.editName)
                        .textContentType(.name)
                        .autocorrectionDisabled()

                    if let error = viewModel.nameError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                    }
                }

                // Email field
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    TextField("Correo electronico", text: $viewModel.editEmail)
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
            } header: {
                Text("Informacion Personal")
            } footer: {
                Text("Tu nombre aparecera en los contratos y documentos que generes.")
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
                Text("Guardar")
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

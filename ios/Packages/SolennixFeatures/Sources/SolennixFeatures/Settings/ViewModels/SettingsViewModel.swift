import Foundation
import Observation
import SolennixCore
import SolennixNetwork

private struct PreferredLanguagePayload: Encodable {
    let preferredLanguage: String
}

// MARK: - Settings View Model

@Observable
public final class SettingsViewModel {

    // MARK: - Properties

    public var user: User?
    public var isLoading: Bool = false
    public var errorMessage: String?

    // Edit Profile State
    public var editName: String = ""
    public var editEmail: String = ""
    public var isSavingProfile: Bool = false
    public var nameError: String?
    public var emailError: String?

    // Change Password State
    public var currentPassword: String = ""
    public var newPassword: String = ""
    public var confirmPassword: String = ""
    public var isSavingPassword: Bool = false
    public var passwordError: String?
    public var passwordSuccess: Bool = false

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let authManager: AuthManager

    // MARK: - Init

    public init(apiClient: APIClient, authManager: AuthManager) {
        self.apiClient = apiClient
        self.authManager = authManager
    }

    // MARK: - Load User

    @MainActor
    public func loadUser() async {
        isLoading = true
        errorMessage = nil

        do {
            user = try await apiClient.get(Endpoint.me)
            if let user = user {
                editName = user.name
                editEmail = user.email
            }
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Validate Profile

    public func validateProfile() -> Bool {
        nameError = nil
        emailError = nil

        if editName.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 {
            nameError = FeatureL10n.text("auth.validation.name_min_2", "El nombre debe tener al menos 2 caracteres")
        }

        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        if !(editEmail.range(of: emailRegex, options: .regularExpression).map({ _ in true }) ?? false) {
            emailError = FeatureL10n.text("settings.validation.email_invalid", "Por favor ingresa un email válido")
        }

        return nameError == nil && emailError == nil
    }

    // MARK: - Save Profile

    @MainActor
    public func saveProfile() async -> Bool {
        guard validateProfile() else { return false }

        isSavingProfile = true
        errorMessage = nil

        do {
            let body: [String: String] = [
                "name": editName.trimmingCharacters(in: .whitespacesAndNewlines),
                "email": editEmail.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            ]
            user = try await apiClient.put(Endpoint.updateProfile, body: body)
            isSavingProfile = false
            return true
        } catch {
            errorMessage = mapError(error)
            isSavingProfile = false
            return false
        }
    }

    // MARK: - Validate Password

    public func validatePassword() -> Bool {
        passwordError = nil

        if currentPassword.isEmpty {
            passwordError = FeatureL10n.text("settings.validation.current_password_required", "Ingresa tu contraseña actual")
            return false
        }

        if newPassword.count < 8 {
            passwordError = FeatureL10n.text("settings.validation.new_password_min", "La nueva contraseña debe tener al menos 8 caracteres")
            return false
        }

        if newPassword != confirmPassword {
            passwordError = FeatureL10n.text("settings.validation.passwords_mismatch", "Las contraseñas no coinciden")
            return false
        }

        return true
    }

    // MARK: - Change Password

    @MainActor
    public func changePassword() async -> Bool {
        guard validatePassword() else { return false }

        isSavingPassword = true
        errorMessage = nil
        passwordSuccess = false

        do {
            let body: [String: String] = [
                "current_password": currentPassword,
                "new_password": newPassword
            ]
            let _: EmptyResponse = try await apiClient.post(Endpoint.changePassword, body: body)

            // Clear fields on success
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
            passwordSuccess = true
            isSavingPassword = false
            return true
        } catch {
            errorMessage = mapError(error)
            isSavingPassword = false
            return false
        }
    }

    // MARK: - Logout

    @MainActor
    public func logout() async {
        await authManager.signOut()
        user = nil
    }

    @MainActor
    public func updatePreferredLanguage(_ language: String) async -> Bool {
        isLoading = true
        errorMessage = nil

        do {
            try await authManager.updateProfile(data: PreferredLanguagePayload(preferredLanguage: language))
            user = authManager.currentUser
            isLoading = false
            return true
        } catch {
            errorMessage = mapError(error)
            isLoading = false
            return false
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? FeatureL10n.text("common.error.unexpected", "Ocurrió un error inesperado.")
        }
        return FeatureL10n.text("common.error.retry", "Ocurrió un error inesperado. Intenta de nuevo.")
    }
}

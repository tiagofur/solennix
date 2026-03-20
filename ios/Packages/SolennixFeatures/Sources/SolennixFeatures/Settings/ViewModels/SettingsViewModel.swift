import Foundation
import Observation
import SolennixCore
import SolennixNetwork

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

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
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
            nameError = "El nombre debe tener al menos 2 caracteres"
        }

        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        if !(editEmail.range(of: emailRegex, options: .regularExpression).map({ _ in true }) ?? false) {
            emailError = "Por favor ingresa un email valido"
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
            passwordError = "Ingresa tu contrasena actual"
            return false
        }

        if newPassword.count < 8 {
            passwordError = "La nueva contrasena debe tener al menos 8 caracteres"
            return false
        }

        if newPassword != confirmPassword {
            passwordError = "Las contrasenas no coinciden"
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
        do {
            let _: EmptyResponse = try await apiClient.post(Endpoint.logout, body: [String: String]())
        } catch {
            // Ignore logout errors - clear local state anyway
        }
        user = nil
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? "Ocurrio un error inesperado."
        }
        return "Ocurrio un error inesperado. Intenta de nuevo."
    }
}

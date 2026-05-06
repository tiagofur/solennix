import Foundation
import Observation
import SolennixCore
import SolennixNetwork

/// Single view model shared across all auth screens (Login, Register, ForgotPassword, ResetPassword).
///
/// Manages form state, validation (Spanish messages), and API calls via `AuthManager`.
@MainActor
@Observable
public final class AuthViewModel {

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    // MARK: - Form Fields

    public var email: String = ""
    public var password: String = ""
    public var confirmPassword: String = ""
    public var name: String = ""

    // MARK: - UI State

    public var isLoading: Bool = false
    public var errorMessage: String?
    public var isPasswordVisible: Bool = false
    public var isConfirmPasswordVisible: Bool = false
    public var showSuccess: Bool = false

    // MARK: - Dependencies

    private let authManager: AuthManager
    private var _googleSignInService: (any GoogleSignInServiceProtocol)?

    // MARK: - Init

    public init(
        authManager: AuthManager,
        googleSignInService: (any GoogleSignInServiceProtocol)? = nil
    ) {
        self.authManager = authManager
        self._googleSignInService = googleSignInService
    }

    // MARK: - Validation Helpers

    public var isLoginValid: Bool {
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        && !password.isEmpty
    }

    public var isRegisterValid: Bool {
        name.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
        && !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        && isPasswordComplex(password)
        && password == confirmPassword
    }

    public var isForgotValid: Bool {
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    public var isResetValid: Bool {
        isPasswordComplex(password) && password == confirmPassword
    }

    // MARK: - Sign In

    @MainActor
    public func signIn() async {
        // Validate
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else {
            errorMessage = tr("auth.validation.email_required", "El correo es requerido")
            return
        }
        guard !password.isEmpty else {
            errorMessage = tr("auth.validation.password_required", "La contraseña es requerida")
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            _ = try await authManager.signIn(email: trimmedEmail, password: password)
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Sign Up

    @MainActor
    public func signUp() async {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)

        guard trimmedName.count >= 2 else {
            errorMessage = tr("auth.validation.name_min_2", "El nombre debe tener al menos 2 caracteres")
            return
        }
        guard !trimmedEmail.isEmpty else {
            errorMessage = tr("auth.validation.email_required", "El correo es requerido")
            return
        }
        guard isPasswordComplex(password) else {
            errorMessage = tr("auth.validation.password_min_8", "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número")
            return
        }
        guard password == confirmPassword else {
            errorMessage = tr("auth.validation.password_mismatch", "Las contraseñas no coinciden")
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            _ = try await authManager.signUp(
                name: trimmedName,
                email: trimmedEmail,
                password: password
            )
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Sign In with Apple

    @MainActor
    public func signInWithApple() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let service = AppleSignInService()
            let result = try await service.signIn()

            // Build full name from PersonNameComponents
            var fullName: String?
            if let nameComponents = result.fullName {
                let formatter = PersonNameComponentsFormatter()
                let name = formatter.string(from: nameComponents)
                if !name.isEmpty {
                    fullName = name
                }
            }

            _ = try await authManager.signInWithApple(
                identityToken: result.identityToken,
                authorizationCode: result.authorizationCode,
                fullName: fullName,
                email: result.email
            )
        } catch let error as AppleSignInError {
            if case .cancelled = error { return }
            errorMessage = mapError(error)
        } catch {
            errorMessage = mapError(error)
        }
    }

    // MARK: - Sign In with Google

    @MainActor
    public func signInWithGoogle(idToken: String, fullName: String?) async {
        isLoading = true
        errorMessage = nil

        do {
            _ = try await authManager.signInWithGoogle(idToken: idToken, fullName: fullName)
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    /// Trigger the full Google Sign-In flow: present the SDK sheet, then send the token to the backend.
    @MainActor
    public func triggerGoogleSignIn() async {
        do {
            let service = _googleSignInService ?? GoogleSignInService()
            let result = try await service.signIn()
            await signInWithGoogle(idToken: result.idToken, fullName: result.fullName)
        } catch let error as GoogleSignInError {
            if case .cancelled = error { return }
            errorMessage = mapError(error)
        } catch {
            errorMessage = tr("auth.social.google.error", "Error al iniciar sesión con Google")
        }
    }

    // MARK: - Forgot Password

    @MainActor
    public func forgotPassword() async {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedEmail.isEmpty else {
            errorMessage = tr("auth.validation.email_required", "El correo es requerido")
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            guard let client = authManager.apiClient else {
                throw APIError.unknown
            }
            let body = ["email": trimmedEmail]
            let _: EmptyResponse = try await client.post(Endpoint.forgotPassword, body: body)
            showSuccess = true
        } catch {
            // Always show success for forgot password (backend returns 200 even for non-existent emails)
            showSuccess = true
        }

        isLoading = false
    }

    // MARK: - Reset Password

    @MainActor
    public func resetPassword(token: String) async {
        guard isPasswordComplex(password) else {
            errorMessage = tr("auth.validation.password_min_8", "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número")
            return
        }
        guard password == confirmPassword else {
            errorMessage = tr("auth.validation.password_mismatch", "Las contraseñas no coinciden")
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            guard let client = authManager.apiClient else {
                throw APIError.unknown
            }
            let body: [String: String] = ["token": token, "password": password]
            let _: EmptyResponse = try await client.post(Endpoint.resetPassword, body: body)
            showSuccess = true
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Helpers

    /// Checks password meets complexity requirements: 8+ chars, uppercase, lowercase, digit.
    private func isPasswordComplex(_ value: String) -> Bool {
        value.count >= 8
        && value.range(of: "[A-Z]", options: .regularExpression) != nil
        && value.range(of: "[a-z]", options: .regularExpression) != nil
        && value.range(of: "[0-9]", options: .regularExpression) != nil
    }

    public func clearError() {
        errorMessage = nil
    }

    /// Reset all form fields (useful when navigating between auth screens).
    public func resetFields() {
        email = ""
        password = ""
        confirmPassword = ""
        name = ""
        errorMessage = nil
        showSuccess = false
        isPasswordVisible = false
        isConfirmPasswordVisible = false
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let googleError = error as? GoogleSignInError {
            switch googleError {
            case .missingIDToken:
                return tr("auth.social.google.missing_token", "No se recibió el token de identidad de Google.")
            case .cancelled:
                return tr("auth.social.google.cancelled", "Inicio de sesión con Google cancelado.")
            case .failed:
                return tr("auth.social.google.error", "Error al iniciar sesión con Google")
            }
        }

        if let appleError = error as? AppleSignInError {
            switch appleError {
            case .invalidCredential:
                return tr("auth.social.apple.invalid_credential", "Credencial de Apple inválida.")
            case .missingIdentityToken:
                return tr("auth.social.apple.missing_identity_token", "No se recibió el token de identidad de Apple.")
            case .missingAuthorizationCode:
                return tr("auth.social.apple.missing_authorization_code", "No se recibió el código de autorización de Apple.")
            case .cancelled:
                return tr("auth.social.apple.cancelled", "Inicio de sesión con Apple cancelado.")
            case .failed:
                return tr("auth.social.apple.error", "Error al iniciar sesión con Apple")
            }
        }

        if let apiError = error as? APIError {
            switch apiError {
            case .unauthorized:
                return tr("auth.error.invalid_credentials", "Credenciales inválidas. Verifica tu correo y contraseña.")
            case .serverError(let statusCode, let message):
                if statusCode == 409 {
                    return tr("auth.error.email_taken", "Ya existe una cuenta con este correo electrónico.")
                }
                return message
            case .networkError:
                return tr("auth.error.network", "Error de conexión. Verifica tu internet e intenta de nuevo.")
            default:
                return apiError.errorDescription ?? tr("auth.error.unexpected", "Ocurrió un error inesperado.")
            }
        }
        return tr("auth.error.retry", "Ocurrió un error inesperado. Intenta de nuevo.")
    }
}

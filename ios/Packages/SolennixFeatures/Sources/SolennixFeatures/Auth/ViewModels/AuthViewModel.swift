import Foundation
import Observation
import AuthenticationServices
import SolennixCore
import SolennixNetwork

/// Single view model shared across all auth screens (Login, Register, ForgotPassword, ResetPassword).
///
/// Manages form state, validation (Spanish messages), and API calls via `AuthManager`.
@Observable
public final class AuthViewModel {

    // MARK: - Form Fields

    public var email: String = ""
    public var password: String = ""
    public var confirmPassword: String = ""
    public var name: String = ""

    // MARK: - UI State

    public var isLoading: Bool = false
    public var errorMessage: String?
    public var verificationNotice: String?
    public var verificationEmail: String = ""
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
            errorMessage = AuthStrings.validationEmailRequired
            return
        }
        guard !password.isEmpty else {
            errorMessage = AuthStrings.validationPasswordRequired
            return
        }

        isLoading = true
        errorMessage = nil
        verificationNotice = nil

        do {
            _ = try await authManager.signIn(email: trimmedEmail, password: password)
        } catch {
            if let apiError = error as? APIError,
               case .serverError(let statusCode, _) = apiError,
               statusCode == 403 {
                verificationEmail = trimmedEmail
                // Always use the localized string — never echo the raw server message,
                // which could expose account existence or internal details.
                verificationNotice = AuthStrings.loginVerificationRequiredNotice
                errorMessage = nil
            } else {
                errorMessage = mapError(error)
            }
        }

        isLoading = false
    }

    // MARK: - Sign Up

    @MainActor
    public func signUp() async {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)

        guard trimmedName.count >= 2 else {
            errorMessage = AuthStrings.validationNameMin2
            return
        }
        guard !trimmedEmail.isEmpty else {
            errorMessage = AuthStrings.validationEmailRequired
            return
        }
        guard isPasswordComplex(password) else {
            errorMessage = AuthStrings.validationPasswordMin8
            return
        }
        guard password == confirmPassword else {
            errorMessage = AuthStrings.validationPasswordMismatch
            return
        }

        isLoading = true
        errorMessage = nil
        verificationNotice = nil

        do {
            _ = try await authManager.signUp(
                name: trimmedName,
                email: trimmedEmail,
                password: password
            )
            verificationEmail = trimmedEmail
            verificationNotice = AuthStrings.registerVerificationSent
            showSuccess = true
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Sign In with Apple

    /// Handles the result from `SignInWithAppleButton`'s `onCompletion` closure.
    ///
    /// Preferred over `signInWithApple()` when using the native `SignInWithAppleButton`
    /// (required by App Store guidelines) because the native button drives the
    /// ASAuthorizationController internally and delivers a `Result<ASAuthorization, Error>`
    /// rather than invoking the coordinator-pattern `AppleSignInService`.
    @MainActor
    public func handleAppleSignInResult(_ result: Result<ASAuthorization, Error>) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        switch result {
        case .failure(let error):
            if let authError = error as? ASAuthorizationError,
               authError.code == .canceled {
                // User cancelled — no error message needed.
                return
            }
            errorMessage = mapError(error)

        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                errorMessage = AuthStrings.socialAppleInvalidCredential
                return
            }
            guard let identityTokenData = credential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                errorMessage = AuthStrings.socialAppleMissingIdentityToken
                return
            }
            guard let authCodeData = credential.authorizationCode,
                  let authorizationCode = String(data: authCodeData, encoding: .utf8) else {
                errorMessage = AuthStrings.socialAppleMissingAuthorizationCode
                return
            }

            var fullName: String?
            if let nameComponents = credential.fullName {
                let formatter = PersonNameComponentsFormatter()
                let name = formatter.string(from: nameComponents)
                if !name.isEmpty { fullName = name }
            }

            do {
                _ = try await authManager.signInWithApple(
                    identityToken: identityToken,
                    authorizationCode: authorizationCode,
                    fullName: fullName,
                    email: credential.email
                )
            } catch {
                errorMessage = mapError(error)
            }
        }
    }

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
            errorMessage = AuthStrings.socialGoogleError
        }
    }

    // MARK: - Forgot Password

    @MainActor
    public func forgotPassword() async {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedEmail.isEmpty else {
            errorMessage = AuthStrings.validationEmailRequired
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
        } catch let apiError as APIError {
            switch apiError {
            case .networkError:
                // Surface genuine network failures — the email was not sent.
                errorMessage = AuthStrings.errorNetwork
            case .serverError(let statusCode, _) where statusCode >= 500:
                // Surface 5xx server errors — the request did not succeed.
                errorMessage = AuthStrings.errorUnexpected
            default:
                // 404 (unknown email) and all other API errors: show success to prevent
                // account enumeration — the privacy-preserving behaviour is intentional.
                showSuccess = true
            }
        } catch {
            // Unknown non-API errors (e.g., encoding): show success to stay safe.
            showSuccess = true
        }

        isLoading = false
    }

    // MARK: - Reset Password

    @MainActor
    public func resetPassword(token: String) async {
        guard isPasswordComplex(password) else {
            errorMessage = AuthStrings.validationPasswordMin8
            return
        }
        guard password == confirmPassword else {
            errorMessage = AuthStrings.validationPasswordMismatch
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

    // MARK: - Accept Team Invite

    @MainActor
    public func acceptTeamInvite(token: String) async {
        guard isPasswordComplex(password) else {
            errorMessage = AuthStrings.validationPasswordMin8
            return
        }
        guard password == confirmPassword else {
            errorMessage = AuthStrings.validationPasswordMismatch
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            _ = try await authManager.acceptTeamInvite(token: token, password: password)
            showSuccess = true
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Helpers

    /// Checks password meets complexity requirements: 8+ chars, uppercase, lowercase, digit, symbol.
    private func isPasswordComplex(_ value: String) -> Bool {
        value.count >= 8
        && value.range(of: "[A-Z]", options: .regularExpression) != nil
        && value.range(of: "[a-z]", options: .regularExpression) != nil
        && value.range(of: "[0-9]", options: .regularExpression) != nil
        && value.range(of: "[^A-Za-z0-9]", options: .regularExpression) != nil
    }

    public func clearError() {
        errorMessage = nil
    }

    @MainActor
    public func resendVerificationEmail() async {
        let trimmedEmail = verificationEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else {
            errorMessage = AuthStrings.validationEmailRequired
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await authManager.resendEmailVerification(email: trimmedEmail)
            verificationNotice = AuthStrings.loginVerificationResent
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
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
        verificationNotice = nil
        verificationEmail = ""
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let googleError = error as? GoogleSignInError {
            switch googleError {
            case .missingIDToken:
                return AuthStrings.socialGoogleMissingToken
            case .cancelled:
                return AuthStrings.socialGoogleCancelled
            case .failed:
                return AuthStrings.socialGoogleError
            }
        }

        if let appleError = error as? AppleSignInError {
            switch appleError {
            case .invalidCredential:
                return AuthStrings.socialAppleInvalidCredential
            case .missingIdentityToken:
                return AuthStrings.socialAppleMissingIdentityToken
            case .missingAuthorizationCode:
                return AuthStrings.socialAppleMissingAuthorizationCode
            case .cancelled:
                return AuthStrings.socialAppleCancelled
            case .failed:
                return AuthStrings.socialAppleError
            }
        }

        if let apiError = error as? APIError {
            switch apiError {
            case .unauthorized:
                return AuthStrings.errorInvalidCredentials
            case .serverError(let statusCode, _):
                if statusCode == 409 {
                    return AuthStrings.errorEmailTaken
                }
                // Never surface the raw server message — it may expose account enumeration
                // or internal error details. Return a generic localized string for all
                // other server errors.
                return AuthStrings.errorUnexpected
            case .networkError:
                return AuthStrings.errorNetwork
            default:
                // Do NOT pass through errorDescription — APIError.planLimitExceeded and
                // similar carry the raw server message (account/internal detail leak).
                // Generic localized string only for any unmapped auth error.
                return AuthStrings.errorUnexpected
            }
        }
        return AuthStrings.errorRetry
    }
}

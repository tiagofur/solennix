import Foundation
import AuthenticationServices

// MARK: - Apple Sign In Result

/// The result of a successful Sign in with Apple authorization.
public struct AppleSignInResult: Sendable {
    /// The identity token as a UTF-8 string (JWT).
    public let identityToken: String

    /// The authorization code as a UTF-8 string.
    public let authorizationCode: String

    /// The user's full name, if provided (only on first authorization).
    public let fullName: PersonNameComponents?

    /// The user's email, if provided (only on first authorization).
    public let email: String?
}

// MARK: - Apple Sign In Error

/// Errors that can occur during the Apple Sign In flow.
public enum AppleSignInError: LocalizedError {
    case invalidCredential
    case missingIdentityToken
    case missingAuthorizationCode
    case cancelled
    case failed(Error)

    public var errorDescription: String? {
        switch self {
        case .invalidCredential:
            return "Credencial de Apple invalida."
        case .missingIdentityToken:
            return "No se recibio el token de identidad de Apple."
        case .missingAuthorizationCode:
            return "No se recibio el codigo de autorizacion de Apple."
        case .cancelled:
            return "Inicio de sesion con Apple cancelado."
        case .failed(let error):
            return "Error en Apple Sign In: \(error.localizedDescription)"
        }
    }
}

// MARK: - Apple Sign In Service

/// Handles the Sign in with Apple authorization flow using the coordinator pattern.
///
/// The class is confined to `@MainActor` because `ASAuthorizationController`
/// delivers its delegate callbacks on the main thread and the continuation
/// property must be accessed from a single isolation domain for thread safety.
///
/// Usage:
/// ```swift
/// let service = AppleSignInService()
/// let result = try await service.signIn()
/// // Send result.identityToken and result.authorizationCode to your backend
/// ```
@MainActor
public final class AppleSignInService: NSObject, Sendable {

    private var continuation: CheckedContinuation<AppleSignInResult, Error>?

    /// Perform the Sign in with Apple authorization flow.
    /// - Returns: An `AppleSignInResult` containing the identity token, authorization code,
    ///   and optionally the user's name and email.
    public func signIn() async throws -> AppleSignInResult {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation

            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension AppleSignInService: @preconcurrency ASAuthorizationControllerDelegate {

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            continuation?.resume(throwing: AppleSignInError.invalidCredential)
            continuation = nil
            return
        }

        guard let identityTokenData = credential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8) else {
            continuation?.resume(throwing: AppleSignInError.missingIdentityToken)
            continuation = nil
            return
        }

        guard let authorizationCodeData = credential.authorizationCode,
              let authorizationCode = String(data: authorizationCodeData, encoding: .utf8) else {
            continuation?.resume(throwing: AppleSignInError.missingAuthorizationCode)
            continuation = nil
            return
        }

        let result = AppleSignInResult(
            identityToken: identityToken,
            authorizationCode: authorizationCode,
            fullName: credential.fullName,
            email: credential.email
        )

        continuation?.resume(returning: result)
        continuation = nil
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        if let authError = error as? ASAuthorizationError,
           authError.code == .canceled {
            continuation?.resume(throwing: AppleSignInError.cancelled)
        } else {
            continuation?.resume(throwing: AppleSignInError.failed(error))
        }
        continuation = nil
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding

extension AppleSignInService: @preconcurrency ASAuthorizationControllerPresentationContextProviding {

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Return the first window scene's key window
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return ASPresentationAnchor()
        }
        return window
    }
}

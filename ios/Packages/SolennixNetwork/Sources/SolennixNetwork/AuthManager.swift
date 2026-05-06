import Foundation
import Observation
import LocalAuthentication
import SolennixCore

// MARK: - Auth State

/// Represents the current authentication state of the app.
public enum AuthState: Sendable, Equatable {
    case unknown
    case authenticated(User)
    case unauthenticated
    case biometricLocked
}

// MARK: - Auth Response

/// Response from authentication endpoints.
/// Backend always returns `{ tokens: { access_token: "...", refresh_token: "..." }, user: { ... } }`.
public struct AuthResponse: Sendable {
    public let user: User
    public let accessToken: String
    public let refreshToken: String
}

extension AuthResponse: Decodable {

    private enum CodingKeys: String, CodingKey {
        case user
        case tokens
    }

    private enum TokensCodingKeys: String, CodingKey {
        case accessToken
        case refreshToken
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        user = try container.decode(User.self, forKey: .user)

        let tokensContainer = try container.nestedContainer(
            keyedBy: TokensCodingKeys.self,
            forKey: .tokens
        )
        accessToken = try tokensContainer.decode(String.self, forKey: .accessToken)
        refreshToken = try tokensContainer.decode(String.self, forKey: .refreshToken)
    }
}

// MARK: - Refresh Response

/// Response from the token refresh endpoint.
private struct RefreshResponse: Decodable {
    let accessToken: String
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken
        case refreshToken
    }
}

// MARK: - User Tracking Delegate

/// Protocol allowing the auth layer to report user identity changes
/// without depending on concrete analytics/crash-reporting packages.
public protocol UserTrackingDelegate: AnyObject, Sendable {
    func setUser(id: String, email: String, name: String)
    func clearUser()
}

// MARK: - Auth Manager

/// Manages authentication state, token storage, and user session lifecycle.
///
/// **Dependency cycle resolution:** `AuthManager` holds an optional reference to `APIClient`,
/// set after both are initialized. `APIClient` reads tokens directly from `KeychainHelper`
/// (not via `AuthManager`) to avoid the circular dependency.
@MainActor
@Observable
public final class AuthManager {

    // MARK: - Public Properties

    /// The currently authenticated user, if any.
    public private(set) var currentUser: User?

    /// Whether a network auth operation is in progress.
    public private(set) var isLoading: Bool = false

    /// The current authentication state.
    public private(set) var authState: AuthState = .unknown

    /// Computed convenience for checking authentication.
    public var isAuthenticated: Bool {
        if case .authenticated = authState { return true }
        return false
    }

    // MARK: - Dependencies

    private let keychain: KeychainHelper

    /// Reference to the APIClient, set after initialization to break the dependency cycle.
    /// AuthManager uses this to make authenticated API calls (login, register, etc.).
    public var apiClient: APIClient?

    /// Delegate for reporting user identity changes (e.g., to Sentry).
    /// Set by the app layer after initialization.
    public weak var userTrackingDelegate: UserTrackingDelegate?

    /// Tracks whether biometric authentication has already been passed in this app session.
    /// Reset on sign-out or app relaunch (since `@Observable` state is re-created).
    private var biometricPassed: Bool = false

    // MARK: - Init

    public init(keychain: KeychainHelper = .standard) {
        self.keychain = keychain
    }

    // MARK: - Session Restore

    /// Check for existing tokens in the Keychain and restore the session.
    /// Called once at app launch from `SolennixApp.task`.
    public func checkAuth() async {
        guard let accessToken = keychain.readString(for: KeychainHelper.Keys.accessToken),
              !accessToken.isEmpty else {
            authState = .unauthenticated
            return
        }

        // Gate on biometric unlock if enabled and not yet passed this session
        if isBiometricUnlockEnabled && canUseBiometrics() && !biometricPassed {
            authState = .biometricLocked
            return
        }

        // Try to fetch current user with the stored token
        do {
            guard let client = apiClient else {
                authState = .unauthenticated
                return
            }
            let user: User = try await client.get(Endpoint.me)
            currentUser = user
            authState = .authenticated(user)
            userTrackingDelegate?.setUser(id: user.id, email: user.email, name: user.name)
        } catch {
            // Distinguish network errors (timeout, no connection) from auth errors (401/403).
            // A timeout does NOT mean the token is invalid — it means we can't verify right now.
            if isNetworkError(error) {
                // Network issue: preserve session with cached user if available
                if let cachedUser = currentUser {
                    authState = .authenticated(cachedUser)
                } else {
                    // No cached user but tokens exist — optimistically assume authenticated.
                    // The next API call will trigger token refresh or re-auth if truly expired.
                    authState = .unauthenticated
                }
                return
            }

            // Auth error (401, 403, etc.): token is truly invalid, try refresh
            let refreshed = try? await refreshToken()
            if refreshed == true {
                // Retry fetching user after refresh
                if let client = apiClient,
                   let user: User = try? await client.get(Endpoint.me) {
                    currentUser = user
                    authState = .authenticated(user)
                    userTrackingDelegate?.setUser(id: user.id, email: user.email, name: user.name)
                } else {
                    clearTokens()
                    authState = .unauthenticated
                }
            } else {
                clearTokens()
                authState = .unauthenticated
            }
        }
    }

    // MARK: - Error Classification

    /// Returns `true` if the error is a network connectivity / timeout issue
    /// (as opposed to an HTTP-level auth error like 401 or 403).
    private func isNetworkError(_ error: Error) -> Bool {
        // URLError covers timeout, no connection, DNS failures, etc.
        if error is URLError {
            return true
        }
        // APIError.networkError is thrown by APIClient when it catches a URLError
        if case APIError.networkError = error {
            return true
        }
        return false
    }

    // MARK: - Sign In

    /// Authenticate with email and password.
    /// - Returns: The authenticated `User`.
    @discardableResult
    public func signIn(email: String, password: String) async throws -> User {
        isLoading = true
        defer { isLoading = false }

        guard let client = apiClient else {
            throw APIError.unknown
        }

        let body = ["email": email, "password": password]
        let response: AuthResponse = try await client.post(Endpoint.login, body: body)

        storeTokens(access: response.accessToken, refresh: response.refreshToken)
        currentUser = response.user
        authState = .authenticated(response.user)
        userTrackingDelegate?.setUser(id: response.user.id, email: response.user.email, name: response.user.name)
        return response.user
    }

    // MARK: - Sign Up

    /// Register a new account.
    /// - Returns: The newly created `User`.
    @discardableResult
    public func signUp(name: String, email: String, password: String) async throws -> User {
        isLoading = true
        defer { isLoading = false }

        guard let client = apiClient else {
            throw APIError.unknown
        }

        let body = ["name": name, "email": email, "password": password]
        let response: AuthResponse = try await client.post(Endpoint.register, body: body)

        storeTokens(access: response.accessToken, refresh: response.refreshToken)
        currentUser = response.user
        authState = .authenticated(response.user)
        userTrackingDelegate?.setUser(id: response.user.id, email: response.user.email, name: response.user.name)
        return response.user
    }

    // MARK: - Sign In with Apple

    /// Authenticate with an Apple identity token from Sign in with Apple.
    @discardableResult
    public func signInWithApple(
        identityToken: String,
        authorizationCode: String,
        fullName: String?,
        email: String?
    ) async throws -> User {
        isLoading = true
        defer { isLoading = false }

        guard let client = apiClient else {
            throw APIError.unknown
        }

        var body: [String: String] = [
            "identity_token": identityToken,
            "authorization_code": authorizationCode,
        ]
        if let fullName, !fullName.isEmpty {
            body["full_name"] = fullName
        }
        if let email, !email.isEmpty {
            body["email"] = email
        }

        let response: AuthResponse = try await client.post(Endpoint.appleAuth, body: body)

        storeTokens(access: response.accessToken, refresh: response.refreshToken)
        currentUser = response.user
        authState = .authenticated(response.user)
        userTrackingDelegate?.setUser(id: response.user.id, email: response.user.email, name: response.user.name)
        return response.user
    }

    // MARK: - Sign In with Google

    /// Authenticate with a Google ID token.
    @discardableResult
    public func signInWithGoogle(idToken: String, fullName: String?) async throws -> User {
        isLoading = true
        defer { isLoading = false }

        guard let client = apiClient else {
            throw APIError.unknown
        }

        var body: [String: String] = ["id_token": idToken]
        if let fullName, !fullName.isEmpty {
            body["full_name"] = fullName
        }

        let response: AuthResponse = try await client.post(Endpoint.googleAuth, body: body)

        storeTokens(access: response.accessToken, refresh: response.refreshToken)
        currentUser = response.user
        authState = .authenticated(response.user)
        userTrackingDelegate?.setUser(id: response.user.id, email: response.user.email, name: response.user.name)
        return response.user
    }

    // MARK: - Sign Out

    /// Sign out the current user. Clears tokens regardless of network errors.
    public func signOut() async {
        isLoading = true
        defer { isLoading = false }

        // Best-effort server logout — ignore errors
        if let client = apiClient {
            _ = try? await client.post(Endpoint.logout, body: EmptyBody()) as EmptyResponse
        }

        clearTokens()
        currentUser = nil
        biometricPassed = false
        authState = .unauthenticated
        userTrackingDelegate?.clearUser()
    }

    // MARK: - Token Refresh

    /// Attempt to refresh the access token using the stored refresh token.
    /// - Returns: `true` if the refresh succeeded, `false` otherwise.
    @discardableResult
    public func refreshToken() async throws -> Bool {
        guard let refreshTokenValue = keychain.readString(for: KeychainHelper.Keys.refreshToken),
              !refreshTokenValue.isEmpty else {
            return false
        }

        guard let client = apiClient else { return false }

        let body = ["refresh_token": refreshTokenValue]
        do {
            let response: RefreshResponse = try await client.post(Endpoint.refresh, body: body)
            storeTokens(access: response.accessToken, refresh: response.refreshToken)
            return true
        } catch {
            clearTokens()
            return false
        }
    }

    // MARK: - Profile Update

    /// Update the current user's profile.
    public func updateProfile(data: sending some Encodable) async throws {
        isLoading = true
        defer { isLoading = false }

        guard let client = apiClient else {
            throw APIError.unknown
        }

        let updatedUser: User = try await client.put(Endpoint.updateProfile, body: data)
        currentUser = updatedUser
        if case .authenticated = authState {
            authState = .authenticated(updatedUser)
        }
    }

    // MARK: - Biometrics

    /// Check whether biometric authentication (Face ID / Touch ID) is available.
    public func canUseBiometrics() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    /// Whether the user has opted-in to biometric unlock for the app.
    public var isBiometricUnlockEnabled: Bool {
        keychain.readString(for: KeychainHelper.Keys.biometricUnlockEnabled) == "true"
    }

    /// Persist the user's biometric unlock preference.
    public func setBiometricUnlockEnabled(_ enabled: Bool) {
        if enabled {
            keychain.saveString("true", for: KeychainHelper.Keys.biometricUnlockEnabled)
        } else {
            keychain.delete(for: KeychainHelper.Keys.biometricUnlockEnabled)
        }
    }

    /// Mark biometric authentication as passed for this session.
    /// Called after a successful biometric prompt so `checkAuth` proceeds to the API call.
    public func markBiometricPassed() {
        biometricPassed = true
    }

    /// Prompt the user for biometric authentication.
    /// - Returns: `true` if authentication succeeded.
    public func authenticateWithBiometrics() async throws -> Bool {
        let context = LAContext()
        context.localizedReason = "Desbloquear Solennix"
        let success = try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: "Inicia sesion con Face ID o Touch ID"
        )
        if success {
            biometricPassed = true
        }
        return success
    }

    // MARK: - Token Helpers (Public for APIClient)

    /// Read the current access token from the Keychain.
    public func getAccessToken() -> String? {
        keychain.readString(for: KeychainHelper.Keys.accessToken)
    }

    /// Clear all stored tokens and reset auth state.
    public func clearTokens() {
        keychain.delete(for: KeychainHelper.Keys.accessToken)
        keychain.delete(for: KeychainHelper.Keys.refreshToken)
        userTrackingDelegate?.clearUser()
    }

    // MARK: - Private Helpers

    private func storeTokens(access: String, refresh: String) {
        keychain.saveString(access, for: KeychainHelper.Keys.accessToken)
        keychain.saveString(refresh, for: KeychainHelper.Keys.refreshToken)
    }
}

// MARK: - Empty Body

/// An empty encodable body for POST requests that don't need a payload (e.g., logout).
private struct EmptyBody: Encodable {}

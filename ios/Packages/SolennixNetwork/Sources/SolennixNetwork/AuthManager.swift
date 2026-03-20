import Foundation
import Observation
import LocalAuthentication
import SolennixCore

// MARK: - Auth State

/// Represents the current authentication state of the app.
public enum AuthState: Sendable {
    case unknown
    case authenticated(User)
    case unauthenticated
    case biometricLocked
}

// MARK: - Auth Response

/// Flexible response struct that handles both token formats from the backend:
/// - Format 1 (legacy): `{ token: "...", user: { ... } }`
/// - Format 2 (current): `{ tokens: { access_token: "...", refresh_token: "..." }, user: { ... } }`
public struct AuthResponse: Sendable {
    public let user: User
    public let accessToken: String
    public let refreshToken: String
}

extension AuthResponse: Decodable {

    private enum CodingKeys: String, CodingKey {
        case user
        case token
        case tokens
    }

    private enum TokensCodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        user = try container.decode(User.self, forKey: .user)

        // Format 1: { token: "..." } — legacy single token
        if let singleToken = try? container.decode(String.self, forKey: .token) {
            accessToken = singleToken
            refreshToken = singleToken
        }
        // Format 2: { tokens: { access_token, refresh_token } }
        else {
            let tokensContainer = try container.nestedContainer(
                keyedBy: TokensCodingKeys.self,
                forKey: .tokens
            )
            accessToken = try tokensContainer.decode(String.self, forKey: .accessToken)
            refreshToken = try tokensContainer.decode(String.self, forKey: .refreshToken)
        }
    }
}

// MARK: - Refresh Response

/// Response from the token refresh endpoint.
private struct RefreshResponse: Decodable {
    let accessToken: String
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
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
            // Token might be expired; try refresh
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
    public func updateProfile(data: some Encodable) async throws {
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

    /// Prompt the user for biometric authentication.
    /// - Returns: `true` if authentication succeeded.
    public func authenticateWithBiometrics() async throws -> Bool {
        let context = LAContext()
        context.localizedReason = "Desbloquear Solennix"
        return try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: "Inicia sesion con Face ID o Touch ID"
        )
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

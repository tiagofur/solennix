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

/// Response from authentication endpoints that return user + token pair.
public struct AuthResponse: Sendable {
    public let user: User
    public let accessToken: String
    public let refreshToken: String
}

/// Response from register endpoint when email verification is required.
private struct RegisterResponse: Decodable {
    let user: User
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

// MARK: - User Tracking Delegate

/// Protocol allowing the auth layer to report user identity changes
/// without depending on concrete analytics/crash-reporting packages.
public protocol UserTrackingDelegate: AnyObject, Sendable {
    func setUser(id: String, email: String, name: String)
    func clearUser()
}

// MARK: - Sign Out Delegate

/// Protocol for best-effort work that must run BEFORE tokens are cleared on sign-out.
/// The app layer implements this to unregister the push device token while the auth
/// token is still valid. Errors are swallowed by the caller — keep implementations
/// lightweight and non-throwing.
public protocol SignOutDelegate: AnyObject, Sendable {
    /// Called inside `signOut()` after the server logout POST but before `clearTokens()`.
    /// Use `apiClient` to call authenticated endpoints; do NOT retain it past this call.
    func willClearTokens(apiClient: APIClient) async
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

    private let keychain: any KeychainStoring

    /// Backing store for the cached user JSON (mirrors Android `KEY_USER_JSON`).
    /// Tokens live in the Keychain; the user object is non-secret display data, so
    /// `UserDefaults` is the right place — it survives cold launch and is cheap to
    /// read synchronously during session restore.
    private let defaults: UserDefaults

    /// Reference to the APIClient, set after initialization to break the dependency cycle.
    /// AuthManager uses this to make authenticated API calls (login, register, etc.).
    public var apiClient: APIClient?

    /// Delegate for reporting user identity changes (e.g., to Sentry).
    /// Set by the app layer after initialization.
    public weak var userTrackingDelegate: UserTrackingDelegate?

    /// Delegate for best-effort work that must run before tokens are cleared on sign-out
    /// (e.g., unregistering the push device token). Set by the app layer after initialization.
    public weak var signOutDelegate: SignOutDelegate?

    /// Tracks whether biometric authentication has already been passed in this app session.
    /// Reset on sign-out or app relaunch (since `@Observable` state is re-created).
    private var biometricPassed: Bool = false

    // MARK: - Init

    public init(
        keychain: any KeychainStoring = KeychainHelper.standard,
        defaults: UserDefaults = .standard
    ) {
        self.keychain = keychain
        self.defaults = defaults
    }

    // MARK: - Session Restore

    /// Check for existing tokens in the Keychain and restore the session.
    /// Called once at app launch from `SolennixApp.task`.
    public func checkAuth() async {
        #if DEBUG
        if ProcessInfo.processInfo.environment["SOLX_UI_TEST_BYPASS_AUTH"] == "1" {
            let mockUser = User(
                id: "mock-user-id",
                email: "test@example.com",
                name: "Mock User",
                role: "admin",
                plan: .pro,
                createdAt: "2026-01-01T00:00:00Z",
                updatedAt: "2026-01-01T00:00:00Z"
            )
            currentUser = mockUser
            authState = .authenticated(mockUser)
            userTrackingDelegate?.setUser(id: mockUser.id, email: mockUser.email, name: mockUser.name)
            return
        }
        if ProcessInfo.processInfo.environment["SOLX_UI_TEST_MOCK_LOGIN"] == "1" {
            clearTokens()
            currentUser = nil
            authState = .unauthenticated
            return
        }
        #endif

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

        // Load the persisted user before the network call so the offline path
        // below can restore an optimistic session without a round-trip. Mirrors
        // Android's `loadCachedUser()` in `restoreSession()`.
        if currentUser == nil {
            currentUser = loadCachedUser()
        }

        // Try to fetch current user with the stored token
        do {
            guard let client = apiClient else {
                authState = .unauthenticated
                return
            }
            let user: User = try await client.get(Endpoint.me)
            setCurrentUser(user)
            authState = .authenticated(user)
            userTrackingDelegate?.setUser(id: user.id, email: user.email, name: user.name)
        } catch {
            // Distinguish network errors (timeout, no connection) from auth errors (401/403).
            // A timeout does NOT mean the token is invalid — it means we can't verify right now.
            if isNetworkError(error) {
                // Network issue: preserve session with cached user if available.
                if let cachedUser = currentUser {
                    authState = .authenticated(cachedUser)
                } else {
                    // Tokens exist but no cached user and we can't reach the server.
                    // Stay deferred (.unknown) instead of forcing logout — the reconnect
                    // hook (SolennixApp) will re-run checkAuth() once connectivity returns.
                    // Going .unauthenticated here was bug #800: it logged users out on every
                    // cold launch with no signal, even though their tokens were still valid.
                    authState = .unknown
                }
                return
            }

            // Auth error (401, 403, etc.): token is truly invalid, try refresh.
            // `refreshToken()` owns the token-clear decision:
            //   - definitive failure (401/403 from refresh) → clears tokens, returns false
            //   - transient failure (429/5xx/network) → keeps tokens, returns false
            // We must NOT call clearTokens() here — doing so would kill the session on a
            // transient failure such as a 429 rate-limit on the refresh endpoint.
            let refreshed = try? await refreshToken()
            if refreshed == true {
                // Retry fetching user after refresh
                if let client = apiClient,
                   let user: User = try? await client.get(Endpoint.me) {
                    setCurrentUser(user)
                    authState = .authenticated(user)
                    userTrackingDelegate?.setUser(id: user.id, email: user.email, name: user.name)
                } else {
                    clearTokens()
                    authState = .unauthenticated
                }
            } else {
                // Refresh failed.
                // - Definitive failure (401/403): tokens were cleared → go unauthenticated.
                // - Transient failure (429/5xx/network): tokens are still intact.
                //   Mirror the network-error path above: keep session alive so the app
                //   works offline and retries on the next launch / reconnect.
                let tokensIntact = keychain.readString(for: KeychainHelper.Keys.refreshToken) != nil
                if tokensIntact {
                    // Tokens survived — behave as if we couldn't reach the server.
                    if let cachedUser = currentUser {
                        authState = .authenticated(cachedUser)
                    } else {
                        // Tokens exist but no user yet — stay deferred. The reconnect
                        // hook (SolennixApp) re-runs checkAuth() when connectivity returns.
                        authState = .unknown
                    }
                } else {
                    authState = .unauthenticated
                }
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

    /// Returns `true` when a refresh error is definitive — the session cannot be recovered
    /// and tokens must be cleared immediately.
    ///
    /// - `APIError.unauthorized` (401): refresh token rejected (expired / revoked / family-revoked).
    /// - `APIError.serverError(403, _)`: access definitively denied.
    ///
    /// Any other error (429, 5xx, network) is **transient** — the session should survive
    /// and retry when conditions improve.
    ///
    /// Used by both `refreshToken()` and the test suite so they share a single source of truth.
    public static func isDefinitiveAuthFailure(_ error: Error) -> Bool {
        guard let apiError = error as? APIError else { return false }
        switch apiError {
        case .unauthorized:
            return true
        case .serverError(let statusCode, _) where statusCode == 403:
            return true
        case .accountBlocked, .accountDeleted:
            // Typed 403s from the auth code parser — the session is dead.
            return true
        default:
            return false
        }
    }

    // MARK: - Sign In

    /// Authenticate with email and password.
    /// - Returns: The authenticated `User`.
    @discardableResult
    public func signIn(email: String, password: String) async throws -> User {
        #if DEBUG
        if ProcessInfo.processInfo.environment["SOLX_UI_TEST_MOCK_LOGIN"] == "1" {
            let mockUser = User(
                id: "mock-user-id",
                email: email,
                name: "Mock User",
                role: "admin",
                plan: .pro,
                createdAt: "2026-01-01T00:00:00Z",
                updatedAt: "2026-01-01T00:00:00Z"
            )
            storeTokens(access: "mock_access_token", refresh: "mock_refresh_token")
            currentUser = mockUser
            authState = .authenticated(mockUser)
            userTrackingDelegate?.setUser(id: mockUser.id, email: mockUser.email, name: mockUser.name)
            return mockUser
        }
        #endif

        isLoading = true
        defer { isLoading = false }

        guard let client = apiClient else {
            throw APIError.unknown
        }

        let body = ["email": email, "password": password]
        let response: AuthResponse = try await client.post(Endpoint.login, body: body)

        storeTokens(access: response.accessToken, refresh: response.refreshToken)
        setCurrentUser(response.user)
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
        let response: RegisterResponse = try await client.post(Endpoint.register, body: body)
        return response.user
    }

    /// Requests a new verification email for an existing unverified account.
    public func resendEmailVerification(email: String) async throws {
        guard let client = apiClient else {
            throw APIError.unknown
        }

        let body = ["email": email]
        let _: EmptyResponse = try await client.post(Endpoint.verifyEmailResend, body: body)
    }

    // MARK: - Accept Team Invite

    /// Accepts a team-member invitation token and creates an account with password.
    @discardableResult
    public func acceptTeamInvite(token: String, password: String) async throws -> User {
        isLoading = true
        defer { isLoading = false }

        guard let client = apiClient else {
            throw APIError.unknown
        }

        let body = ["token": token, "password": password]
        let response: AuthResponse = try await client.post(Endpoint.teamInviteAccept, body: body)

        storeTokens(access: response.accessToken, refresh: response.refreshToken)
        setCurrentUser(response.user)
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
        setCurrentUser(response.user)
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
        setCurrentUser(response.user)
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

        // Best-effort pre-token-clear work (e.g., device token unregistration).
        // Must run while the auth token is still valid.
        if let client = apiClient {
            await signOutDelegate?.willClearTokens(apiClient: client)
        }

        clearTokens()
        clearCurrentUser()
        biometricPassed = false
        authState = .unauthenticated
        userTrackingDelegate?.clearUser()
    }

    // MARK: - Token Refresh

    /// Attempt to refresh the access token using the stored refresh token.
    ///
    /// Routes through `APIClient.attemptRefreshThrowing()` so this call shares the
    /// same `refreshTask` coalescing guard as APIClient's internal 401-retry path.
    /// Concurrent callers (e.g., `checkAuth` racing with a 401 retry) produce only
    /// one HTTP round-trip to the single-use refresh endpoint.
    ///
    /// Token storage is handled entirely by `APIClient.executeRefresh()`, so this
    /// method does NOT call `storeTokens` — doing so would double-write to the
    /// keychain and race with the already-stored new refresh token.
    ///
    /// Session-clear policy:
    /// - `APIError.unauthorized` (401) or `serverError(403, _)` from `/auth/refresh`
    ///   → definitive auth failure → clear tokens and end the session.
    /// - `serverError(429, _)`, `serverError(5xx, _)`, `networkError`, or any other
    ///   transient error → keep tokens intact; return `false` so the caller knows
    ///   the refresh didn't succeed but can retry when conditions improve.
    ///
    /// - Returns: `true` if the refresh succeeded (new tokens are in the keychain),
    ///   `false` for transient failures. Clears tokens and returns `false` on
    ///   definitive auth failure.
    @discardableResult
    public func refreshToken() async throws -> Bool {
        guard keychain.readString(for: KeychainHelper.Keys.refreshToken) != nil else {
            // No refresh token stored — end the session immediately.
            clearTokens()
            return false
        }

        guard let client = apiClient else { return false }

        do {
            return try await client.attemptRefreshThrowing()
        } catch {
            if AuthManager.isDefinitiveAuthFailure(error) {
                // 401 / 403 from /auth/refresh — session is dead, clear tokens.
                clearTokens()
            }
            // Transient errors (429, 5xx, network, unknown) keep tokens intact.
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
        setCurrentUser(updatedUser)
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

    /// Present the password fallback from the biometric lock screen.
    ///
    /// This clears the biometric-lock gate and transitions to `.unauthenticated` so
    /// the router surfaces LoginView — WITHOUT calling the server logout endpoint.
    /// The user's session tokens remain valid so they can sign in without disrupting
    /// sessions on other devices.
    ///
    /// Do NOT call `signOut()` for this — that invalidates the server session app-wide.
    @MainActor
    public func presentPasswordFallback() {
        // Reset biometric state so the gate does not reappear immediately.
        biometricPassed = false
        // Transition the router to unauthenticated without touching server tokens.
        // The tokens remain in the Keychain; the next successful login will reuse them.
        authState = .unauthenticated
    }

    /// Prompt the user for biometric authentication.
    /// - Returns: `true` if authentication succeeded.
    public func authenticateWithBiometrics() async throws -> Bool {
        let context = LAContext()
        context.localizedReason = NetL10n.text("auth.biometric.unlock_reason", "Unlock Solennix")
        let success = try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: NetL10n.text("auth.biometric.reason", "Sign in with Face ID or Touch ID")
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
        // Cancel any in-flight refresh so it does not store a just-revoked token.
        Task { await apiClient?.cancelInFlightRefresh() }
        keychain.delete(for: KeychainHelper.Keys.accessToken)
        keychain.delete(for: KeychainHelper.Keys.refreshToken)
        userTrackingDelegate?.clearUser()
    }

    /// Transition to the unauthenticated state after a definitive session expiry.
    ///
    /// Called by `APIClient` when a token refresh fails with a definitive error
    /// (401/403) and the UI must be brought back to the login screen.
    /// Safe to call multiple times — idempotent.
    ///
    /// - Note: Do NOT call this for transient refresh failures (429, 5xx, network).
    ///   Those should leave the session intact so the user can retry later.
    @MainActor
    public func handleSessionExpired() {
        #if DEBUG
        if ProcessInfo.processInfo.environment["SOLX_UI_TEST_MOCK_LOGIN"] == "1" {
            return
        }
        #endif
        guard isAuthenticated else { return }
        clearTokens()
        clearCurrentUser()
        authState = .unauthenticated
    }

    // MARK: - Private Helpers

    private func storeTokens(access: String, refresh: String) {
        keychain.saveString(access, for: KeychainHelper.Keys.accessToken)
        keychain.saveString(refresh, for: KeychainHelper.Keys.refreshToken)
    }

    // MARK: - Cached User Persistence

    /// UserDefaults key for the serialized current user. Mirrors Android's
    /// `KEY_USER_JSON` (`current_user`) so both native apps restore the session
    /// offline without a round-trip to `/auth/me`.
    private static let cachedUserKey = "com.solennix.app.currentUser"

    /// Sets the current user and persists it for offline session restore.
    /// Central write path — every successful auth flow funnels through here so
    /// the cache can never drift from the in-memory value.
    private func setCurrentUser(_ user: User) {
        currentUser = user
        if let data = try? JSONEncoder().encode(user) {
            defaults.set(data, forKey: Self.cachedUserKey)
        }
    }

    /// Clears both the in-memory user and its persisted cache.
    private func clearCurrentUser() {
        currentUser = nil
        defaults.removeObject(forKey: Self.cachedUserKey)
    }

    /// Loads the persisted user without touching the network. Returns `nil` if
    /// no cache exists or the cache is corrupt (treated as a cold launch).
    private func loadCachedUser() -> User? {
        guard let data = defaults.data(forKey: Self.cachedUserKey) else { return nil }
        return try? JSONDecoder().decode(User.self, from: data)
    }
}

// MARK: - Empty Body

/// An empty encodable body for POST requests that don't need a payload (e.g., logout).
private struct EmptyBody: Encodable {}

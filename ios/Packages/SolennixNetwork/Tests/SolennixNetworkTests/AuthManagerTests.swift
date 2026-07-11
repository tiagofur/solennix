import XCTest
@testable import SolennixNetwork
import SolennixCore

// MARK: - Bug #800: AuthManager must not log out on network failure with valid tokens
//
// `checkAuth()` runs once at cold launch. When `/auth/me` fails because the device
// is offline, the previous code dropped the session to `.unauthenticated` even though
// the tokens in the Keychain were still valid — sending the user to the login screen
// on every offline launch (#800).
//
// These tests pin the four paths through `checkAuth()` plus the new offline-session
// cache that mirrors Android's `KEY_USER_JSON`:
//
//   1. Tokens + reachable server           → .authenticated(user)
//   2. Tokens + network error + cached user → .authenticated(cachedUser)  (no logout)
//   3. Tokens + network error, no cache      → .unknown  (deferred, not .unauthenticated)
//   4. Tokens + 401 (refresh definitively fails) → .unauthenticated + tokens cleared
//   5. No tokens                              → .unauthenticated
//   6. Cache survives a cold launch (parity with Android)
//
// The suite uses a real KeychainHelper + UserDefaults against the test process and
// wipes the keys in setUp/tearDown so tests are isolated.

// MARK: - Mock URL Protocol

/// Routes every APIClient request through `MockURLProtocol.handler`. Each test installs
/// a handler that inspects the request URL and returns the canned response appropriate
/// to the scenario (success JSON, an HTTP error, or a `URLError` to simulate no network).
final class MockURLProtocol: URLProtocol, @unchecked Sendable {

    /// Describes what the mock should return for a request.
    enum Response {
        case success(Data, statusCode: Int = 200)
        case httpError(statusCode: Int, body: Data? = nil)
        case networkError
    }

    /// Set per-test. Receives the outgoing request, returns the canned response.
    /// Nonisolated(unsafe): only written once before the URLSession is created.
    nonisolated(unsafe) static var handler: (@Sendable (URLRequest) -> Response)?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let response = Self.handler?(request) else {
            client?.urlProtocol(self, didFailWithError: URLError(.unknown))
            return
        }

        switch response {
        case .success(let data, let statusCode):
            let http = HTTPURLResponse(
                url: request.url!,
                statusCode: statusCode,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "application/json"]
            )!
            client?.urlProtocol(self, didReceive: http, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)

        case .httpError(let statusCode, let body):
            let http = HTTPURLResponse(
                url: request.url!,
                statusCode: statusCode,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "application/json"]
            )!
            client?.urlProtocol(self, didReceive: http, cacheStoragePolicy: .notAllowed)
            if let body { client?.urlProtocol(self, didLoad: body) }
            client?.urlProtocolDidFinishLoading(self)

        case .networkError:
            // `.notConnectedToInternet` is classified as a network error by
            // AuthManager.isNetworkError → matches the #800 cold-launch scenario.
            client?.urlProtocol(
                self,
                didFailWithError: URLError(.notConnectedToInternet)
            )
        }
    }

    override func stopLoading() {}
}

// MARK: - AuthManager Tests

@MainActor
final class AuthManagerTests: XCTestCase {

    private let defaultsKey = "com.solennix.app.currentUser"

    // Dedicated defaults instance so tests never leak into the host app's UserDefaults.
    private lazy var defaults = UserDefaults(suiteName: "AuthManagerTests")!

    /// In-memory keychain shared by AuthManager and APIClient. The simulator
    /// keychain is unreliable in a host-less SPM test bundle, so we inject this
    /// dictionary-backed double via the `KeychainStoring` protocol.
    private let mockKeychain = MockKeychain()

    private var authManager: AuthManager!
    private var session: URLSession!
    private var apiClient: APIClient!

    // MARK: - Lifecycle

    override func setUp() async throws {
        try await super.setUp()

        defaults.removePersistentDomain(forName: "AuthManagerTests")
        mockKeychain.store.removeAll()

        // Fresh mock handler — each test sets its own.
        MockURLProtocol.handler = nil

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        // Don't let URLSession itself wait/retry — fail fast so tests stay quick.
        config.timeoutIntervalForRequest = 5
        config.timeoutIntervalForResource = 5
        session = URLSession(configuration: config)

        apiClient = APIClient(
            baseURL: URL(string: "https://api.solennix.com/api")!,
            keychainHelper: mockKeychain,
            session: session
        )

        authManager = AuthManager(keychain: mockKeychain, defaults: defaults)
        authManager.apiClient = apiClient
        // Wire the session-expired bridge so the 401 path can clear state, mirroring prod.
        await apiClient.setAuthManager(authManager)
    }

    override func tearDown() async throws {
        session.invalidateAndCancel()
        MockURLProtocol.handler = nil
        mockKeychain.store.removeAll()
        defaults.removePersistentDomain(forName: "AuthManagerTests")
        try await super.tearDown()
    }

    // MARK: - Helpers

    private func seedTokens() {
        mockKeychain.saveString("test-access-token", for: KeychainHelper.Keys.accessToken)
        mockKeychain.saveString("test-refresh-token", for: KeychainHelper.Keys.refreshToken)
    }

    /// Minimal valid `/auth/me` JSON payload in the snake_case shape the decoder expects.
    /// Captured into a local before installing the mock handler so the @Sendable closure
    /// never touches main-actor-isolated state.
    private let meResponseBody: Data = """
        {
            "id": "user-1",
            "email": "tiago@solennix.com",
            "name": "Tiago",
            "plan": "pro",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

    // MARK: - Scenario 1: reachable server authenticates and caches the user

    func testCheckAuth_ReachableServer_AuthenticatesAndPersistsUser() async {
        seedTokens()
        let body = meResponseBody
        MockURLProtocol.handler = { _ in .success(body) }

        await authManager.checkAuth()

        guard case .authenticated(let user) = authManager.authState else {
            return XCTFail("Expected .authenticated, got \(authManager.authState)")
        }
        XCTAssertEqual(user.id, "user-1")
        XCTAssertNotNil(defaults.data(forKey: defaultsKey), "User should be cached for offline restore")
    }

    // MARK: - Scenario 2: network error with a cached user keeps the session (#800 regression guard)

    func testCheckAuth_NetworkError_WithCachedUser_StaysAuthenticated() async {
        seedTokens()
        // Simulate a prior successful session that persisted the user to UserDefaults.
        let cached = User(
            id: "cached-user",
            email: "cached@solennix.com",
            name: "Cached",
            plan: .pro,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )
        defaults.set(try! JSONEncoder().encode(cached), forKey: defaultsKey)

        MockURLProtocol.handler = { _ in .networkError }

        await authManager.checkAuth()

        guard case .authenticated(let restored) = authManager.authState else {
            return XCTFail("Expected .authenticated(cached), got \(authManager.authState)")
        }
        XCTAssertEqual(restored.id, "cached-user", "Offline launch should restore the cached user")
    }

    // MARK: - Scenario 3: network error with NO cached user defers instead of logging out (#800 core fix)

    func testCheckAuth_NetworkError_NoCachedUser_DefersInsteadOfLogout() async {
        seedTokens()
        XCTAssertNil(defaults.data(forKey: defaultsKey), "precondition: no cached user")

        MockURLProtocol.handler = { _ in .networkError }

        await authManager.checkAuth()

        // The bug: this was .unauthenticated. Tokens exist, we just couldn't reach the
        // server — the session must stay deferred so the reconnect hook can retry.
        XCTAssertEqual(authManager.authState, .unknown, "#800: must not log out offline with valid tokens")

        // Tokens must be untouched.
        XCTAssertNotNil(mockKeychain.readString(for: KeychainHelper.Keys.accessToken))
        XCTAssertNotNil(mockKeychain.readString(for: KeychainHelper.Keys.refreshToken))
    }

    // MARK: - Scenario 4: 401 whose refresh also fails definitively clears the session

    func testCheckAuth_401_RefreshFailsDefinitively_ClearsSession() async {
        seedTokens()
        // /auth/me → 401; /auth/refresh → 401 (definitive failure → tokens cleared).
        MockURLProtocol.handler = { request in
            switch request.url?.path {
            case "/api/auth/refresh":
                return .httpError(statusCode: 401, body: #"{"message":"invalid refresh token"}"#.data(using: .utf8))
            default:
                return .httpError(statusCode: 401, body: #"{"message":"unauthorized"}"#.data(using: .utf8))
            }
        }

        await authManager.checkAuth()

        XCTAssertEqual(authManager.authState, .unauthenticated)
        XCTAssertNil(mockKeychain.readString(for: KeychainHelper.Keys.accessToken), "tokens should be cleared")
        XCTAssertNil(mockKeychain.readString(for: KeychainHelper.Keys.refreshToken))
    }

    // MARK: - Scenario 5: no tokens → unauthenticated immediately

    func testCheckAuth_NoTokens_Unauthenticated() async {
        // Intentionally do NOT seed tokens.
        let body = meResponseBody
        MockURLProtocol.handler = { _ in .success(body) }

        await authManager.checkAuth()

        XCTAssertEqual(authManager.authState, .unauthenticated)
    }

    // MARK: - Scenario 6: cached user survives a cold launch (Android KEY_USER_JSON parity)

    func testCachedUser_SurvivesColdLaunch() async {
        seedTokens()
        let body = meResponseBody
        MockURLProtocol.handler = { _ in .success(body) }

        // First "process": authenticate and persist the user.
        await authManager.checkAuth()
        guard case .authenticated = authManager.authState else {
            return XCTFail("precondition: should authenticate")
        }
        let persistedData = defaults.data(forKey: defaultsKey)
        XCTAssertNotNil(persistedData)

        // Simulate a cold launch: new AuthManager instance (in-memory currentUser is nil),
        // server unreachable. The persisted cache must drive an optimistic session.
        let relaunched = AuthManager(keychain: mockKeychain, defaults: defaults)
        relaunched.apiClient = apiClient
        XCTAssertNil(relaunched.currentUser, "precondition: fresh process has no in-memory user")

        MockURLProtocol.handler = { _ in .networkError }
        await relaunched.checkAuth()

        guard case .authenticated(let restored) = relaunched.authState else {
            return XCTFail("Cold launch offline should restore session from cache, got \(relaunched.authState)")
        }
        XCTAssertEqual(restored.id, "user-1")
    }

    // MARK: - Sign-out clears the cache

    func testSignOut_ClearsCachedUser() async {
        seedTokens()
        let body = meResponseBody
        MockURLProtocol.handler = { _ in .success(body) }
        await authManager.checkAuth()
        XCTAssertNotNil(defaults.data(forKey: defaultsKey), "precondition: user cached")

        await authManager.signOut()

        XCTAssertNil(defaults.data(forKey: defaultsKey), "signOut should clear the user cache")
        XCTAssertNil(authManager.currentUser)
    }
}

// MARK: - Mock Keychain

/// Thread-unsafe by design — tests are `@MainActor` and serial. Backs the
/// `KeychainStoring` protocol with a dictionary so the suite never touches the
/// simulator keychain (unreliable in a host-less SPM test bundle).
final class MockKeychain: KeychainStoring, @unchecked Sendable {
    private var _store: [String: String] = [:]

    var store: [String: String] {
        get { _store }
        set { _store = newValue }
    }

    func saveString(_ value: String, for key: String) -> Bool {
        _store[key] = value
        return true
    }

    func readString(for key: String) -> String? { _store[key] }

    func delete(for key: String) -> Bool {
        _store.removeValue(forKey: key)
        return true
    }
}

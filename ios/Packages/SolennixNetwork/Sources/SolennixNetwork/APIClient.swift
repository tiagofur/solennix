import Foundation
import SolennixCore

// MARK: - Upload Response

/// Response returned from the image upload endpoint.
public struct UploadResponse: Codable, Sendable {
    public let url: String
    public let thumbnailUrl: String?
}

// MARK: - Refresh Token Payload

/// Decoded response from `POST /auth/refresh`.
/// Internal to the network package; consumers receive `Bool` from `performCoalescedRefresh()`.
private struct RefreshTokenPayload: Decodable {
    let accessToken: String
    let refreshToken: String
}

// MARK: - API Client

/// An actor-based HTTP client for communicating with the Solennix API.
///
/// **Token management:** The client reads tokens directly from `KeychainHelper`
/// (not via `AuthManager`) to break the circular dependency. When a 401 is
/// received, it attempts a single token refresh via `AuthManager.refreshToken()`,
/// then retries the original request.
public actor APIClient {

    // MARK: - Properties

    private let baseURL: URL
    private let keychainHelper: KeychainHelper
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let offlineMutationQueue: OfflineMutationQueue

    /// Reference to AuthManager for token refresh operations.
    /// Set after initialization to break the dependency cycle.
    private weak var _authManager: AuthManager?

    /// Task that guards concurrent refresh attempts — only one refresh runs at a time.
    private var refreshTask: Task<Bool, Error>?

    /// Earliest point in time at which the offline mutation flush may run again.
    /// Set when a queued replay receives a 429; enforces the `Retry-After` delay.
    private var nextFlushAllowedAt: Date?

    /// Maximum number of automatic retries for transient errors (5xx, timeouts).
    private let maxRetries = 2
    /// Base delay between retries in seconds (exponential: 1s, 2s).
    private let retryBaseDelay: TimeInterval = 1.0
    
    /// Callback invoked on the main actor when an API error should be shown to the user.
    /// The network layer delegates UI concerns (e.g., toasts) to the caller via this closure.
    private var onError: (@MainActor @Sendable (String) -> Void)?

    // MARK: - Init

    /// Creates a new API client.
    /// - Parameters:
    ///   - baseURL: The base URL of the API (e.g., `https://api.solennix.com`).
    ///   - keychainHelper: The keychain helper for reading auth tokens.
    public init(
        baseURL: URL = URL(string: "https://api.solennix.com/api")!,
        keychainHelper: KeychainHelper = .standard
    ) {
        self.baseURL = baseURL
        self.keychainHelper = keychainHelper

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase

        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
        self.offlineMutationQueue = OfflineMutationQueue()
    }

    /// Resolves a relative API path (e.g. `/api/uploads/...`) to an absolute URL.
    /// If the path is already absolute (has a scheme), returns it as-is.
    public func resolveURL(_ path: String) -> URL? {
        Self.resolveURL(path, baseURL: baseURL)
    }

    /// Static URL resolver using the default base URL.
    /// Use this when you don't have access to an APIClient instance.
    public static func resolveURL(_ path: String, baseURL: URL = URL(string: "https://api.solennix.com/api")!) -> URL? {
        if path.hasPrefix("http://") || path.hasPrefix("https://") {
            return URL(string: path)
        }
        return URL(string: path, relativeTo: baseURL)
    }

    /// Set the auth manager reference after both objects are initialized.
    public func setAuthManager(_ manager: AuthManager) {
        self._authManager = manager
    }

    /// Cancel any in-flight token refresh and nil out the task handle.
    ///
    /// Call this at the start of `AuthManager.clearTokens()` / `signOut()` so a
    /// concurrent refresh that already read a valid refresh token cannot race ahead
    /// and send it to the backend after it has been revoked — which would trigger
    /// backend reuse-detection and family-revoke all tokens.
    public func cancelInFlightRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
    }
    
    /// Set a callback to be invoked when a user-facing error occurs.
    /// This allows the UI layer to display toasts without the network layer
    /// depending on UI packages.
    public func setErrorHandler(_ handler: @escaping @MainActor @Sendable (String) -> Void) {
        self.onError = handler
    }

    /// Attempts to replay pending offline mutations in FIFO order.
    public func flushQueuedMutations() async {
        await flushOfflineQueue()
    }

    /// Public entry point for a coalesced token refresh, used by `AuthManager.refreshToken()`.
    ///
    /// Routes through the same `refreshTask` guard used by the internal 401-retry path,
    /// so concurrent callers — whether triggered by `AuthManager` at startup/manual
    /// refresh or by an in-flight 401 retry — share a single network round-trip.
    /// Single-use refresh token semantics are upheld: only one HTTP call reaches the
    /// backend even if multiple callers race.
    ///
    /// - Returns: `true` if the refresh succeeded and new tokens are stored in the keychain.
    ///   `false` for any failure — the caller is responsible for deciding whether to
    ///   clear tokens or treat the failure as transient.
    public func performCoalescedRefresh() async -> Bool {
        return await attemptRefresh()
    }

    // MARK: - Public HTTP Methods

    /// Perform a GET request.
    /// - Parameters:
    ///   - endpoint: The API endpoint path (e.g., `/auth/me`).
    ///   - params: Optional query parameters.
    /// - Returns: The decoded response of type `T`.
    public func get<T: Decodable>(
        _ endpoint: String,
        params: [String: String]? = nil
    ) async throws -> T {
        let request = try buildRequest(endpoint, method: "GET", params: params)
        return try await execute(request)
    }

    /// Perform a GET request and return the raw response `Data`.
    /// Used for endpoints that return non-JSON content (e.g. iCal `.ics` files).
    public func getData(
        _ endpoint: String,
        params: [String: String]? = nil
    ) async throws -> Data {
        let request = try buildRequest(endpoint, method: "GET", params: params)
        return try await performRaw(request)
    }

    /// Perform a POST request with a JSON body and return the raw response Data.
    public func postData(
        _ endpoint: String,
        body: some Encodable
    ) async throws -> Data {
        var request = try buildRequest(endpoint, method: "POST")
        request.httpBody = try encoder.encode(body)
        return try await performRaw(request)
    }

    /// Fetch a paginated response, with fallback to plain array.
    /// Use this for list views that expect PaginatedResponse but the backend may return a plain array.
    public func getPaginated<T: Decodable>(
        _ endpoint: String,
        params: [String: String]? = nil
    ) async throws -> PaginatedResponse<T> {
        let request = try buildRequest(endpoint, method: "GET", params: params)
        let data = try await performRaw(request)

        // Safeguard against unallocated Go slices returning "null"
        if String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) == "null" {
            return PaginatedResponse<T>(data: [], total: 0, page: 1, limit: 20, totalPages: 1)
        }

        // Try paginated format first
        if let paginated = try? decoder.decode(PaginatedResponse<T>.self, from: data) {
            return paginated
        }
        // Fall back: wrap plain array as a single-page PaginatedResponse
        let array = try decoder.decode([T].self, from: data)
        return PaginatedResponse<T>(data: array, total: array.count, page: 1, limit: array.count, totalPages: 1)
    }

    /// Fetch all items from a paginated endpoint by requesting a high limit.
    /// Handles both paginated (`{ "data": [...] }`) and plain array responses.
    public func getAll<T: Decodable>(
        _ endpoint: String,
        params: [String: String]? = nil
    ) async throws -> [T] {
        var allParams = params ?? [:]
        allParams["page"] = "1"
        allParams["limit"] = "10000"
        let request = try buildRequest(endpoint, method: "GET", params: allParams)
        let data = try await performRaw(request)

        // Safeguard against unallocated Go slices returning as "null" instead of "[]"
        if String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) == "null" {
            return []
        }

        // Try paginated response first
        if let paginated = try? decoder.decode(PaginatedResponse<T>.self, from: data) {
            return paginated.data
        }
        // Fall back to plain array
        if let array = try? decoder.decode([T].self, from: data) {
            return array
        }
        // Both decode attempts failed — log a real error to help diagnose schema drift.
        do {
            _ = try decoder.decode(PaginatedResponse<T>.self, from: data)
        } catch {
            let url = request.url?.absoluteString ?? "?"
            let preview = String(data: data.prefix(800), encoding: .utf8) ?? "<binary>"
            NSLog("[APIClient.getAll] ❌ decode failed for %@ as PaginatedResponse<%@>: %@\n  body preview: %@",
                  url, String(describing: T.self), String(describing: error), preview)
        }
        throw APIError.decodingError
    }

    /// Performs a request and returns raw Data (used by getAll for manual decoding).
    private func performRaw(_ request: URLRequest) async throws -> Data {
        do {
            return try await perform(request, isRetry: false)
        } catch let urlError as URLError {
            let err = APIError.networkError(APIError.userFacingMessage(for: urlError))
            showErrorToast(for: err)
            throw err
        }
    }

    /// Perform a POST request with a JSON body.
    /// - Parameters:
    ///   - endpoint: The API endpoint path.
    ///   - body: The request body to encode as JSON.
    /// - Returns: The decoded response of type `T`.
    public func post<T: Decodable>(
        _ endpoint: String,
        body: some Encodable
    ) async throws -> T {
        var request = try buildRequest(endpoint, method: "POST")
        let bodyData = try encoder.encode(body)
        request.httpBody = bodyData

        do {
            return try await execute(request, suppressNetworkToast: true)
        } catch let apiError as APIError {
            if await queueMutationIfNeeded(
                apiError: apiError,
                endpoint: endpoint,
                method: "POST",
                bodyData: bodyData,
                idempotencyKey: request.value(forHTTPHeaderField: "X-Idempotency-Key")
            ) {
                let queuedError = APIError.networkError(
                    "Sin conexión: guardamos tu cambio y se enviará automáticamente al reconectarte."
                )
                showErrorToast(for: queuedError)
                throw queuedError
            }
            if case .networkError = apiError {
                showErrorToast(for: apiError)
            }

            throw apiError
        }
    }

    /// Perform a PUT request with a JSON body.
    /// - Parameters:
    ///   - endpoint: The API endpoint path.
    ///   - body: The request body to encode as JSON.
    /// - Returns: The decoded response of type `T`.
    public func put<T: Decodable>(
        _ endpoint: String,
        body: some Encodable
    ) async throws -> T {
        var request = try buildRequest(endpoint, method: "PUT")
        let bodyData = try encoder.encode(body)
        request.httpBody = bodyData

        do {
            return try await execute(request, suppressNetworkToast: true)
        } catch let apiError as APIError {
            if await queueMutationIfNeeded(
                apiError: apiError,
                endpoint: endpoint,
                method: "PUT",
                bodyData: bodyData,
                idempotencyKey: request.value(forHTTPHeaderField: "X-Idempotency-Key")
            ) {
                let queuedError = APIError.networkError(
                    "Sin conexión: guardamos tu cambio y se enviará automáticamente al reconectarte."
                )
                showErrorToast(for: queuedError)
                throw queuedError
            }
            if case .networkError = apiError {
                showErrorToast(for: apiError)
            }

            throw apiError
        }
    }

    public func patch<T: Decodable>(
        _ endpoint: String,
        body: some Encodable
    ) async throws -> T {
        var request = try buildRequest(endpoint, method: "PATCH")
        let bodyData = try encoder.encode(body)
        request.httpBody = bodyData

        do {
            return try await execute(request, suppressNetworkToast: true)
        } catch let apiError as APIError {
            if await queueMutationIfNeeded(
                apiError: apiError,
                endpoint: endpoint,
                method: "PATCH",
                bodyData: bodyData,
                idempotencyKey: request.value(forHTTPHeaderField: "X-Idempotency-Key")
            ) {
                let queuedError = APIError.networkError(
                    "Sin conexión: guardamos tu cambio y se enviará automáticamente al reconectarte."
                )
                showErrorToast(for: queuedError)
                throw queuedError
            }
            if case .networkError = apiError {
                showErrorToast(for: apiError)
            }

            throw apiError
        }
    }

    /// Perform a DELETE request.
    /// - Parameter endpoint: The API endpoint path.
    public func delete(_ endpoint: String) async throws {
        let request = try buildRequest(endpoint, method: "DELETE")
        do {
            let _: EmptyResponse = try await execute(request, suppressNetworkToast: true)
        } catch let apiError as APIError {
            if await queueMutationIfNeeded(
                apiError: apiError,
                endpoint: endpoint,
                method: "DELETE",
                bodyData: nil,
                idempotencyKey: request.value(forHTTPHeaderField: "X-Idempotency-Key")
            ) {
                showErrorToast(for: .networkError("Sin conexión: la eliminación quedó en cola y se enviará automáticamente."))
                return
            }
            if case .networkError = apiError {
                showErrorToast(for: apiError)
            }

            throw apiError
        }
    }

    /// Upload a file using multipart/form-data.
    /// - Parameters:
    ///   - endpoint: The API endpoint path (e.g., `/uploads/image`).
    ///   - data: The file data to upload.
    ///   - filename: The filename to include in the multipart body.
    /// - Returns: An `UploadResponse` with the uploaded file's URL.
    public func upload(
        _ endpoint: String,
        data: Data,
        filename: String
    ) async throws -> UploadResponse {
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = try buildRequest(endpoint, method: "POST")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = createMultipartBody(data: data, filename: filename, boundary: boundary)
        return try await execute(request)
    }

    // MARK: - Request Building

    private func buildRequest(
        _ endpoint: String,
        method: String,
        params: [String: String]? = nil
    ) throws -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(endpoint), resolvingAgainstBaseURL: true)

        if let params, !params.isEmpty {
            components?.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        }

        guard let url = components?.url else {
            throw APIError.unknown
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if method == "POST" || method == "PUT" || method == "DELETE" {
            request.setValue(UUID().uuidString, forHTTPHeaderField: "X-Idempotency-Key")
        }

        // Attach Bearer token from Keychain
        if let token = keychainHelper.readString(for: KeychainHelper.Keys.accessToken) {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    // MARK: - Request Execution

    private func execute<T: Decodable>(
        _ request: URLRequest,
        isRetry: Bool = false,
        suppressNetworkToast: Bool = false
    ) async throws -> T {
        let isIdempotent = request.httpMethod == "GET"
        var lastError: Error?

        // Retry loop: attempt once + up to maxRetries for transient errors (GET only)
        let attempts = isIdempotent ? (1 + maxRetries) : 1
        for attempt in 0..<attempts {
            // Exponential backoff delay before retries (not before first attempt)
            if attempt > 0 {
                let delay = retryBaseDelay * pow(2.0, Double(attempt - 1))
                try await Task.sleep(for: .seconds(delay))
            }

            do {
                let data = try await perform(request, isRetry: isRetry)

                // Handle 204 No Content
                if data.isEmpty {
                    if let empty = EmptyResponse() as? T {
                        return empty
                    }
                    throw APIError.decodingError
                }

                // Decode JSON response
                do {
                    return try decoder.decode(T.self, from: data)
                } catch {
                    let url = request.url?.absoluteString ?? "?"
                    let preview = String(data: data.prefix(500), encoding: .utf8) ?? "<binary>"
                    NSLog("[APIClient] ❌ decode failed for %@ as %@: %@\n  body preview: %@",
                          url, String(describing: T.self), String(describing: error), preview)
                    throw APIError.decodingError
                }
            } catch let urlError as URLError where isIdempotent && isTransient(urlError) && attempt < attempts - 1 {
                lastError = urlError
                continue
            } catch let apiError as APIError where isIdempotent && isTransientServer(apiError) && attempt < attempts - 1 {
                lastError = apiError
                continue
            } catch let urlError as URLError {
                let err = APIError.networkError(APIError.userFacingMessage(for: urlError))
                if !suppressNetworkToast {
                    showErrorToast(for: err)
                }
                throw err
            } catch {
                if let apiError = error as? APIError {
                    showErrorToast(for: apiError)
                }
                throw error
            }
        }

        // Should not reach here, but handle the final error
        if let urlError = lastError as? URLError {
            let err = APIError.networkError(APIError.userFacingMessage(for: urlError))
            if !suppressNetworkToast {
                showErrorToast(for: err)
            }
            throw err
        }
        throw lastError ?? APIError.unknown
    }

    /// Whether a URLError is transient and worth retrying.
    private func isTransient(_ error: URLError) -> Bool {
        switch error.code {
        case .timedOut, .networkConnectionLost, .notConnectedToInternet,
             .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
            return true
        default:
            return false
        }
    }

    /// Whether an APIError represents a transient server error (5xx).
    private func isTransientServer(_ error: APIError) -> Bool {
        if case .serverError(let statusCode, _) = error, (500...599).contains(statusCode) {
            return true
        }
        return false
    }

    private func queueMutationIfNeeded(
        apiError: APIError,
        endpoint: String,
        method: String,
        bodyData: Data?,
        idempotencyKey: String?
    ) async -> Bool {
        guard Self.shouldQueueMutation(endpoint: endpoint, method: method) else { return false }
        guard case .networkError = apiError else { return false }

        let mutation = QueuedMutation(
            id: UUID().uuidString,
            endpoint: endpoint,
            method: method,
            bodyBase64: bodyData?.base64EncodedString(),
            idempotencyKey: idempotencyKey ?? UUID().uuidString,
            createdAt: Date()
        )
        await offlineMutationQueue.enqueue(mutation)
        return true
    }

    static func shouldQueueMutation(endpoint: String, method: String) -> Bool {
        guard method == "POST" || method == "PUT" || method == "DELETE" else { return false }

        // Auth and upload flows should fail fast and not be replayed later.
        if endpoint.hasPrefix("/auth") || endpoint.hasPrefix("/uploads") {
            return false
        }

        return true
    }

    private func flushOfflineQueue() async {
        // Honour any active Retry-After backoff from a previous 429 during flush.
        if let notBefore = nextFlushAllowedAt, Date() < notBefore {
            return
        }

        // Peek without clearing — items are removed from persistent storage only after
        // each one is successfully sent (or permanently dropped). This makes the flush
        // crash-safe: if the app is killed mid-flush, surviving mutations are replayed
        // on the next launch rather than silently lost.
        let pendingMutations = await offlineMutationQueue.peekAll()
        guard !pendingMutations.isEmpty else { return }

        var index = 0

        while index < pendingMutations.count {
            let mutation = pendingMutations[index]

            do {
                var request = try buildRequest(mutation.endpoint, method: mutation.method)
                request.setValue(mutation.idempotencyKey, forHTTPHeaderField: "X-Idempotency-Key")
                if let bodyBase64 = mutation.bodyBase64 {
                    request.httpBody = Data(base64Encoded: bodyBase64)
                }

                let (_, httpResponse) = try await performReturningResponse(request)
                _ = httpResponse // success — remove this item from persistent storage
                index += 1
                // Persist the remaining queue (items not yet sent) after each success.
                // If the app is killed here, only the just-sent item is gone; the rest survive.
                await offlineMutationQueue.replace(with: Array(pendingMutations[index...]))
            } catch let flushError as FlushError {
                switch flushError {
                case .rateLimited(let retryAfter):
                    // Backend asked us to back off. Stop the current flush, keep all
                    // remaining mutations (including the rate-limited one), and record
                    // the earliest time the next flush attempt is allowed.
                    let delay = TimeInterval(retryAfter)
                    nextFlushAllowedAt = Date().addingTimeInterval(delay)
                    // Queue already contains these items (we peeked, not dequeued).
                    // Replace with the remaining slice to truncate any already-sent ones.
                    await offlineMutationQueue.replace(with: Array(pendingMutations[index...]))
                    return
                }
            } catch let apiError as APIError {
                switch apiError {
                case .serverError(let statusCode, _) where Self.shouldDropReplay(statusCode: statusCode):
                    // Permanent client-side error: drop this mutation and continue.
                    index += 1
                    await offlineMutationQueue.replace(with: Array(pendingMutations[index...]))
                default:
                    // Transient error — leave remaining items in the queue and stop.
                    await offlineMutationQueue.replace(with: Array(pendingMutations[index...]))
                    return
                }
            } catch {
                await offlineMutationQueue.replace(with: Array(pendingMutations[index...]))
                return
            }
        }
    }

    /// Executes a URLRequest and returns the decoded data alongside the raw HTTP response.
    /// Used by the offline flush path to inspect response headers (e.g., `Retry-After`)
    /// before the response data is decoded or discarded.
    ///
    /// Throws `FlushError.rateLimited` when the server responds with 429,
    /// `APIError` for other HTTP errors, or rethrows network-level errors.
    private func performReturningResponse(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        if httpResponse.statusCode == 429 {
            // Read the integer Retry-After header; fall back to a 30-second default.
            let retryAfterSeconds: Int
            if let headerValue = httpResponse.value(forHTTPHeaderField: "Retry-After"),
               let seconds = Int(headerValue) {
                retryAfterSeconds = seconds
            } else {
                retryAfterSeconds = 30
            }
            throw FlushError.rateLimited(retryAfterSeconds: retryAfterSeconds)
        }

        // Offline flush is never the auth/refresh endpoint, so toast suppression is off.
        try validateResponse(httpResponse, data: data, suppressToastFor429: false)
        return (data, httpResponse)
    }

    /// Errors specific to the offline mutation flush path.
    private enum FlushError: Error {
        /// The server responded with 429. `retryAfterSeconds` is taken from the
        /// integer `Retry-After` header, or defaults to 30 if the header is absent.
        case rateLimited(retryAfterSeconds: Int)
    }

    static func shouldDropReplay(statusCode: Int) -> Bool {
        statusCode >= 400 && statusCode < 500 && statusCode != 429
    }

    // MARK: - Perform Request

    /// Executes the URLRequest, validates the HTTP response, and handles 401 retry via token refresh.
    private func perform(_ request: URLRequest, isRetry: Bool) async throws -> Data {
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        // Suppress user-facing 429 toast for the refresh endpoint — the user did not
        // trigger this request and showing a toast would be confusing noise.
        let suppressToastFor429 = isAuthEndpoint(request.url)

        // On 401 and not already a retry, attempt token refresh then retry once.
        // CRITICAL: skip this for the auth endpoints themselves — those are the routes
        // that ISSUE tokens, not consume them. A 401 there means "bad credentials" or
        // "no refresh token yet", not "expired token". Without this guard, the very
        // first login attempt triggers an infinite refresh loop and the request hangs
        // until the URLSession timeout fires.
        if httpResponse.statusCode == 401, !isRetry, !isAuthEndpoint(request.url) {
            do {
                let refreshed = try await attemptRefreshThrowing()
                if refreshed {
                    // Rebuild request with new token
                    var retryRequest = request
                    if let token = keychainHelper.readString(for: KeychainHelper.Keys.accessToken) {
                        retryRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    return try await perform(retryRequest, isRetry: true)
                }
                // Refresh returned false without throwing — transient; fall through to
                // validateResponse which will throw .unauthorized to the caller.
            } catch {
                // Definitive failure (401/403 from /auth/refresh): notify AuthManager so
                // the UI transitions to .unauthenticated. Transient errors are swallowed by
                // attemptRefresh() at the call site — this branch only fires for definitive ones.
                if AuthManager.isDefinitiveAuthFailure(error) {
                    let manager = _authManager
                    Task { @MainActor in
                        await manager?.handleSessionExpired()
                    }
                }
                // Re-throw so the original caller knows the request failed.
                throw error
            }
        }

        try validateResponse(httpResponse, data: data, suppressToastFor429: suppressToastFor429)
        return data
    }

    /// Returns true if the URL targets an auth endpoint that issues tokens
    /// (login, register, refresh, OAuth providers, password reset) or an endpoint
    /// whose 401 means "wrong credential" rather than "expired token". 401 on
    /// these routes must propagate as "invalid credentials", not trigger refresh.
    ///
    /// `/auth/change-password` belongs here because the backend returns 401 when
    /// the supplied *current* password is wrong (auth.current_password_incorrect),
    /// not when the session token has expired. Excluding it prevents a typo from
    /// triggering the token-refresh path and potentially logging the user out.
    private nonisolated func isAuthEndpoint(_ url: URL?) -> Bool {
        guard let path = url?.path else { return false }
        let authPaths = [
            "/auth/login",
            "/auth/register",
            "/auth/refresh",
            "/auth/google",
            "/auth/apple",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/auth/change-password"
        ]
        return authPaths.contains { path.hasSuffix($0) }
    }

    // MARK: - Token Refresh

    /// Coalescing guard for all concurrent refresh callers.
    ///
    /// Because `APIClient` is an `actor`, the check-and-set of `refreshTask` is
    /// atomic — no suspension point separates them. Any caller that arrives while
    /// a refresh `Task` is already running awaits the same `Task.value` instead of
    /// starting a second HTTP round-trip. This enforces single-use token semantics:
    /// at most one `/auth/refresh` call reaches the backend at any instant.
    ///
    /// Used by:
    /// - `perform(_:isRetry:)` — internal 401-retry path.
    /// - `performCoalescedRefresh()` — public entry point for `AuthManager`.
    ///
    /// Swallows errors to `Bool` so the 401-retry path can continue unconditionally.
    /// `AuthManager.refreshToken()` uses `attemptRefreshThrowing()` to
    /// receive typed errors for session-clear discrimination.
    private func attemptRefresh() async -> Bool {
        return (try? await attemptRefreshThrowing()) ?? false
    }

    /// Throwing variant of the coalescing guard. Surfaces the underlying `APIError`
    /// so callers that need to distinguish 401/403 (definitive auth failure) from
    /// 429/5xx/network errors (transient) can do so without a second request.
    ///
    /// `Task<Bool, Error>` stores the result/error so any number of concurrent
    /// waiters receive the exact same outcome from a single HTTP round-trip.
    ///
    /// - Warning: `AuthManager.refreshToken()` is the **policy entry point** for token refresh.
    ///   Callers that invoke `attemptRefreshThrowing()` directly bypass the definitive-failure
    ///   state machine (token clearing + `handleSessionExpired`). Only call this directly if
    ///   you take full responsibility for handling both transient and definitive failures.
    func attemptRefreshThrowing() async throws -> Bool {
        if let existingTask = refreshTask {
            return try await existingTask.value
        }

        let task = Task<Bool, Error> {
            return try await self.executeRefresh()
        }

        refreshTask = task
        defer { refreshTask = nil }

        return try await task.value
    }

    /// Performs the actual HTTP refresh request and stores the new tokens in the keychain.
    ///
    /// Intentionally separate from the coalescing wrapper so business logic lives here
    /// and the guard stays thin. Only one concurrent call to this method will ever run
    /// (enforced by `refreshTask` in `attemptRefreshThrowing`).
    ///
    /// Throws `APIError` on any failure, preserving the full error type so callers
    /// can discriminate `.unauthorized` / `.serverError(403,_)` (definitive) from
    /// `.serverError(429,_)` / `.serverError(5xx,_)` / `.networkError` (transient).
    private func executeRefresh() async throws -> Bool {
        guard let refreshTokenValue = keychainHelper.readString(for: KeychainHelper.Keys.refreshToken),
              !refreshTokenValue.isEmpty else {
            // No refresh token in keychain — treat as definitive auth failure.
            throw APIError.unauthorized
        }

        // Guard: if signOut/clearTokens cancelled us between reading the refresh token
        // above and actually sending the HTTP request, bail out now so we do not send a
        // just-revoked token to the backend (which would trigger family-revocation).
        try Task.checkCancellation()

        var request = try buildRequest(Endpoint.refresh, method: "POST")
        request.httpBody = try encoder.encode(["refresh_token": refreshTokenValue])
        // Pass isRetry: true so `perform` does not recurse into another refresh loop.
        let data = try await perform(request, isRetry: true)

        // Second cancellation check: the HTTP round-trip suspended us. If the task was
        // cancelled while the request was in-flight, do not persist the returned tokens —
        // the keychain may already be clean after signOut.
        try Task.checkCancellation()

        let decoded = try decoder.decode(RefreshTokenPayload.self, from: data)
        keychainHelper.saveString(decoded.accessToken, for: KeychainHelper.Keys.accessToken)
        keychainHelper.saveString(decoded.refreshToken, for: KeychainHelper.Keys.refreshToken)
        return true
    }

    // MARK: - Response Validation

    /// - Parameter suppressToastFor429: When `true`, a 429 response does not show a
    ///   user-facing toast. Use for background-triggered requests (e.g., `/auth/refresh`)
    ///   where the user did not initiate the call.
    private func validateResponse(
        _ response: HTTPURLResponse,
        data: Data,
        suppressToastFor429: Bool = false
    ) throws {
        switch response.statusCode {
        case 200...299:
            return // Success
        case 401:
            // Handled during token refresh flow
            throw APIError.unauthorized
        case 403:
            // Check for structured plan_limit_exceeded response
            if let planError = extractPlanLimitError(from: data) {
                // Don't show generic toast — let the ViewModel handle it with a paywall
                throw planError
            }
            // Check for auth account-status codes emitted by backend since PR #538.
            // The `code` field is absent on older backend versions — handled defensively.
            if let authError = extractAuthCodeError(from: data) {
                showErrorToast(for: authError)
                throw authError
            }
            // Regular 403 — fall through to generic handling
            let message = extractErrorMessage(from: data)
            let err = APIError.serverError(
                statusCode: response.statusCode,
                message: message ?? "Request failed with status \(response.statusCode)"
            )
            showErrorToast(for: err)
            throw err
        case 404:
            let message = extractErrorMessage(from: data)
            let err = APIError.serverError(
                statusCode: response.statusCode,
                message: message ?? "Request failed with status \(response.statusCode)"
            )
            showErrorToast(for: err)
            throw err
        case 400...499:
            let message = extractErrorMessage(from: data)
            let err = APIError.serverError(
                statusCode: response.statusCode,
                message: message ?? "Request failed with status \(response.statusCode)"
            )
            // Suppress the toast when this is a background refresh-endpoint 429 — the user
            // did not trigger the request and the error is transient noise to them.
            if !(suppressToastFor429 && response.statusCode == 429) {
                showErrorToast(for: err)
            }
            throw err
        case 500...599:
            let message = extractErrorMessage(from: data)
            let err = APIError.serverError(
                statusCode: response.statusCode,
                message: message ?? "Error del servidor"
            )
            showErrorToast(for: err)
            throw err
        default:
            showErrorToast(for: .unknown)
            throw APIError.unknown
        }
    }

    /// Parse a 403 response body for `plan_limit_exceeded` structured error.
    /// Backend returns: `{ "error": "plan_limit_exceeded", "message": "...", "limit": { "type": "...", "current": N, "max": N } }`
    private func extractPlanLimitError(from data: Data) -> APIError? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let errorType = json["error"] as? String,
              errorType == "plan_limit_exceeded" else {
            return nil
        }
        let message = json["message"] as? String ?? "Has alcanzado el límite de tu plan."
        let limitObj = json["limit"] as? [String: Any]
        let limitType = limitObj?["type"] as? String ?? "unknown"
        let current = limitObj?["current"] as? Int ?? 0
        let max = limitObj?["max"] as? Int ?? 0
        return .planLimitExceeded(message: message, limitType: limitType, current: current, max: max)
    }

    /// Parse a 403 response body for `auth.account_blocked` / `auth.account_deleted` codes.
    /// Backend emits `{ "error": "<translated>", "code": "auth.account_blocked"|"auth.account_deleted" }`
    /// since the backend auth i18n error helpers (PR #538). The `code` field is optional
    /// and absent on older backend versions — returns nil when the field is missing.
    private func extractAuthCodeError(from data: Data) -> APIError? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let code = json["code"] as? String else {
            return nil
        }
        switch code {
        case "auth.account_blocked":
            return .accountBlocked
        case "auth.account_deleted":
            return .accountDeleted
        default:
            return nil
        }
    }

    private func showErrorToast(for error: APIError) {
        // Only show toasts for interesting errors that the user needs to see
        switch error {
        case .unauthorized:
            // Silently fail auth; let AuthManager redirect to login
            break
        default:
            let message = error.userFacingMessage
            Task { @MainActor [onError] in
                onError?(message)
            }
        }
    }

    /// Try to extract an error message from a JSON response body.
    private func extractErrorMessage(from data: Data) -> String? {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let message = json["error"] as? String ?? json["message"] as? String {
            return message
        }
        return nil
    }

    // MARK: - Multipart Body

    private func createMultipartBody(data: Data, filename: String, boundary: String) -> Data {
        var body = Data()

        let mimeType = filename.hasSuffix(".png") ? "image/png" : "image/jpeg"

        // Data(string.utf8) is non-failable — no force-unwrap risk.
        body.append(Data("--\(boundary)\r\n".utf8))
        body.append(Data("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".utf8))
        body.append(Data("Content-Type: \(mimeType)\r\n\r\n".utf8))
        body.append(data)
        body.append(Data("\r\n".utf8))
        body.append(Data("--\(boundary)--\r\n".utf8))

        return body
    }
}

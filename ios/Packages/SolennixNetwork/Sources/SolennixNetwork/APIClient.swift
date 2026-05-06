import Foundation
import SolennixCore

// MARK: - Upload Response

/// Response returned from the image upload endpoint.
public struct UploadResponse: Codable, Sendable {
    public let url: String
    public let thumbnailUrl: String?
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
            if case .networkError = apiError {
                showErrorToast(for: apiError)
            }
            throw apiError
        }
    }

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
        let pendingMutations = await offlineMutationQueue.dequeueAll()
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

                _ = try await perform(request, isRetry: false)
                index += 1
            } catch let apiError as APIError {
                switch apiError {
                case .serverError(let statusCode, _) where Self.shouldDropReplay(statusCode: statusCode):
                    // Permanent client-side error: drop this mutation and continue.
                    index += 1
                default:
                    await offlineMutationQueue.replace(with: Array(pendingMutations[index...]))
                    return
                }
            } catch {
                await offlineMutationQueue.replace(with: Array(pendingMutations[index...]))
                return
            }
        }
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

        // On 401 and not already a retry, attempt token refresh then retry once.
        // CRITICAL: skip this for the auth endpoints themselves — those are the routes
        // that ISSUE tokens, not consume them. A 401 there means "bad credentials" or
        // "no refresh token yet", not "expired token". Without this guard, the very
        // first login attempt triggers an infinite refresh loop and the request hangs
        // until the URLSession timeout fires.
        if httpResponse.statusCode == 401, !isRetry, !isAuthEndpoint(request.url) {
            let refreshed = await attemptRefresh()
            if refreshed {
                // Rebuild request with new token
                var retryRequest = request
                if let token = keychainHelper.readString(for: KeychainHelper.Keys.accessToken) {
                    retryRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                return try await perform(retryRequest, isRetry: true)
            }
        }

        try validateResponse(httpResponse, data: data)
        return data
    }

    /// Returns true if the URL targets an auth endpoint that issues tokens
    /// (login, register, refresh, OAuth providers, password reset). 401 on
    /// these routes must propagate as "invalid credentials", not trigger refresh.
    private nonisolated func isAuthEndpoint(_ url: URL?) -> Bool {
        guard let path = url?.path else { return false }
        let authPaths = [
            "/auth/login",
            "/auth/register",
            "/auth/refresh",
            "/auth/google",
            "/auth/apple",
            "/auth/forgot-password",
            "/auth/reset-password"
        ]
        return authPaths.contains { path.hasSuffix($0) }
    }

    // MARK: - Token Refresh

    /// Attempt to refresh the access token. Uses `refreshTask` to coalesce
    /// concurrent refresh attempts into a single network call.
    ///
    /// Because `APIClient` is an `actor`, synchronous code between suspension
    /// points is mutually exclusive. This guarantees that only one caller can
    /// see `refreshTask == nil` and create a new `Task`; all subsequent callers
    /// that enter while the refresh is in-flight will observe the existing task
    /// and await its result. `defer` ensures `refreshTask` is cleared even if
    /// the task is cancelled or throws.
    private func attemptRefresh() async -> Bool {
        // If a refresh is already in progress, coalesce by waiting for it
        if let existingTask = refreshTask {
            return (try? await existingTask.value) ?? false
        }

        // No suspension point between the nil-check above and the assignment
        // below, so the actor guarantees exclusive access here.
        let task = Task<Bool, Error> { [weak _authManager] in
            guard let authManager = _authManager else { return false }
            return (try? await authManager.refreshToken()) ?? false
        }

        refreshTask = task
        defer { refreshTask = nil }

        return (try? await task.value) ?? false
    }

    // MARK: - Response Validation

    private func validateResponse(_ response: HTTPURLResponse, data: Data) throws {
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
            showErrorToast(for: err)
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

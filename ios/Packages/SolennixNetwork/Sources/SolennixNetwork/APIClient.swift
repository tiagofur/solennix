import Foundation
import SolennixCore

// MARK: - Upload Response

/// Response returned from the image upload endpoint.
public struct UploadResponse: Codable, Sendable {
    public let url: String
    public let thumbnailUrl: String?

    enum CodingKeys: String, CodingKey {
        case url
        case thumbnailUrl = "thumbnail_url"
    }
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

    /// Reference to AuthManager for token refresh operations.
    /// Set after initialization to break the dependency cycle.
    private weak var _authManager: AuthManager?

    /// Task that guards concurrent refresh attempts — only one refresh runs at a time.
    private var refreshTask: Task<Bool, Error>?
    
    /// Callback invoked on the main actor when an API error should be shown to the user.
    /// The network layer delegates UI concerns (e.g., toasts) to the caller via this closure.
    private var onError: (@MainActor @Sendable (String) -> Void)?

    // MARK: - Init

    /// Creates a new API client.
    /// - Parameters:
    ///   - baseURL: The base URL of the API (e.g., `https://api.solennix.com`).
    ///   - keychainHelper: The keychain helper for reading auth tokens.
    public init(
        baseURL: URL = URL(string: "https://api.solennix.com")!,
        keychainHelper: KeychainHelper = .standard
    ) {
        self.baseURL = baseURL
        self.keychainHelper = keychainHelper

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase

        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
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
        request.httpBody = try encoder.encode(body)
        return try await execute(request)
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
        request.httpBody = try encoder.encode(body)
        return try await execute(request)
    }

    /// Perform a DELETE request.
    /// - Parameter endpoint: The API endpoint path.
    public func delete(_ endpoint: String) async throws {
        let request = try buildRequest(endpoint, method: "DELETE")
        let _: EmptyResponse = try await execute(request)
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

        // Attach Bearer token from Keychain
        if let token = keychainHelper.readString(for: KeychainHelper.Keys.accessToken) {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    // MARK: - Request Execution

    private func execute<T: Decodable>(
        _ request: URLRequest,
        isRetry: Bool = false
    ) async throws -> T {
        let data: Data
        do {
            data = try await perform(request, isRetry: isRetry)
        } catch let urlError as URLError {
            let err = APIError.networkError(urlError.localizedDescription)
            showErrorToast(for: err)
            throw err
        } catch {
            throw error
        }

        // Handle 204 No Content
        if data.isEmpty { // Assuming empty data for 204 No Content
            if let empty = EmptyResponse() as? T {
                return empty
            }
            throw APIError.decodingError
        }

        // Decode JSON response
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }

    // MARK: - Perform Request

    /// Executes the URLRequest, validates the HTTP response, and handles 401 retry via token refresh.
    private func perform(_ request: URLRequest, isRetry: Bool) async throws -> Data {
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        // On 401 and not already a retry, attempt token refresh then retry once
        if httpResponse.statusCode == 401, !isRetry {
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

    // MARK: - Token Refresh

    /// Attempt to refresh the access token. Uses `refreshTask` to coalesce
    /// concurrent refresh attempts into a single network call.
    private func attemptRefresh() async -> Bool {
        // If a refresh is already in progress, wait for it
        if let existingTask = refreshTask {
            return (try? await existingTask.value) ?? false
        }

        let task = Task<Bool, Error> { [weak _authManager] in
            guard let authManager = _authManager else { return false }
            return (try? await authManager.refreshToken()) ?? false
        }

        refreshTask = task

        let result = (try? await task.value) ?? false
        refreshTask = nil
        return result
    }

    // MARK: - Response Validation

    private func validateResponse(_ response: HTTPURLResponse, data: Data) throws {
        switch response.statusCode {
        case 200...299:
            return // Success
        case 401:
            // Handled during token refresh flow
            throw APIError.unauthorized
        case 403, 404:
            // Try to extract error message from response body
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

    private func showErrorToast(for error: APIError) {
        // Only show toasts for interesting errors that the user needs to see
        switch error {
        case .unauthorized:
            // Silently fail auth; let AuthManager redirect to login
            break
        default:
            let message = error.errorDescription ?? "Ocurrio un error desconocido."
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

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        return body
    }
}

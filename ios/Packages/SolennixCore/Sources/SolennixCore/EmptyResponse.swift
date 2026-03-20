import Foundation

/// Empty response struct for API endpoints that return 204 No Content.
public struct EmptyResponse: Codable, Sendable, Hashable {
    public init() {}
}

import Foundation

/// A photo attached to an event. Mirrors the backend `EventPhoto` served by
/// `GET /events/{id}/photos` and created by `POST /events/{id}/photos`.
///
/// Field naming relies on the APIClient's `convertFromSnakeCase` decoding, so
/// `thumbnail_url`/`created_at` map to `thumbnailUrl`/`createdAt` without
/// explicit CodingKeys (same convention as `EventProduct`, `UploadResponse`).
public struct EventPhoto: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let url: String
    public var thumbnailUrl: String?
    public var caption: String?
    public let createdAt: String

    public init(
        id: String,
        url: String,
        thumbnailUrl: String? = nil,
        caption: String? = nil,
        createdAt: String = ""
    ) {
        self.id = id
        self.url = url
        self.thumbnailUrl = thumbnailUrl
        self.caption = caption
        self.createdAt = createdAt
    }

    /// Best available preview URL — the thumbnail when the backend provided
    /// one, otherwise the full-resolution image.
    public var displayUrl: String {
        thumbnailUrl ?? url
    }
}

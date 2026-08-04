import Foundation

/// Submit mode for a shareable Solicitudes link (matches backend `SubmitMode`).
public enum RequestLinkSubmitMode: String, Codable, Sendable, CaseIterable, Hashable {
    case standard
    case autoQuote = "auto_quote"
    case autoEvent = "auto_event"
}

/// Organizer-generated shareable link for public quote requests.
/// Replaces the former `EventFormLink` primitive (`/event-forms` → `/organizers/me/request-links`).
public struct PublicRequestLink: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let organizerUserId: String?
    public let token: String
    public var label: String?
    public let status: String
    public let submitMode: String
    public var maxUses: Int?
    public let useCount: Int
    public var expiresAt: String?
    public var url: String?
    public let createdAt: String
    public let updatedAt: String

    public init(
        id: String,
        organizerUserId: String? = nil,
        token: String,
        label: String? = nil,
        status: String = "active",
        submitMode: String = RequestLinkSubmitMode.autoEvent.rawValue,
        maxUses: Int? = nil,
        useCount: Int = 0,
        expiresAt: String? = nil,
        url: String? = nil,
        createdAt: String,
        updatedAt: String
    ) {
        self.id = id
        self.organizerUserId = organizerUserId
        self.token = token
        self.label = label
        self.status = status
        self.submitMode = submitMode
        self.maxUses = maxUses
        self.useCount = useCount
        self.expiresAt = expiresAt
        self.url = url
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Absolute public visitor URL (`/s/{token}`) when server omitted `url`.
    public var shareURL: String {
        if let url, !url.isEmpty { return url }
        return "https://solennix.com/s/\(token)"
    }

    public var submitModeValue: RequestLinkSubmitMode {
        RequestLinkSubmitMode(rawValue: submitMode) ?? .autoEvent
    }
}

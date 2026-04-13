import Foundation

public struct EventFormLink: Codable, Identifiable, Sendable {
    public let id: String
    public let userId: String
    public let token: String
    public var label: String?
    public let status: String
    public var submittedEventId: String?
    public var submittedClientId: String?
    public let url: String
    public let expiresAt: String
    public var usedAt: String?
    public let createdAt: String
    public let updatedAt: String

    public init(id: String, userId: String, token: String, label: String? = nil,
                status: String, submittedEventId: String? = nil, submittedClientId: String? = nil,
                url: String, expiresAt: String, usedAt: String? = nil,
                createdAt: String, updatedAt: String) {
        self.id = id
        self.userId = userId
        self.token = token
        self.label = label
        self.status = status
        self.submittedEventId = submittedEventId
        self.submittedClientId = submittedClientId
        self.url = url
        self.expiresAt = expiresAt
        self.usedAt = usedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

import Foundation

public enum EventReviewVisibility: String, Codable, Sendable, Hashable, CaseIterable {
    case `private`
    case `public`
}

/// Post-event testimonial left by a client.
public struct EventReview: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let eventId: String
    public let userId: String
    public let clientId: String
    public let reviewRequestId: String?
    public let rating: Int
    public let comment: String?
    public let visibility: EventReviewVisibility
    public let organizerResponse: String?
    public let respondedAt: String?
    public let submittedAt: String
    public let createdAt: String
    public let updatedAt: String
    public let clientName: String?
    public let eventLabel: String?
    public let organizerName: String?
    public let publicSlug: String?
}

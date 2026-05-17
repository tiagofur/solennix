import Foundation

// MARK: - Team Member Assignment

public struct TeamMemberAssignment: Codable, Identifiable, Sendable, Hashable {
    public let eventStaffId: String
    public let eventId: String
    public let eventName: String
    public let eventDate: String
    public let staffId: String
    public let status: AssignmentStatus
    public let location: String?
    public let city: String?
    public let contactName: String?
    public let contactPhone: String?
    public let organizerNotes: String?
    public let feeAmount: Double?
    public let roleOverride: String?
    public let notes: String?
    public let shiftStart: String?
    public let shiftEnd: String?
    public let offerGroupId: String?
    public let offerSlots: Int?
    public let notificationLastResult: String?
    public let notificationSentAt: String?

    public var id: String { eventStaffId }
}

public struct AssignmentResponseOutcome: Codable, Sendable, Hashable {
    public let eventStaffId: String
    public let finalStatus: AssignmentStatus
    public let seatsRemaining: Int
    public let autoDeclinedCount: Int
}

public struct TeamMemberChangeEvent: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let eventId: String
    public let eventStaffId: String
    public let eventName: String
    public let eventDate: String
    public let changeType: String
    public let fieldName: String
    public let oldValue: String?
    public let newValue: String?
    public let occurredAt: String
    public let readAt: String?
}

public struct TeamTimelineMarkReadResponse: Codable, Sendable, Hashable {
    public let updated: Int
}

public enum AssignmentPortalResponse: String, Codable, Sendable {
    case accept
    case decline
}

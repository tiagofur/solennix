import Foundation

// MARK: - Team Member Assignment

public struct TeamMemberAssignment: Codable, Identifiable, Sendable, Hashable {
    public let eventStaffId: String
    public let eventId: String
    public let eventName: String
    public let eventDate: String
    public let staffId: String
    public let status: AssignmentStatus
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

public enum AssignmentPortalResponse: String, Codable, Sendable {
    case accept
    case decline
}

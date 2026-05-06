import Foundation

/// Represents a client's transfer payment submission from the public portal.
/// Organizers review and approve (creating a Payment row) or reject with notes.
public struct PaymentSubmission: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let eventId: String
    public let clientId: String
    public let userId: String
    public let amount: Double
    public let transferRef: String?
    public let receiptFileUrl: String?
    public let status: PaymentSubmissionStatus
    public let submittedAt: String
    public let reviewedBy: String?
    public let reviewedAt: String?
    public let rejectionReason: String?
    public let linkedPaymentId: String?
    public let createdAt: String
    public let updatedAt: String
    public let clientName: String?
    public let eventLabel: String?
}

public enum PaymentSubmissionStatus: String, Codable, Sendable, Hashable {
    case pending
    case approved
    case rejected
}

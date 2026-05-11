import Foundation

// MARK: - Staff Invite (Phase 3 Foundation)

/// Response payload returned by `POST /api/staff/{id}/invite`.
public struct StaffInviteResponse: Codable, Sendable, Hashable {
    public let inviteId: String
    public let staffId: String
    public let email: String
    public let status: String
    public let acceptUrl: String
    public let expiresAt: String
    public let createdAt: String

    public init(
        inviteId: String,
        staffId: String,
        email: String,
        status: String,
        acceptUrl: String,
        expiresAt: String,
        createdAt: String
    ) {
        self.inviteId = inviteId
        self.staffId = staffId
        self.email = email
        self.status = status
        self.acceptUrl = acceptUrl
        self.expiresAt = expiresAt
        self.createdAt = createdAt
    }
}

import Foundation
import SolennixCore

// MARK: - Staff Invites (Phase 3 Foundation)

public extension APIClient {
    /// Creates or rotates a pending team-member invite for the given staff member.
    func inviteStaffUser(staffId: String) async throws -> StaffInviteResponse {
        struct EmptyBody: Encodable {}
        return try await post(Endpoint.staffInvite(staffId), body: EmptyBody())
    }

    /// Revokes the active pending invite for the given staff member.
    func revokeStaffInvite(staffId: String) async throws {
        try await delete(Endpoint.staffInvite(staffId))
    }
}

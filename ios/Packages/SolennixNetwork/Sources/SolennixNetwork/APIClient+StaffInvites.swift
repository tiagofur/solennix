import Foundation
import SolennixCore

// MARK: - Staff Invites (Phase 3 Foundation)

public extension APIClient {
    /// Creates or rotates a pending team-member invite for the given staff member.
    func inviteStaffUser(staffId: String) async throws -> StaffInviteResponse {
        struct EmptyBody: Encodable {}
        return try await post(Endpoint.staffInvite(staffId), body: EmptyBody())
    }
}

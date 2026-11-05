import Foundation
import SolennixCore

// MARK: - Staff Invites (Phase 3 Foundation)

public extension APIClient {
    /// Creates or rotates a pending invite for the given staff member.
    ///
    /// - Parameter targetRole: access role for the invite. `.assistant`
    ///   (Secretario) requires a Business plan — enforced server-side.
    ///   Defaults to `.teamMember`, preserving the historical behavior.
    func inviteStaffUser(
        staffId: String,
        targetRole: StaffInviteTargetRole = .teamMember
    ) async throws -> StaffInviteResponse {
        struct InviteBody: Encodable {
            let targetRole: StaffInviteTargetRole
        }
        return try await post(Endpoint.staffInvite(staffId), body: InviteBody(targetRole: targetRole))
    }

    /// Revokes the active pending invite for the given staff member.
    func revokeStaffInvite(staffId: String) async throws {
        try await delete(Endpoint.staffInvite(staffId))
    }
}

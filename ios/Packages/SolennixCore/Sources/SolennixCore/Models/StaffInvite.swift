import Foundation

// MARK: - Staff Invite Target Role

/// Rol de acceso que recibe el colaborador invitado.
///
/// - `teamMember` (Miembro): ve solo su propia jornada en el portal.
/// - `assistant` (Secretario): portal de solo lectura con agenda, dotación
///   por evento y directorio de personal. Solo planes Business (el backend
///   lo exige con `staff.assistant_plan_required`).
public enum StaffInviteTargetRole: String, Codable, Sendable, Hashable, CaseIterable {
    case teamMember = "team_member"
    case assistant
}

// MARK: - Staff Invite (Phase 3 Foundation)

/// Response payload returned by `POST /api/staff/{id}/invite`.
public struct StaffInviteResponse: Codable, Sendable, Hashable {
    public let inviteId: String
    public let staffId: String
    public let email: String
    public let targetRole: StaffInviteTargetRole
    public let status: String
    public let acceptUrl: String
    public let expiresAt: String
    public let createdAt: String

    public init(
        inviteId: String,
        staffId: String,
        email: String,
        targetRole: StaffInviteTargetRole = .teamMember,
        status: String,
        acceptUrl: String,
        expiresAt: String,
        createdAt: String
    ) {
        self.inviteId = inviteId
        self.staffId = staffId
        self.email = email
        self.targetRole = targetRole
        self.status = status
        self.acceptUrl = acceptUrl
        self.expiresAt = expiresAt
        self.createdAt = createdAt
    }

    private enum CodingKeys: String, CodingKey {
        case inviteId
        case staffId
        case email
        case targetRole
        case status
        case acceptUrl
        case expiresAt
        case createdAt
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        inviteId = try container.decode(String.self, forKey: .inviteId)
        staffId = try container.decode(String.self, forKey: .staffId)
        email = try container.decode(String.self, forKey: .email)
        // `target_role` es nuevo en el backend: payloads viejos (y mocks) no
        // lo traen, y el default histórico es `team_member`.
        targetRole = try container.decodeIfPresent(StaffInviteTargetRole.self, forKey: .targetRole) ?? .teamMember
        status = try container.decode(String.self, forKey: .status)
        acceptUrl = try container.decode(String.self, forKey: .acceptUrl)
        expiresAt = try container.decode(String.self, forKey: .expiresAt)
        createdAt = try container.decode(String.self, forKey: .createdAt)
    }
}

import Foundation
import SolennixCore

// MARK: - Staff Teams

/// Payload helpers para crear/actualizar cuadrillas. El backend espera
/// `members[]` como array de `{ staff_id, is_lead, position }` — el resto
/// de campos joineados (staff_name, staff_phone, etc.) se ignoran en el
/// write path.
public struct StaffTeamMemberPayload: Codable, Sendable, Hashable {
    public let staffId: String
    public let isLead: Bool
    public let position: Int

    public init(staffId: String, isLead: Bool = false, position: Int = 0) {
        self.staffId = staffId
        self.isLead = isLead
        self.position = position
    }
}

public struct StaffTeamPayload: Codable, Sendable {
    public let name: String
    public let roleLabel: String?
    public let notes: String?
    public let members: [StaffTeamMemberPayload]

    public init(
        name: String,
        roleLabel: String? = nil,
        notes: String? = nil,
        members: [StaffTeamMemberPayload] = []
    ) {
        self.name = name
        self.roleLabel = roleLabel
        self.notes = notes
        self.members = members
    }
}

public extension APIClient {

    /// Listado liviano — trae `memberCount` pero NO `members[]`.
    func listStaffTeams() async throws -> [StaffTeam] {
        try await getAll(Endpoint.staffTeams)
    }

    /// Detalle completo — trae `members[]` con staff joineado.
    func getStaffTeam(id: String) async throws -> StaffTeam {
        try await get(Endpoint.staffTeam(id))
    }

    func createStaffTeam(_ payload: StaffTeamPayload) async throws -> StaffTeam {
        try await post(Endpoint.staffTeams, body: payload)
    }

    /// Reemplaza meta + members atomicamente. El backend espera el id en la
    /// URL — el payload solo lleva los campos editables.
    func updateStaffTeam(id: String, payload: StaffTeamPayload) async throws -> StaffTeam {
        try await put(Endpoint.staffTeam(id), body: payload)
    }

    func deleteStaffTeam(id: String) async throws {
        try await delete(Endpoint.staffTeam(id))
    }
}

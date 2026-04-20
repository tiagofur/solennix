import Foundation

// MARK: - Staff Team (Cuadrilla / Equipo)

/// Grupo nombrado de colaboradores (meseros, fotografos, DJs...) que el
/// organizador puede asignar a un evento de un solo toque.
/// El backend devuelve `members` solo en GET/POST/PUT por ID y
/// `memberCount` solo en el listado — por eso ambos son opcionales.
public struct StaffTeam: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public var name: String
    public var roleLabel: String?
    public var notes: String?
    public let createdAt: String
    public let updatedAt: String
    public var members: [StaffTeamMember]?
    public var memberCount: Int?

    public init(
        id: String,
        userId: String,
        name: String,
        roleLabel: String? = nil,
        notes: String? = nil,
        createdAt: String,
        updatedAt: String,
        members: [StaffTeamMember]? = nil,
        memberCount: Int? = nil
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.roleLabel = roleLabel
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.members = members
        self.memberCount = memberCount
    }
}

// MARK: - Staff Team Member

/// Relacion team <-> staff. Los campos `staff*` vienen joineados por el
/// backend — se llenan en el GET por ID pero pueden ser nil si el staff
/// fue borrado despues de crear el team.
public struct StaffTeamMember: Codable, Sendable, Hashable, Identifiable {
    public let teamId: String
    public let staffId: String
    public var isLead: Bool
    public var position: Int
    public let createdAt: String
    public var staffName: String?
    public var staffRoleLabel: String?
    public var staffPhone: String?
    public var staffEmail: String?

    public var id: String { "\(teamId):\(staffId)" }

    public init(
        teamId: String,
        staffId: String,
        isLead: Bool = false,
        position: Int = 0,
        createdAt: String = "",
        staffName: String? = nil,
        staffRoleLabel: String? = nil,
        staffPhone: String? = nil,
        staffEmail: String? = nil
    ) {
        self.teamId = teamId
        self.staffId = staffId
        self.isLead = isLead
        self.position = position
        self.createdAt = createdAt
        self.staffName = staffName
        self.staffRoleLabel = staffRoleLabel
        self.staffPhone = staffPhone
        self.staffEmail = staffEmail
    }
}

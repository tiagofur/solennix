import Foundation

// MARK: - Staff (Personal / Colaboradores)

/// Un colaborador registrado en la libreta de personal del organizador.
/// Se asigna a uno o mas eventos via `EventStaff`. Phase 1 no tiene gating
/// por plan — todos los planes pueden crear/editar/eliminar staff.
public struct Staff: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public var name: String
    public var roleLabel: String?
    public var phone: String?
    public var email: String?
    public var notes: String?
    /// Si esta en `true`, al asignar al staff a un evento se enviara un email
    /// de aviso. La logica real de envio vive en Phase 2 (Pro+).
    public var notificationEmailOptIn: Bool
    /// Hook Phase 3 — poblado cuando el organizer invita al colaborador a
    /// registrarse (solo tier Business). Phase 1 siempre es `nil`.
    public var invitedUserId: String?
    /// Estado de la invitación activa cuando existe (`pending`, `accepted`,
    /// `revoked`, `expired`).
    public var inviteStatus: String?
    public let createdAt: String
    public let updatedAt: String

    // MARK: - Init

    public init(
        id: String,
        userId: String,
        name: String,
        roleLabel: String? = nil,
        phone: String? = nil,
        email: String? = nil,
        notes: String? = nil,
        notificationEmailOptIn: Bool = false,
        invitedUserId: String? = nil,
        inviteStatus: String? = nil,
        createdAt: String,
        updatedAt: String
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.roleLabel = roleLabel
        self.phone = phone
        self.email = email
        self.notes = notes
        self.notificationEmailOptIn = notificationEmailOptIn
        self.invitedUserId = invitedUserId
        self.inviteStatus = inviteStatus
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

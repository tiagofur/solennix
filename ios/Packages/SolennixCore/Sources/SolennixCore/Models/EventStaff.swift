import Foundation

// MARK: - Assignment Status

/// Status del ciclo de vida de una asignacion de staff a un evento.
/// Los valores son los mismos del backend: pending | confirmed | declined | cancelled.
public enum AssignmentStatus: String, Codable, Sendable, CaseIterable {
    case pending
    case confirmed
    case declined
    case cancelled
}

// MARK: - Event Staff (asignacion de personal a evento)

/// Asignacion de un `Staff` a un evento. El costo (`feeAmount`) vive en la
/// asignacion — NO en el Staff — porque el mismo colaborador puede cobrar
/// distintas tarifas en distintos eventos.
public struct EventStaff: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let eventId: String
    public let staffId: String
    public var feeAmount: Double?
    public var roleOverride: String?
    public var notes: String?
    public var notificationSentAt: String?
    public var notificationLastResult: String?
    public let createdAt: String

    // MARK: - Ola 1 (turnos + estado)

    /// Inicio del turno en ISO8601 UTC. Puede cruzar medianoche.
    public var shiftStart: String?
    /// Fin del turno en ISO8601 UTC.
    public var shiftEnd: String?
    /// Raw status string. Nulo en payloads de upsert (preserva existente).
    /// En reads siempre viene con uno de los 4 valores; usar `assignmentStatus`
    /// para acceso tipado con fallback a `.confirmed`.
    public var status: String?

    // MARK: - Joined (staff_*)

    public var staffName: String?
    public var staffRoleLabel: String?
    public var staffPhone: String?
    public var staffEmail: String?

    /// Helper tipado. Si el raw es nil o invalido, cae a `.confirmed`
    /// (default historico del backend).
    public var assignmentStatus: AssignmentStatus {
        AssignmentStatus(rawValue: status ?? "confirmed") ?? .confirmed
    }

    // MARK: - Init

    public init(
        id: String,
        eventId: String,
        staffId: String,
        feeAmount: Double? = nil,
        roleOverride: String? = nil,
        notes: String? = nil,
        notificationSentAt: String? = nil,
        notificationLastResult: String? = nil,
        createdAt: String,
        shiftStart: String? = nil,
        shiftEnd: String? = nil,
        status: String? = nil,
        staffName: String? = nil,
        staffRoleLabel: String? = nil,
        staffPhone: String? = nil,
        staffEmail: String? = nil
    ) {
        self.id = id
        self.eventId = eventId
        self.staffId = staffId
        self.feeAmount = feeAmount
        self.roleOverride = roleOverride
        self.notes = notes
        self.notificationSentAt = notificationSentAt
        self.notificationLastResult = notificationLastResult
        self.createdAt = createdAt
        self.shiftStart = shiftStart
        self.shiftEnd = shiftEnd
        self.status = status
        self.staffName = staffName
        self.staffRoleLabel = staffRoleLabel
        self.staffPhone = staffPhone
        self.staffEmail = staffEmail
    }
}

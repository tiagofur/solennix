import Foundation

// MARK: - Staff Availability Assignment

/// Una asignacion dentro del reporte de disponibilidad.
/// `eventDate` llega como YYYY-MM-DD (sin hora); los turnos son opcionales y
/// llegan en ISO8601 UTC cuando se capturaron.
public struct StaffAvailabilityAssignment: Codable, Sendable, Hashable {
    public let eventId: String
    public let eventName: String
    public let eventDate: String
    public let shiftStart: String?
    public let shiftEnd: String?
    public let status: String

    public init(
        eventId: String,
        eventName: String,
        eventDate: String,
        shiftStart: String? = nil,
        shiftEnd: String? = nil,
        status: String
    ) {
        self.eventId = eventId
        self.eventName = eventName
        self.eventDate = eventDate
        self.shiftStart = shiftStart
        self.shiftEnd = shiftEnd
        self.status = status
    }
}

// MARK: - Staff Availability

/// Disponibilidad agregada por staff. Solo incluye colaboradores con
/// asignaciones en la ventana consultada; lista vacia = todos libres.
public struct StaffAvailability: Codable, Identifiable, Sendable, Hashable {
    public let staffId: String
    public let staffName: String
    public let assignments: [StaffAvailabilityAssignment]

    public var id: String { staffId }

    public init(
        staffId: String,
        staffName: String,
        assignments: [StaffAvailabilityAssignment]
    ) {
        self.staffId = staffId
        self.staffName = staffName
        self.assignments = assignments
    }
}

#if canImport(ActivityKit)
import ActivityKit
import Foundation

// MARK: - Atributos de Live Activity para Eventos

/// Define los datos estaticos y dinamicos para la Live Activity de un evento.
///
/// Los atributos estaticos (nombre del cliente, tipo de evento, etc.) se fijan
/// al iniciar la actividad. El `ContentState` contiene datos dinamicos que se
/// actualizan en tiempo real (estado, tiempo transcurrido, etc.).
public struct SolennixEventAttributes: ActivityAttributes {

    // MARK: - Datos Estaticos

    /// Nombre del cliente asociado al evento.
    public let clientName: String

    /// Tipo de servicio del evento (ej. "Banquete", "Coffee Break").
    public let eventType: String

    /// Ubicacion del evento.
    public let location: String

    /// Numero de invitados / personas.
    public let guestCount: Int

    public init(clientName: String, eventType: String, location: String, guestCount: Int) {
        self.clientName = clientName
        self.eventType = eventType
        self.location = location
        self.guestCount = guestCount
    }

    // MARK: - Estado Dinamico

    public struct ContentState: Codable, Hashable {
        /// Estado actual del evento: "setup", "in_progress", "completed".
        public let status: String

        /// Hora de inicio del evento.
        public let startTime: Date

        /// Minutos transcurridos desde el inicio.
        public let elapsedMinutes: Int

        /// Etiqueta localizada del estado: "Preparando", "En curso", "Finalizado".
        public let statusLabel: String

        public init(status: String, startTime: Date, elapsedMinutes: Int, statusLabel: String) {
            self.status = status
            self.startTime = startTime
            self.elapsedMinutes = elapsedMinutes
            self.statusLabel = statusLabel
        }
    }
}
#endif

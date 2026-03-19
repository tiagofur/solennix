import ActivityKit
import Foundation

// MARK: - Atributos de Live Activity para Eventos

/// Define los datos estáticos y dinámicos para la Live Activity de un evento.
///
/// Los atributos estáticos (nombre del cliente, tipo de evento, etc.) se fijan
/// al iniciar la actividad. El `ContentState` contiene datos dinámicos que se
/// actualizan en tiempo real (estado, tiempo transcurrido, etc.).
struct SolennixEventAttributes: ActivityAttributes {

    // MARK: - Datos Estáticos

    /// Nombre del cliente asociado al evento.
    let clientName: String

    /// Tipo de servicio del evento (ej. "Banquete", "Coffee Break").
    let eventType: String

    /// Ubicación del evento.
    let location: String

    /// Número de invitados / personas.
    let guestCount: Int

    // MARK: - Estado Dinámico

    struct ContentState: Codable, Hashable {
        /// Estado actual del evento: "setup", "in_progress", "completed".
        let status: String

        /// Hora de inicio del evento.
        let startTime: Date

        /// Minutos transcurridos desde el inicio.
        let elapsedMinutes: Int

        /// Etiqueta localizada del estado: "Preparando", "En curso", "Finalizado".
        let statusLabel: String
    }
}

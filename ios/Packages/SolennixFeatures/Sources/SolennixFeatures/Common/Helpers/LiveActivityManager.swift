#if canImport(ActivityKit)
import ActivityKit
import Foundation
import SolennixCore
import SolennixNetwork

// MARK: - Live Activity Manager

/// Gestiona el ciclo de vida de las Live Activities para eventos.
///
/// Permite iniciar, actualizar y finalizar actividades en vivo que muestran
/// el progreso de un evento en la pantalla de bloqueo y la Dynamic Island.
///
/// Uso típico:
/// ```swift
/// LiveActivityManager.shared.startEventActivity(event: event, client: client)
/// LiveActivityManager.shared.updateEventActivity(eventId: id, status: "in_progress")
/// LiveActivityManager.shared.endEventActivity(eventId: id)
/// ```
@MainActor
public final class LiveActivityManager {

    // MARK: - Singleton

    public static let shared = LiveActivityManager()

    // MARK: - Propiedades

    /// Almacena las referencias a actividades activas, indexadas por eventId.
    private var activeActivities: [String: String] = [:] // eventId -> activityId

    /// API client para comunicarse con el backend (push token registration).
    /// Inyectado por la app target en el arranque vía `configure(apiClient:)`.
    private var apiClient: APIClient?

    /// Tasks de captura de push tokens, indexadas por eventId. Permiten cancelar
    /// el observer cuando la activity termina.
    private var tokenObservers: [String: Task<Void, Never>] = [:]

    // MARK: - Init

    private init() {}

    /// Inyecta el APIClient compartido. Llamar una sola vez desde la app target.
    public func configure(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Verificación de Disponibilidad

    /// Indica si las Live Activities están habilitadas en el dispositivo.
    public var areActivitiesEnabled: Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // MARK: - Iniciar Actividad

    /// Inicia una Live Activity para un evento.
    ///
    /// - Parameters:
    ///   - event: El evento para el cual crear la actividad.
    ///   - client: El cliente asociado al evento.
    /// - Returns: `true` si la actividad se inició correctamente.
    @discardableResult
    public func startEventActivity(event: Event, client: Client) -> Bool {
        guard areActivitiesEnabled else {
            print("[LiveActivityManager] Las Live Activities no están habilitadas")
            return false
        }

        // Verificar que no exista ya una actividad para este evento
        guard activeActivities[event.id] == nil else {
            print("[LiveActivityManager] Ya existe una actividad para el evento \(event.id)")
            return false
        }

        let attributes = SolennixEventAttributes(
            clientName: client.name,
            eventType: event.serviceType,
            location: event.location ?? event.city ?? "Sin ubicación",
            guestCount: event.numPeople
        )

        let initialState = SolennixEventAttributes.ContentState(
            status: "setup",
            startTime: Date(),
            elapsedMinutes: 0,
            statusLabel: "Preparando"
        )

        let content = ActivityContent(state: initialState, staleDate: nil)

        do {
            // pushType: .token habilita push-to-update remoto desde el backend.
            let activity = try Activity.request(
                attributes: attributes,
                content: content,
                pushType: .token
            )

            activeActivities[event.id] = activity.id
            observePushToken(for: activity, eventId: event.id)
            print("[LiveActivityManager] Actividad iniciada para evento \(event.id): \(activity.id)")
            return true
        } catch {
            print("[LiveActivityManager] Error al iniciar actividad: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - Push Token Observer

    /// Observa los push token updates de una activity y los envía al backend
    /// para que pueda enviar updates remotos via APNs (`apns-push-type: liveactivity`).
    /// También observa el state stream para detectar dismissal y limpiar el token.
    private func observePushToken(for activity: Activity<SolennixEventAttributes>, eventId: String) {
        tokenObservers[eventId]?.cancel()

        nonisolated(unsafe) let capturedActivity = activity
        let task = Task { [weak self] in
            // Stream paralelo: tokens y estado.
            await withTaskGroup(of: Void.self) { group in
                group.addTask { @MainActor [weak self] in
                    for await tokenData in capturedActivity.pushTokenUpdates {
                        let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()
                        await self?.sendTokenToBackend(eventId: eventId, pushToken: tokenString)
                    }
                }
                group.addTask { @MainActor [weak self] in
                    for await state in capturedActivity.activityStateUpdates {
                        if state == .dismissed || state == .ended {
                            await self?.cleanupBackendTokens(eventId: eventId)
                            return
                        }
                    }
                }
            }
        }
        tokenObservers[eventId] = task
    }

    private func sendTokenToBackend(eventId: String, pushToken: String) async {
        guard let apiClient else {
            print("[LiveActivityManager] APIClient no configurado, no se envía token")
            return
        }
        let body: [String: String] = [
            "event_id": eventId,
            "push_token": pushToken
        ]
        do {
            let _: EmptyResponse = try await apiClient.post(
                Endpoint.registerLiveActivityToken,
                body: AnyCodable(body)
            )
            print("[LiveActivityManager] Push token registrado para evento \(eventId)")
        } catch {
            print("[LiveActivityManager] Error registrando push token: \(error.localizedDescription)")
        }
    }

    private func cleanupBackendTokens(eventId: String) async {
        tokenObservers[eventId]?.cancel()
        tokenObservers.removeValue(forKey: eventId)

        guard let apiClient else { return }
        do {
            try await apiClient.delete(Endpoint.liveActivityByEvent(eventId))
            print("[LiveActivityManager] Tokens limpiados en backend para evento \(eventId)")
        } catch {
            print("[LiveActivityManager] Error limpiando tokens: \(error.localizedDescription)")
        }
    }

    // MARK: - Actualizar Actividad

    /// Actualiza el estado de una Live Activity existente.
    ///
    /// - Parameters:
    ///   - eventId: El ID del evento cuya actividad se actualizará.
    ///   - status: El nuevo estado ("setup", "in_progress", "completed").
    public func updateEventActivity(eventId: String, status: String) async {
        guard let activityId = activeActivities[eventId] else {
            print("[LiveActivityManager] No se encontró actividad para evento \(eventId)")
            return
        }

        // Buscar la actividad activa por ID
        guard let foundActivity = Activity<SolennixEventAttributes>.activities.first(where: { $0.id == activityId }) else {
            print("[LiveActivityManager] Actividad \(activityId) no encontrada en el sistema")
            activeActivities.removeValue(forKey: eventId)
            return
        }
        nonisolated(unsafe) let activity = foundActivity

        let statusLabel: String
        switch status {
        case "setup":       statusLabel = "Preparando"
        case "in_progress": statusLabel = "En curso"
        case "completed":   statusLabel = "Finalizado"
        default:            statusLabel = status.capitalized
        }

        // Calcular minutos transcurridos desde el inicio
        let startTime = activity.content.state.startTime
        let elapsed = Int(Date().timeIntervalSince(startTime) / 60)

        let updatedState = SolennixEventAttributes.ContentState(
            status: status,
            startTime: startTime,
            elapsedMinutes: elapsed,
            statusLabel: statusLabel
        )

        let updatedContent = ActivityContent(state: updatedState, staleDate: nil)

        await activity.update(updatedContent)
        print("[LiveActivityManager] Actividad actualizada para evento \(eventId): \(status)")
    }

    // MARK: - Finalizar Actividad

    /// Finaliza la Live Activity de un evento.
    ///
    /// - Parameter eventId: El ID del evento cuya actividad se finalizará.
    public func endEventActivity(eventId: String) async {
        guard let activityId = activeActivities[eventId] else {
            print("[LiveActivityManager] No se encontró actividad para finalizar: \(eventId)")
            return
        }

        guard let foundActivity = Activity<SolennixEventAttributes>.activities.first(where: { $0.id == activityId }) else {
            activeActivities.removeValue(forKey: eventId)
            return
        }
        nonisolated(unsafe) let activity = foundActivity

        // Estado final
        let startTime = activity.content.state.startTime
        let elapsed = Int(Date().timeIntervalSince(startTime) / 60)

        let finalState = SolennixEventAttributes.ContentState(
            status: "completed",
            startTime: startTime,
            elapsedMinutes: elapsed,
            statusLabel: "Finalizado"
        )

        let finalContent = ActivityContent(state: finalState, staleDate: nil)

        await activity.end(finalContent, dismissalPolicy: .after(.now + 60 * 5))
        activeActivities.removeValue(forKey: eventId)
        await cleanupBackendTokens(eventId: eventId)
        print("[LiveActivityManager] Actividad finalizada para evento \(eventId)")
    }

    // MARK: - Finalizar Todas las Actividades

    /// Finaliza todas las Live Activities activas. Útil para limpieza al cerrar sesión.
    public func endAllActivities() async {
        let eventIds = Array(activeActivities.keys)
        for activity in Activity<SolennixEventAttributes>.activities {
            let finalState = SolennixEventAttributes.ContentState(
                status: "completed",
                startTime: activity.content.state.startTime,
                elapsedMinutes: Int(Date().timeIntervalSince(activity.content.state.startTime) / 60),
                statusLabel: "Finalizado"
            )
            let finalContent = ActivityContent(state: finalState, staleDate: nil)
            await activity.end(finalContent, dismissalPolicy: .immediate)
        }

        for eventId in eventIds {
            await cleanupBackendTokens(eventId: eventId)
        }
        activeActivities.removeAll()
        print("[LiveActivityManager] Todas las actividades finalizadas")
    }

    // MARK: - Consultas

    /// Indica si hay una Live Activity activa para un evento específico.
    /// - Parameter eventId: El ID del evento.
    /// - Returns: `true` si existe una actividad activa.
    public func hasActiveActivity(for eventId: String) -> Bool {
        guard let activityId = activeActivities[eventId] else { return false }
        return Activity<SolennixEventAttributes>.activities.contains { $0.id == activityId }
    }
}
#endif

import Foundation
import Observation
import SolennixCore
import SolennixNetwork

@Observable
public final class TeamMemberPortalViewModel {

    public var assignments: [TeamMemberAssignment] = []
    public var timeline: [TeamMemberChangeEvent] = []
    public var unavailableDates: [UnavailableDate] = []
    public var isLoading: Bool = false
    public var isResponding: Bool = false
    public var isMarkingTimelineRead: Bool = false
    public var isSavingAvailability: Bool = false
    public var errorMessage: String?

    /// Cache en memoria del execution state por assignment, para que el
    /// detail sheet lo edite sin re-fetchear en cada toggle (#875).
    public var executionStates: [String: AssignmentExecutionState] = [:]

    private let apiClient: APIClient

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    @MainActor
    public func loadAssignments() async {
        isLoading = true
        errorMessage = nil

        do {
            assignments = try await apiClient.getMyAssignments()
            timeline = try await apiClient.getMyTimeline(unreadOnly: false, limit: 8)
            let bounds = availabilityBounds()
            unavailableDates = try await apiClient.getMyUnavailableDates(start: bounds.start, end: bounds.end)
        } catch {
            errorMessage = "No pudimos cargar tus asignaciones."
        }

        isLoading = false
    }

    @MainActor
    public func respond(to assignment: TeamMemberAssignment, response: AssignmentPortalResponse) async {
        guard !isResponding else { return }
        isResponding = true
        errorMessage = nil

        do {
            _ = try await apiClient.respondAssignment(eventStaffId: assignment.id, response: response)
            assignments = try await apiClient.getMyAssignments()
            timeline = try await apiClient.getMyTimeline(unreadOnly: false, limit: 8)
        } catch {
            errorMessage = "No pudimos actualizar tu respuesta."
        }

        isResponding = false
    }

    @MainActor
    public func markTimelineRead(id: String) async {
        guard !isMarkingTimelineRead else { return }
        isMarkingTimelineRead = true
        defer { isMarkingTimelineRead = false }

        do {
            _ = try await apiClient.markMyTimelineRead(ids: [id])
            timeline = try await apiClient.getMyTimeline(unreadOnly: false, limit: 8)
        } catch {
            errorMessage = "No pudimos actualizar el estado de lectura."
        }
    }

    @MainActor
    public func createUnavailableDate(
        startDate: String,
        endDate: String,
        startTime: String?,
        endTime: String?,
        reason: String?
    ) async {
        guard !isSavingAvailability else { return }
        isSavingAvailability = true
        defer { isSavingAvailability = false }

        do {
            _ = try await apiClient.createMyUnavailableDate(
                startDate: startDate,
                endDate: endDate,
                startTime: startTime,
                endTime: endTime,
                reason: reason
            )
            let bounds = availabilityBounds()
            unavailableDates = try await apiClient.getMyUnavailableDates(start: bounds.start, end: bounds.end)
        } catch {
            errorMessage = "No pudimos bloquear fechas."
        }
    }

    @MainActor
    public func updateUnavailableDate(
        id: String,
        startDate: String,
        endDate: String,
        startTime: String?,
        endTime: String?,
        reason: String?
    ) async {
        guard !isSavingAvailability else { return }
        isSavingAvailability = true
        defer { isSavingAvailability = false }

        do {
            _ = try await apiClient.updateMyUnavailableDate(
                id: id,
                startDate: startDate,
                endDate: endDate,
                startTime: startTime,
                endTime: endTime,
                reason: reason
            )
            let bounds = availabilityBounds()
            unavailableDates = try await apiClient.getMyUnavailableDates(start: bounds.start, end: bounds.end)
        } catch {
            errorMessage = "No pudimos actualizar el bloqueo."
        }
    }

    @MainActor
    public func deleteUnavailableDate(id: String) async {
        guard !isSavingAvailability else { return }
        isSavingAvailability = true
        defer { isSavingAvailability = false }

        do {
            try await apiClient.deleteMyUnavailableDate(id: id)
            unavailableDates.removeAll { $0.id == id }
        } catch {
            errorMessage = "No pudimos eliminar el bloqueo."
        }
    }

    // MARK: - Execution State (#875)

    /// Carga el execution state del server al abrir el detail sheet. Si el
    /// usuario tenía estado legacy en UserDefaults, lo migra al server y lo
    /// borra localmente (una sola vez).
    @MainActor
    public func loadExecutionState(for assignment: TeamMemberAssignment) async {
        // Legacy migration: si existe el viejo key de UserDefaults, push al server.
        let legacyKey = "team_event_detail_\(assignment.eventId)"
        if let legacyData = UserDefaults.standard.data(forKey: legacyKey),
           let legacy = try? JSONDecoder().decode(LegacyExecutionState.self, from: legacyData) {
            let migrated = AssignmentExecutionState(
                checklist: ExecutionChecklist(
                    arrival: legacy.arrivalReady,
                    materials: legacy.materialsReady,
                    closing: legacy.closingDone
                ),
                quickNote: legacy.quickNote
            )
            executionStates[assignment.eventStaffId] = migrated
            UserDefaults.standard.removeObject(forKey: legacyKey)
            await saveExecutionState(for: assignment, state: migrated)
            return
        }

        if executionStates[assignment.eventStaffId] != nil { return }
        do {
            executionStates[assignment.eventStaffId] = try await apiClient.getExecutionState(eventStaffId: assignment.eventStaffId)
        } catch {
            executionStates[assignment.eventStaffId] = .defaultState
        }
    }

    /// Guarda el execution state en el server (fire-and-forget optimistic).
    @MainActor
    public func saveExecutionState(for assignment: TeamMemberAssignment, state: AssignmentExecutionState) async {
        executionStates[assignment.eventStaffId] = state
        do {
            _ = try await apiClient.putExecutionState(eventStaffId: assignment.eventStaffId, state: state)
        } catch {
            errorMessage = "No pudimos guardar el checklist de ejecución."
        }
    }

    /// Shape legacy del viejo UserDefaults (pre-#875). Solo para migración.
    private struct LegacyExecutionState: Codable {
        var arrivalReady: Bool = false
        var materialsReady: Bool = false
        var closingDone: Bool = false
        var quickNote: String = ""
    }

    private func availabilityBounds(now: Date = Date()) -> (start: String, end: String) {
        let calendar = Calendar(identifier: .gregorian)
        let year = calendar.component(.year, from: now)
        return ("\(year - 1)-01-01", "\(year + 1)-12-31")
    }
}
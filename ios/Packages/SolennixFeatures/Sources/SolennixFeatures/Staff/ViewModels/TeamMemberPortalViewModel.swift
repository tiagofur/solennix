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

    /// In-memory execution-state cache keyed by `eventStaffId` (#875).
    /// Only populated after a successful GET/migrate or a local edit.
    /// Load failures leave the key unset so the next open retries GET.
    public var executionStates: [String: AssignmentExecutionState] = [:]

    private let apiClient: APIClient

    /// Last state confirmed by a successful GET or PUT, used for rollback.
    private var lastSyncedStates: [String: AssignmentExecutionState] = [:]

    /// Serializes PUTs per assignment so concurrent edits coalesce.
    private var putSerialTasks: [String: Task<Void, Never>] = [:]

    /// Debounced note-save tasks per assignment (~400ms).
    private var noteDebounceTasks: [String: Task<Void, Never>] = [:]

    /// Assignments with a pending put requested while another put is in flight.
    private var pendingPutIds: Set<String> = []

    /// Debounce interval for quick-note keystrokes. Overridable in tests.
    var noteSaveDebounceNanoseconds: UInt64 = 400_000_000

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
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
            errorMessage = tr("team_portal.load_error_message", "No pudimos cargar tus asignaciones.")
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
            errorMessage = tr("team_portal.respond_error", "No pudimos actualizar tu respuesta.")
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
            errorMessage = tr("team_portal.timeline_read_error", "No pudimos actualizar el estado de lectura.")
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
            errorMessage = tr("team_portal.block_dates_error", "No pudimos bloquear fechas.")
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
            errorMessage = tr("team_portal.update_block_error", "No pudimos actualizar el bloqueo.")
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
            errorMessage = tr("team_portal.delete_block_error", "No pudimos eliminar el bloqueo.")
        }
    }

    // MARK: - Execution State (#875)

    /// Loads execution state from the server when the detail sheet opens.
    ///
    /// - GET runs first so a leftover UserDefaults blob cannot clobber newer
    ///   server state.
    /// - Legacy local state is PUT only when the server is empty/default, and
    ///   the UserDefaults key is removed only after that PUT succeeds.
    /// - Server responses are applied only when the cache is still empty so a
    ///   concurrent local toggle/note is not overwritten.
    /// - Load failures leave the cache unset (no sticky default) so reopen
    ///   retries GET; they never seed an authoritative empty state.
    @MainActor
    public func loadExecutionState(for assignment: TeamMemberAssignment) async {
        let id = assignment.eventStaffId
        if executionStates[id] != nil { return }

        let legacyKey = Self.legacyDefaultsKey(eventId: assignment.eventId)
        let legacyState = Self.readLegacyState(forKey: legacyKey)

        do {
            let serverState = try await apiClient.getExecutionState(eventStaffId: id)

            // Race guard: a toggle/note during the await already filled the cache.
            if executionStates[id] != nil {
                return
            }

            if let legacyState, !legacyState.isDefault, serverState.isDefault {
                // Server empty + local progress → migrate, delete only on PUT success.
                executionStates[id] = legacyState
                lastSyncedStates[id] = .defaultState
                let putSucceeded = await performExecutionStatePut(eventStaffId: id, state: legacyState)
                if putSucceeded {
                    UserDefaults.standard.removeObject(forKey: legacyKey)
                } else {
                    // Keep legacy in UserDefaults; clear cache so reopen retries
                    // GET+migrate instead of sticky-caching the rolled-back default.
                    executionStates[id] = nil
                    lastSyncedStates[id] = nil
                }
                return
            }

            // Server has real state (or both empty). Prefer server; drop leftover legacy.
            executionStates[id] = serverState
            lastSyncedStates[id] = serverState
            if legacyState != nil {
                UserDefaults.standard.removeObject(forKey: legacyKey)
            }
        } catch {
            // Do NOT write `.defaultState` — that would sticky-cache an empty
            // state and let a later PUT clobber the server.
            errorMessage = tr(
                "team_portal.execution_load_error",
                "No pudimos cargar el checklist de ejecución."
            )
        }
    }

    /// Optimistically updates the cache and persists to the server.
    ///
    /// - Toggles: `debounce: false` (immediate, serialized PUT).
    /// - Notes: `debounce: true` (~400ms) to avoid per-keystroke PUT spam.
    /// - On PUT failure, restores the last synced snapshot when the cache still
    ///   matches the failed payload (no newer local edit).
    @MainActor
    public func saveExecutionState(
        for assignment: TeamMemberAssignment,
        state: AssignmentExecutionState,
        debounce: Bool = false
    ) async {
        let id = assignment.eventStaffId
        executionStates[id] = state

        if debounce {
            noteDebounceTasks[id]?.cancel()
            noteDebounceTasks[id] = Task { @MainActor in
                try? await Task.sleep(nanoseconds: self.noteSaveDebounceNanoseconds)
                guard !Task.isCancelled else { return }
                await self.enqueueExecutionStatePut(for: assignment)
            }
            return
        }

        noteDebounceTasks[id]?.cancel()
        noteDebounceTasks[id] = nil
        await enqueueExecutionStatePut(for: assignment)
    }

    /// Enqueues a serialized PUT that always sends the latest cached state.
    @MainActor
    private func enqueueExecutionStatePut(for assignment: TeamMemberAssignment) async {
        let id = assignment.eventStaffId
        pendingPutIds.insert(id)

        if let existing = putSerialTasks[id] {
            await existing.value
            // Prior task may have exited (success drain or failure) before seeing
            // this pending flag — restart if work remains.
            if pendingPutIds.contains(id) {
                await enqueueExecutionStatePut(for: assignment)
            }
            return
        }

        let task = Task { @MainActor in
            defer { self.putSerialTasks[id] = nil }

            while self.pendingPutIds.contains(id) {
                self.pendingPutIds.remove(id)
                let stateToSave = self.executionStates[id] ?? .defaultState
                let putSucceeded = await self.performExecutionStatePut(eventStaffId: id, state: stateToSave)
                if !putSucceeded {
                    break
                }
            }
        }
        putSerialTasks[id] = task
        await task.value
    }

    /// Performs one PUT. Returns `true` on success. On failure restores the last
    /// synced snapshot when the cache still equals `state`, and surfaces an error.
    @MainActor
    @discardableResult
    private func performExecutionStatePut(
        eventStaffId id: String,
        state: AssignmentExecutionState
    ) async -> Bool {
        let rollback = lastSyncedStates[id] ?? .defaultState
        do {
            _ = try await apiClient.putExecutionState(eventStaffId: id, state: state)
            if executionStates[id] == state {
                lastSyncedStates[id] = state
            }
            return true
        } catch {
            if executionStates[id] == state {
                executionStates[id] = rollback
            }
            errorMessage = tr(
                "team_portal.execution_save_error",
                "No pudimos guardar el checklist de ejecución."
            )
            return false
        }
    }

    static func legacyDefaultsKey(eventId: String) -> String {
        "team_event_detail_\(eventId)"
    }

    /// Shape of the pre-#875 UserDefaults blob. Decode-only, migration path.
    private struct LegacyExecutionState: Codable {
        var arrivalReady: Bool = false
        var materialsReady: Bool = false
        var closingDone: Bool = false
        var quickNote: String = ""

        var asExecutionState: AssignmentExecutionState {
            AssignmentExecutionState(
                checklist: ExecutionChecklist(
                    arrival: arrivalReady,
                    materials: materialsReady,
                    closing: closingDone
                ),
                quickNote: quickNote
            )
        }
    }

    private static func readLegacyState(forKey key: String) -> AssignmentExecutionState? {
        guard let data = UserDefaults.standard.data(forKey: key),
              let legacy = try? JSONDecoder().decode(LegacyExecutionState.self, from: data) else {
            return nil
        }
        return legacy.asExecutionState
    }

    private func availabilityBounds(now: Date = Date()) -> (start: String, end: String) {
        let calendar = Calendar(identifier: .gregorian)
        let year = calendar.component(.year, from: now)
        return ("\(year - 1)-01-01", "\(year + 1)-12-31")
    }
}

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
    /// Only populated after a successful GET/migrate (server seed) or a local
    /// edit that happened once load readiness is `.ready`.
    public var executionStates: [String: AssignmentExecutionState] = [:]

    /// Per-assignment load readiness. Editing is gated until `.ready`.
    public var executionLoadStates: [String: ExecutionLoadState] = [:]

    private let apiClient: APIClient

    /// Last state confirmed by a successful GET or PUT (or offline-queued PUT),
    /// used for rollback. Internal for unit tests (`@testable`).
    var lastSyncedStates: [String: AssignmentExecutionState] = [:]

    /// Serializes PUTs per assignment so concurrent edits coalesce.
    private var putSerialTasks: [String: Task<Bool, Never>] = [:]

    /// Debounced note-save tasks per assignment (~400ms).
    private var noteDebounceTasks: [String: Task<Void, Never>] = [:]

    /// Assignments with a pending put requested while another put is in flight.
    private var pendingPutIds: Set<String> = []

    /// Debounce interval for quick-note keystrokes. Overridable in tests.
    var noteSaveDebounceNanoseconds: UInt64 = 400_000_000

    /// Mirrors backend `MaxQuickNoteLength` (#998 / #875).
    public static let maxQuickNoteLength = 2000

    /// Load readiness for an assignment's execution state.
    public enum ExecutionLoadState: Equatable, Sendable {
        case idle
        case loading
        case ready
        case failed
    }

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

    /// Whether the assignment's execution checklist may be edited.
    @MainActor
    public func isExecutionEditingEnabled(for assignment: TeamMemberAssignment) -> Bool {
        executionLoadStates[assignment.eventStaffId] == .ready
    }

    /// Loads execution state from the server when the detail sheet opens.
    ///
    /// - Editing stays gated (`executionLoadStates != .ready`) until a successful
    ///   server seed so default-based mid-flight edits cannot clobber server fields.
    /// - GET runs first so a leftover UserDefaults blob cannot clobber newer
    ///   server state.
    /// - Legacy local state is PUT only when the server is empty/default, and
    ///   the UserDefaults key is removed only after that PUT succeeds.
    /// - Load failures leave the cache unset (no sticky default) so reopen/retry
    ///   re-runs GET; they never seed an authoritative empty state.
    @MainActor
    public func loadExecutionState(for assignment: TeamMemberAssignment) async {
        let id = assignment.eventStaffId
        if executionLoadStates[id] == .ready { return }
        if executionLoadStates[id] == .loading { return }

        executionLoadStates[id] = .loading

        let legacyKey = Self.legacyDefaultsKey(eventId: assignment.eventId)
        let legacyState = Self.readLegacyState(forKey: legacyKey)

        do {
            let serverState = try await apiClient.getExecutionState(eventStaffId: id)

            // Only skip applying server when we already completed a successful seed.
            // Cache non-nil alone is not authoritative (could be a pre-seed default).
            if executionLoadStates[id] == .ready {
                return
            }

            if let legacyState, !legacyState.isDefault, serverState.isDefault {
                // Server empty + local progress → migrate via the serial PUT queue.
                executionStates[id] = legacyState
                lastSyncedStates[id] = .defaultState
                // Mark ready so enqueue is allowed; roll back readiness if migrate fails.
                executionLoadStates[id] = .ready
                let putSucceeded = await enqueueExecutionStatePut(for: assignment)
                if putSucceeded {
                    UserDefaults.standard.removeObject(forKey: legacyKey)
                    errorMessage = nil
                } else {
                    // Keep legacy in UserDefaults; clear cache so reopen retries
                    // GET+migrate instead of sticky-caching the rolled-back default.
                    executionStates[id] = nil
                    lastSyncedStates[id] = nil
                    executionLoadStates[id] = .failed
                }
                return
            }

            // Server has real state (or both empty). Prefer server; drop leftover legacy.
            executionStates[id] = serverState
            lastSyncedStates[id] = serverState
            executionLoadStates[id] = .ready
            errorMessage = nil
            if legacyState != nil {
                UserDefaults.standard.removeObject(forKey: legacyKey)
            }
        } catch {
            // Do NOT write `.defaultState` — that would sticky-cache an empty
            // state and let a later PUT clobber the server.
            executionStates[id] = nil
            lastSyncedStates[id] = nil
            executionLoadStates[id] = .failed
            errorMessage = tr(
                "team_portal.execution_load_error",
                "No pudimos cargar el checklist de ejecución."
            )
        }
    }

    /// Synchronously writes the local cache (UI source of truth) before any Task.
    ///
    /// No-op while load is not `.ready` so default-based mid-flight edits cannot
    /// seed the cache and race a GET. Caps `quickNote` at `maxQuickNoteLength`.
    @MainActor
    public func applyLocalExecutionState(
        _ state: AssignmentExecutionState,
        for assignment: TeamMemberAssignment
    ) {
        let id = assignment.eventStaffId
        guard executionLoadStates[id] == .ready else { return }

        var next = state
        if next.quickNote.count > Self.maxQuickNoteLength {
            next.quickNote = String(next.quickNote.prefix(Self.maxQuickNoteLength))
            errorMessage = tr(
                "team_portal.quick_note_too_long",
                "La nota rápida no puede superar 2000 caracteres."
            )
        }
        executionStates[id] = next
    }

    /// Persists the current cached state. Toggles use `debounce: false` (immediate
    /// serialized PUT); notes use `debounce: true` (~400ms).
    @MainActor
    public func persistExecutionState(
        for assignment: TeamMemberAssignment,
        debounce: Bool = false
    ) async {
        let id = assignment.eventStaffId
        guard executionLoadStates[id] == .ready else { return }
        guard executionStates[id] != nil else { return }

        if debounce {
            noteDebounceTasks[id]?.cancel()
            noteDebounceTasks[id] = Task { @MainActor in
                try? await Task.sleep(nanoseconds: self.noteSaveDebounceNanoseconds)
                guard !Task.isCancelled else { return }
                _ = await self.enqueueExecutionStatePut(for: assignment)
            }
            return
        }

        noteDebounceTasks[id]?.cancel()
        noteDebounceTasks[id] = nil
        _ = await enqueueExecutionStatePut(for: assignment)
    }

    /// Apply + persist convenience used by tests and call sites that already hold
    /// a full state snapshot.
    @MainActor
    public func saveExecutionState(
        for assignment: TeamMemberAssignment,
        state: AssignmentExecutionState,
        debounce: Bool = false
    ) async {
        applyLocalExecutionState(state, for: assignment)
        await persistExecutionState(for: assignment, debounce: debounce)
    }

    /// Enqueues a serialized PUT that always sends the latest cached state.
    /// Returns `true` when the final PUT for this drain succeeded (or was
    /// offline-queued); `false` if a PUT failed and the drain stopped.
    @MainActor
    @discardableResult
    private func enqueueExecutionStatePut(for assignment: TeamMemberAssignment) async -> Bool {
        let id = assignment.eventStaffId
        pendingPutIds.insert(id)

        if let existing = putSerialTasks[id] {
            let priorResult = await existing.value
            // Prior task may have exited (success drain or failure) before seeing
            // this pending flag — restart if work remains.
            if pendingPutIds.contains(id) {
                return await enqueueExecutionStatePut(for: assignment)
            }
            return priorResult
        }

        let task = Task { @MainActor in
            defer { self.putSerialTasks[id] = nil }

            var lastResult = true
            while self.pendingPutIds.contains(id) {
                self.pendingPutIds.remove(id)
                let stateToSave = self.executionStates[id] ?? .defaultState
                lastResult = await self.performExecutionStatePut(eventStaffId: id, state: stateToSave)
                if !lastResult {
                    break
                }
            }
            return lastResult
        }
        putSerialTasks[id] = task
        return await task.value
    }

    /// Performs one PUT. Returns `true` on success or offline-queue acceptance.
    /// On hard failure restores the last synced snapshot when the cache still
    /// equals `state`, and surfaces an error.
    @MainActor
    @discardableResult
    private func performExecutionStatePut(
        eventStaffId id: String,
        state: AssignmentExecutionState
    ) async -> Bool {
        let rollback = lastSyncedStates[id] ?? .defaultState
        do {
            _ = try await apiClient.putExecutionState(eventStaffId: id, state: state)
            // Always advance lastSynced for the written payload — even if a
            // concurrent local edit already moved the cache past `state`.
            lastSyncedStates[id] = state
            errorMessage = nil
            return true
        } catch {
            // APIClient enqueues the mutation then throws a networkError with a
            // "will send on reconnect" message. Treat that as optimistic success
            // so we do not roll back UI while the queue still holds the body.
            if Self.isOfflineQueuedError(error) {
                lastSyncedStates[id] = state
                return true
            }
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

    /// Detects the offline-queue acceptance path from `APIClient.put/post/patch`.
    static func isOfflineQueuedError(_ error: Error) -> Bool {
        guard let apiError = error as? APIError,
              case .networkError(let message) = apiError else {
            return false
        }
        // Stable fragment of the queue-acceptance copy in APIClient.
        return message.contains("se enviará automáticamente")
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

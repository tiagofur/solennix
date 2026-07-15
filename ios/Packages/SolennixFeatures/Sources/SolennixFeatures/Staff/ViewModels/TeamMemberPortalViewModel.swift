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
    /// List / assignment-level errors (load assignments, respond, availability…).
    /// Intentionally separate from execution-state errors so list "Reintentar"
    /// never reloads the wrong surface (#875).
    public var errorMessage: String?

    /// Execution checklist load/save errors for the detail sheet only.
    public var executionErrorMessage: String?

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
    private var putSerialTasks: [String: Task<ExecutionPutResult, Never>] = [:]

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

    /// Outcome of a single execution-state PUT (or a serial drain of them).
    public enum ExecutionPutResult: Equatable, Sendable {
        /// HTTP 2xx — durable server ack.
        case serverAcked
        /// Offline queue accepted the body (optimistic; not durable).
        case offlineQueued
        /// Hard failure (4xx/other); drain may have aborted.
        case failed

        var isSuccess: Bool { self != .failed }

        /// True only for a real HTTP success — safe to drop legacy UserDefaults.
        var isServerAcked: Bool { self == .serverAcked }
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
    ///   server seed / migrate so default-based mid-flight edits cannot clobber
    ///   server fields.
    /// - GET runs first so a leftover UserDefaults blob cannot clobber newer
    ///   server state.
    /// - Legacy local state is PUT only when the server is empty/default, and
    ///   the UserDefaults key is removed only after a real HTTP 2xx migrate
    ///   (not offline-queue acceptance).
    /// - Load failures leave the cache unset (no sticky default) so reopen/retry
    ///   re-runs GET; they never seed an authoritative empty state.
    /// - Cancellation (sheet dismiss mid-GET) resets to `.idle` without a banner.
    @MainActor
    public func loadExecutionState(for assignment: TeamMemberAssignment) async {
        let id = assignment.eventStaffId
        if executionLoadStates[id] == .ready { return }
        if executionLoadStates[id] == .loading { return }

        executionLoadStates[id] = .loading
        executionErrorMessage = nil

        let legacyKey = Self.legacyDefaultsKey(eventId: assignment.eventId)
        let legacyState = Self.readLegacyState(forKey: legacyKey)

        do {
            let serverState = try await apiClient.getExecutionState(eventStaffId: id)

            // Sheet dismissed (or Task cancelled) while GET was in flight.
            if Task.isCancelled {
                resetExecutionLoadToIdleIfLoading(id)
                return
            }

            // Only skip applying server when we already completed a successful seed.
            // Cache non-nil alone is not authoritative (could be a pre-seed default).
            if executionLoadStates[id] == .ready {
                return
            }

            if let legacyState, !legacyState.isDefault, serverState.isDefault {
                // Server empty + local progress → migrate via the serial PUT queue.
                // Stay in `.loading` until migrate finishes so concurrent edits
                // cannot race a mid-migrate PUT of incomplete defaults.
                executionStates[id] = legacyState
                lastSyncedStates[id] = .defaultState
                let putResult = await enqueueExecutionStatePut(
                    for: assignment,
                    requireReady: false
                )
                switch putResult {
                case .serverAcked:
                    // Durable migrate — safe to drop legacy UserDefaults.
                    UserDefaults.standard.removeObject(forKey: legacyKey)
                    executionLoadStates[id] = .ready
                    executionErrorMessage = nil
                case .offlineQueued:
                    // Optimistic local seed for UX, but KEEP legacy until a real
                    // server ack so cold-start GET+empty cannot drop fields.
                    executionLoadStates[id] = .ready
                    executionErrorMessage = nil
                case .failed:
                    // Keep legacy in UserDefaults; clear cache so reopen retries
                    // GET+migrate instead of sticky-caching the rolled-back default.
                    cancelNoteDebounce(for: id)
                    executionStates[id] = nil
                    lastSyncedStates[id] = nil
                    executionLoadStates[id] = .failed
                    executionErrorMessage = tr(
                        "team_portal.execution_load_error",
                        "No pudimos cargar el checklist de ejecución."
                    )
                }
                return
            }

            // Server has real state (or both empty). Prefer server; drop leftover legacy.
            executionStates[id] = serverState
            lastSyncedStates[id] = serverState
            executionLoadStates[id] = .ready
            executionErrorMessage = nil
            if legacyState != nil {
                UserDefaults.standard.removeObject(forKey: legacyKey)
            }
        } catch {
            // Cancellation is not a hard load failure — sheet dismiss cancels `.task`.
            if Task.isCancelled || Self.isCancellationError(error) {
                resetExecutionLoadToIdleIfLoading(id)
                return
            }
            // Do NOT write `.defaultState` — that would sticky-cache an empty
            // state and let a later PUT clobber the server.
            cancelNoteDebounce(for: id)
            executionStates[id] = nil
            lastSyncedStates[id] = nil
            executionLoadStates[id] = .failed
            executionErrorMessage = tr(
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
            executionErrorMessage = tr(
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
    /// Returns the last PUT outcome for this drain. Never PUTs `.defaultState`
    /// when the cache is nil / not ready.
    @MainActor
    @discardableResult
    func enqueueExecutionStatePut(
        for assignment: TeamMemberAssignment,
        requireReady: Bool = true
    ) async -> ExecutionPutResult {
        let id = assignment.eventStaffId
        pendingPutIds.insert(id)

        if let existing = putSerialTasks[id] {
            let priorResult = await existing.value
            // Prior task may have exited (success drain or failure) before seeing
            // this pending flag — restart if work remains AND we still have an
            // authoritative local snapshot (never re-PUT empty defaults).
            if pendingPutIds.contains(id),
               hasAuthoritativeExecutionState(id, requireReady: requireReady) {
                return await enqueueExecutionStatePut(
                    for: assignment,
                    requireReady: requireReady
                )
            }
            // Pending was re-armed but cache was cleared (e.g. migrate fail) —
            // drop the stale flag so waiters do not loop forever.
            if pendingPutIds.contains(id),
               !hasAuthoritativeExecutionState(id, requireReady: requireReady) {
                pendingPutIds.remove(id)
            }
            return priorResult
        }

        let task = Task { @MainActor in
            defer { self.putSerialTasks[id] = nil }

            var lastResult: ExecutionPutResult = .serverAcked
            var retriedAfterFailure = false
            while self.pendingPutIds.contains(id) {
                self.pendingPutIds.remove(id)

                guard let stateToSave = self.executionStates[id],
                      self.hasAuthoritativeExecutionState(id, requireReady: requireReady)
                else {
                    // No authoritative local state — abort without putting defaults.
                    lastResult = .failed
                    break
                }

                lastResult = await self.performExecutionStatePut(
                    eventStaffId: id,
                    state: stateToSave
                )
                if lastResult.isSuccess {
                    retriedAfterFailure = false
                    continue
                }

                // Hard failure: if a newer edit re-armed pending during the failed
                // PUT, attempt one more drain with the current cache instead of
                // dropping work when no waiter is attached.
                if !retriedAfterFailure,
                   self.pendingPutIds.contains(id),
                   self.hasAuthoritativeExecutionState(id, requireReady: requireReady) {
                    retriedAfterFailure = true
                    continue
                }
                break
            }
            return lastResult
        }
        putSerialTasks[id] = task
        return await task.value
    }

    /// Performs one PUT. Distinguishes HTTP success from offline-queue acceptance.
    /// On hard failure restores the last synced snapshot when the cache still
    /// equals `state`, and surfaces an execution error.
    @MainActor
    @discardableResult
    private func performExecutionStatePut(
        eventStaffId id: String,
        state: AssignmentExecutionState
    ) async -> ExecutionPutResult {
        let rollback = lastSyncedStates[id] ?? .defaultState
        do {
            _ = try await apiClient.putExecutionState(eventStaffId: id, state: state)
            // Always advance lastSynced for the written payload — even if a
            // concurrent local edit already moved the cache past `state`.
            lastSyncedStates[id] = state
            executionErrorMessage = nil
            return .serverAcked
        } catch {
            if Self.isCancellationError(error) || Task.isCancelled {
                // Do not roll back or surface a banner for a cancelled PUT.
                return .failed
            }
            // APIClient enqueues the mutation then throws a networkError with a
            // "will send on reconnect" message. Treat that as optimistic success
            // so we do not roll back UI while the queue still holds the body.
            if Self.isOfflineQueuedError(error) {
                lastSyncedStates[id] = state
                executionErrorMessage = nil
                return .offlineQueued
            }
            if executionStates[id] == state {
                executionStates[id] = rollback
            }
            executionErrorMessage = tr(
                "team_portal.execution_save_error",
                "No pudimos guardar el checklist de ejecución."
            )
            return .failed
        }
    }

    /// Whether the assignment currently holds a cache snapshot safe to PUT.
    /// During migrate, `requireReady` is false so we may PUT while still `.loading`.
    @MainActor
    private func hasAuthoritativeExecutionState(
        _ id: String,
        requireReady: Bool
    ) -> Bool {
        guard executionStates[id] != nil else { return false }
        if requireReady {
            return executionLoadStates[id] == .ready
        }
        // Migrate path: allow while loading, never while failed/idle after clear.
        let load = executionLoadStates[id]
        return load == .loading || load == .ready
    }

    @MainActor
    private func resetExecutionLoadToIdleIfLoading(_ id: String) {
        if executionLoadStates[id] == .loading {
            executionLoadStates[id] = .idle
        }
        // Leave cache unset — reopen will re-GET.
        if executionLoadStates[id] != .ready {
            executionStates[id] = nil
            lastSyncedStates[id] = nil
        }
    }

    @MainActor
    private func cancelNoteDebounce(for id: String) {
        noteDebounceTasks[id]?.cancel()
        noteDebounceTasks[id] = nil
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

    /// True for cooperative cancellation (sheet dismiss / Task.cancel).
    /// APIClient may wrap `URLError.cancelled` as `APIError.networkError`, so
    /// callers should also check `Task.isCancelled`.
    static func isCancellationError(_ error: Error) -> Bool {
        if error is CancellationError { return true }
        if let urlError = error as? URLError, urlError.code == .cancelled {
            return true
        }
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
            return true
        }
        return false
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

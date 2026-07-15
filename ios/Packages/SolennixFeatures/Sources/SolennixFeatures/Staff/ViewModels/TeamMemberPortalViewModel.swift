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

    /// Execution checklist load/save errors keyed by `eventStaffId` (#875).
    /// Scoped per assignment so opening B never shows A's save/load error.
    public var executionErrorMessages: [String: String] = [:]

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

    /// True once a successful GET seeded this assignment from the server.
    /// Offline legacy seed sets `.ready` without this flag so the next sheet
    /// open soft-revalidates instead of sticky-short-circuiting forever.
    var executionServerSeeded: [String: Bool] = [:]

    /// Serializes PUTs per assignment so concurrent edits coalesce.
    private var putSerialTasks: [String: Task<ExecutionPutResult, Never>] = [:]

    /// In-flight load tasks per assignment so concurrent callers join instead of
    /// early-returning while a cancel can leave a sticky `.loading` spinner.
    private var loadExecutionTasks: [String: Task<Void, Never>] = [:]

    /// Debounced note-save tasks per assignment (~400ms).
    private var noteDebounceTasks: [String: Task<Void, Never>] = [:]

    /// Assignments with a pending put requested while another put is in flight.
    private var pendingPutIds: Set<String> = []

    /// Observes permanent offline-flush drops so optimistic UX can surface dirty state.
    private var offlineDropObserver: NSObjectProtocol?

    /// Observes successful offline flushes so portal can soft-revalidate server truth.
    private var offlineFlushObserver: NSObjectProtocol?

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
        /// Cooperative cancellation (sheet dismiss mid-PUT). Not a hard error.
        case cancelled

        var isSuccess: Bool {
            switch self {
            case .serverAcked, .offlineQueued: return true
            case .failed, .cancelled: return false
            }
        }

        /// True only for a real HTTP success — safe to drop legacy UserDefaults.
        var isServerAcked: Bool { self == .serverAcked }
    }

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
        offlineDropObserver = NotificationCenter.default.addObserver(
            forName: APIClient.offlineMutationDroppedNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self else { return }
            Task { @MainActor in
                self.handleOfflineMutationDropped(notification)
            }
        }
        offlineFlushObserver = NotificationCenter.default.addObserver(
            forName: APIClient.offlineMutationFlushedNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self else { return }
            Task { @MainActor in
                self.handleOfflineMutationFlushed(notification)
            }
        }
    }

    deinit {
        if let offlineDropObserver {
            NotificationCenter.default.removeObserver(offlineDropObserver)
        }
        if let offlineFlushObserver {
            NotificationCenter.default.removeObserver(offlineFlushObserver)
        }
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
    /// - Non-default legacy is union-merged with non-default server (checklist OR,
    ///   richer note); legacy is removed only after a real HTTP 2xx PUT ack.
    /// - GET failure with non-default legacy seeds offline-ready UX instead of
    ///   hiding local progress.
    /// - Load failures without legacy leave the cache unset (no sticky default).
    /// - Cancellation (sheet dismiss mid-GET/migrate) resets to `.idle` without a banner.
    /// - Concurrent callers join the in-flight load Task (no sticky `.loading`).
    @MainActor
    public func loadExecutionState(for assignment: TeamMemberAssignment) async {
        let id = assignment.eventStaffId
        // Only short-circuit when we already have a server-seeded ready state.
        // Offline legacy seed is `.ready` without serverSeeded so next open re-GETs.
        if isServerSeededReady(id) { return }

        if let existing = loadExecutionTasks[id] {
            // Join the in-flight load so concurrent open/retry never early-returns
            // while a cancel can leave a sticky `.loading` spinner.
            await existing.value
            return
        }

        let task = Task { @MainActor in
            await self.performLoadExecutionState(for: assignment)
        }
        loadExecutionTasks[id] = task
        // Propagate sheet-dismiss cancellation into the shared load Task so
        // Task.isCancelled is observed inside GET/migrate and state resets to idle.
        await withTaskCancellationHandler {
            await task.value
        } onCancel: {
            task.cancel()
        }
        if loadExecutionTasks[id] == task {
            loadExecutionTasks[id] = nil
        }
    }

    @MainActor
    private func performLoadExecutionState(for assignment: TeamMemberAssignment) async {
        let id = assignment.eventStaffId
        if isServerSeededReady(id) { return }

        // Soft revalidate: offline-seeded ready keeps editing enabled while we re-GET.
        let softRevalidate = executionLoadStates[id] == .ready
            && executionServerSeeded[id] != true
            && executionStates[id] != nil

        if !softRevalidate {
            executionLoadStates[id] = .loading
        }
        clearExecutionError(for: id)

        let legacyKey = Self.legacyDefaultsKey(eventId: assignment.eventId)
        // Freeze pre-GET snapshot. Soft revalidate keeps `.ready`, so the user can
        // edit during the await — re-read cache AFTER GET and merge with current,
        // never only this frozen snapshot.
        let preGetCache = executionStates[id]
        let legacyFromDefaults = Self.readLegacyState(forKey: legacyKey)

        do {
            let serverState = try await apiClient.getExecutionState(eventStaffId: id)

            // Sheet dismissed (or Task cancelled) while GET was in flight.
            if Task.isCancelled {
                if softRevalidate {
                    // Keep offline-ready cache; do not tear down editing UX.
                    return
                }
                resetExecutionLoadToIdleIfLoading(id)
                return
            }

            // Only skip applying server when we already completed a successful seed
            // during this load (concurrent waiter). Soft revalidate must apply.
            if isServerSeededReady(id) {
                return
            }

            // Re-resolve local side AFTER GET so concurrent mid-flight edits win.
            // Soft revalidate: live cache key presence is truth (including
            // intentional `.defaultState`) — do NOT fall back to frozen legacy
            // when the key exists. Hard load: UserDefaults blob only.
            let localProgress: AssignmentExecutionState? = {
                if softRevalidate {
                    if let current = executionStates[id] {
                        // Present key (even default) is live truth — no frozen fallback.
                        return current.isDefault ? nil : current
                    }
                    if let pre = preGetCache, !pre.isDefault {
                        return pre
                    }
                    if let blob = legacyFromDefaults, !blob.isDefault {
                        return blob
                    }
                    return nil
                }
                if let blob = legacyFromDefaults, !blob.isDefault {
                    return blob
                }
                return nil
            }()
            let cacheAdvancedDuringGet = softRevalidate
                && preGetCache != nil
                && executionStates[id] != nil
                && executionStates[id] != preGetCache

            // Mid-edit during soft revalidate: live cache is authoritative for
            // subtractive edits (uncheck / clear-to-default). Do NOT OR-merge
            // with server — that would resurrect server-true bits the user
            // intentionally cleared. Keep dirty and push current via serial PUT.
            // Mark server-seeded after successful GET so we do not re-GET-loop.
            if cacheAdvancedDuringGet, let current = executionStates[id] {
                executionStates[id] = current
                lastSyncedStates[id] = serverState
                if current == serverState {
                    markServerSeededReady(id)
                    clearExecutionError(for: id)
                    UserDefaults.standard.removeObject(forKey: legacyKey)
                    return
                }
                Self.writeLegacyState(current, forKey: legacyKey)
                var putResult = await enqueueExecutionStatePut(
                    for: assignment,
                    requireReady: true
                )
                if Task.isCancelled,
                   putResult != .serverAcked,
                   putResult != .offlineQueued {
                    putResult = .cancelled
                }
                switch putResult {
                case .serverAcked:
                    UserDefaults.standard.removeObject(forKey: legacyKey)
                    markServerSeededReady(id)
                    clearExecutionError(for: id)
                case .offlineQueued:
                    Self.writeLegacyState(
                        executionStates[id] ?? current,
                        forKey: legacyKey
                    )
                    markServerSeededReady(id)
                    clearExecutionError(for: id)
                case .failed:
                    // Keep live cache; lastSynced remains serverState (honest baseline).
                    executionStates[id] = current
                    lastSyncedStates[id] = serverState
                    Self.writeLegacyState(current, forKey: legacyKey)
                    markServerSeededReady(id)
                    setExecutionError(
                        tr(
                            "team_portal.execution_save_error",
                            "No pudimos guardar el checklist de ejecución."
                        ),
                        for: id
                    )
                case .cancelled:
                    executionLoadStates[id] = .ready
                }
                return
            }

            if let localProgress, !localProgress.isDefault {
                if serverState.isDefault {
                    // Server empty + local progress → migrate via the serial PUT queue.
                    // Stay in `.loading` until migrate finishes so concurrent edits
                    // cannot race a mid-migrate PUT of incomplete defaults.
                    // Soft revalidate already has cache + ready — keep editing on.
                    if !softRevalidate {
                        executionStates[id] = localProgress
                        lastSyncedStates[id] = .defaultState
                    } else {
                        // Ensure cache reflects local progress (including mid-GET edits).
                        if executionStates[id] == nil {
                            executionStates[id] = localProgress
                        }
                        if lastSyncedStates[id] == nil {
                            lastSyncedStates[id] = .defaultState
                        }
                    }
                    var putResult = await enqueueExecutionStatePut(
                        for: assignment,
                        requireReady: softRevalidate
                    )
                    // Sheet dismiss can race a hard PUT outcome — prefer cancel idle.
                    if Task.isCancelled,
                       putResult != .serverAcked,
                       putResult != .offlineQueued {
                        putResult = .cancelled
                    }
                    switch putResult {
                    case .serverAcked:
                        // Durable migrate — safe to drop legacy UserDefaults.
                        UserDefaults.standard.removeObject(forKey: legacyKey)
                        markServerSeededReady(id)
                        clearExecutionError(for: id)
                    case .offlineQueued:
                        // Optimistic local seed for UX, but KEEP legacy until a real
                        // server ack so cold-start GET+empty cannot drop fields.
                        // Rewrite legacy so it matches the seeded cache.
                        // GET succeeded (server default) so we are server-seeded.
                        Self.writeLegacyState(
                            executionStates[id] ?? localProgress,
                            forKey: legacyKey
                        )
                        markServerSeededReady(id)
                        clearExecutionError(for: id)
                    case .failed:
                        if softRevalidate {
                            // Keep offline-ready local truth; surface save error.
                            executionLoadStates[id] = .ready
                            setExecutionError(
                                tr(
                                    "team_portal.execution_save_error",
                                    "No pudimos guardar el checklist de ejecución."
                                ),
                                for: id
                            )
                        } else {
                            // Keep legacy in UserDefaults; clear cache so reopen retries
                            // GET+migrate instead of sticky-caching the rolled-back default.
                            cancelNoteDebounce(for: id)
                            executionStates[id] = nil
                            lastSyncedStates[id] = nil
                            executionServerSeeded[id] = false
                            executionLoadStates[id] = .failed
                            setExecutionError(
                                tr(
                                    "team_portal.execution_save_error",
                                    "No pudimos guardar el checklist de ejecución."
                                ),
                                for: id
                            )
                        }
                    case .cancelled:
                        // Sheet dismiss mid-migrate — no banner; keep legacy for reopen.
                        if softRevalidate {
                            executionLoadStates[id] = .ready
                        } else {
                            resetExecutionLoadAfterCancelledMigrate(id)
                        }
                    }
                    return
                }

                // Server + local both non-default → union merge (never silent-drop).
                // Always use post-GET localProgress (not a frozen pre-GET snapshot).
                // Mid-edit cache advances are handled above (authoritative live cache).
                let merged = Self.mergeExecutionStates(server: serverState, legacy: localProgress)
                if merged == serverState {
                    // Server already covers local — pure-server overwrite.
                    executionStates[id] = serverState
                    lastSyncedStates[id] = serverState
                    markServerSeededReady(id)
                    clearExecutionError(for: id)
                    UserDefaults.standard.removeObject(forKey: legacyKey)
                    return
                }

                executionStates[id] = merged
                lastSyncedStates[id] = serverState
                // Keep legacy rewritten to merged until server ack.
                // Notes differ → never delete legacy without a successful merge PUT.
                Self.writeLegacyState(merged, forKey: legacyKey)
                var putResult = await enqueueExecutionStatePut(
                    for: assignment,
                    requireReady: softRevalidate
                )
                // Sheet dismiss can race a hard PUT outcome — prefer cancel idle.
                if Task.isCancelled,
                   putResult != .serverAcked,
                   putResult != .offlineQueued {
                    putResult = .cancelled
                }
                switch putResult {
                case .serverAcked:
                    UserDefaults.standard.removeObject(forKey: legacyKey)
                    markServerSeededReady(id)
                    clearExecutionError(for: id)
                case .offlineQueued:
                    // Offline queue advances lastSynced to merged inside PUT path.
                    // GET already succeeded — mark server-seeded.
                    // Re-read cache in case concurrent edit advanced during PUT.
                    Self.writeLegacyState(
                        executionStates[id] ?? merged,
                        forKey: legacyKey
                    )
                    markServerSeededReady(id)
                    clearExecutionError(for: id)
                case .failed:
                    // performExecutionStatePut rolls cache to lastSynced (server).
                    // Restore merged as local truth so UI + retry keep local-only
                    // fields; keep lastSynced = server for honest rollback baseline.
                    // Prefer live cache if it advanced further during the PUT.
                    let restore: AssignmentExecutionState = {
                        if let current = executionStates[id],
                           current != serverState,
                           current != merged {
                            return Self.mergeExecutionStates(server: merged, legacy: current)
                        }
                        return merged
                    }()
                    executionStates[id] = restore
                    lastSyncedStates[id] = serverState
                    Self.writeLegacyState(restore, forKey: legacyKey)
                    markServerSeededReady(id)
                    setExecutionError(
                        tr(
                            "team_portal.execution_save_error",
                            "No pudimos guardar el checklist de ejecución."
                        ),
                        for: id
                    )
                case .cancelled:
                    // Sheet dismiss mid-merge — no banner; keep legacy for reopen.
                    if softRevalidate {
                        executionLoadStates[id] = .ready
                    } else {
                        resetExecutionLoadAfterCancelledMigrate(id)
                    }
                }
                return
            }

            // No non-default local (and no mid-edit advance). Prefer server;
            // drop empty leftover key. Mid-edit advances handled above.
            executionStates[id] = serverState
            lastSyncedStates[id] = serverState
            markServerSeededReady(id)
            clearExecutionError(for: id)
            if UserDefaults.standard.data(forKey: legacyKey) != nil {
                UserDefaults.standard.removeObject(forKey: legacyKey)
            }
        } catch {
            // Cancellation is not a hard load failure — sheet dismiss cancels `.task`.
            if Task.isCancelled || Self.isCancellationError(error) {
                if softRevalidate {
                    return
                }
                resetExecutionLoadToIdleIfLoading(id)
                return
            }

            // Cold-start offline / GET fail: surface non-default local so field
            // staff can keep editing. Prefer live cache (soft revalidate mid-edit),
            // then pre-GET snapshot, then UserDefaults blob.
            // Do NOT mark serverSeeded — next open soft-revalidates with a re-GET.
            let seedCandidate: AssignmentExecutionState? = {
                if let current = executionStates[id], !current.isDefault {
                    return current
                }
                if let pre = preGetCache, !pre.isDefault {
                    return pre
                }
                if let blob = legacyFromDefaults, !blob.isDefault {
                    return blob
                }
                return Self.readLegacyState(forKey: legacyKey)
            }()
            if let seed = seedCandidate, !seed.isDefault {
                executionStates[id] = seed
                lastSyncedStates[id] = seed
                executionLoadStates[id] = .ready
                executionServerSeeded[id] = false
                clearExecutionError(for: id)
                return
            }

            // Soft revalidate with no local progress: fall through to failed only
            // if we have nothing to show.
            if softRevalidate, executionStates[id] != nil {
                executionLoadStates[id] = .ready
                return
            }

            // Do NOT write `.defaultState` — that would sticky-cache an empty
            // state and let a later PUT clobber the server.
            cancelNoteDebounce(for: id)
            executionStates[id] = nil
            lastSyncedStates[id] = nil
            executionServerSeeded[id] = false
            executionLoadStates[id] = .failed
            setExecutionError(
                tr(
                    "team_portal.execution_load_error",
                    "No pudimos cargar el checklist de ejecución."
                ),
                for: id
            )
        }
    }

    @MainActor
    private func isServerSeededReady(_ id: String) -> Bool {
        executionLoadStates[id] == .ready && executionServerSeeded[id] == true
    }

    @MainActor
    private func markServerSeededReady(_ id: String) {
        executionLoadStates[id] = .ready
        executionServerSeeded[id] = true
    }

    /// Offline flush permanently dropped a queued mutation (4xx). Surface dirty
    /// state for matching execution-state endpoints so UI is not silently optimistic.
    @MainActor
    private func handleOfflineMutationDropped(_ notification: Notification) {
        guard
            let endpoint = notification.userInfo?[APIClient.offlineMutationDroppedEndpointKey] as? String,
            let eventStaffId = Self.eventStaffId(fromExecutionStateEndpoint: endpoint)
        else {
            return
        }
        // Keep optimistic cache for local edits, but mark not server-seeded so
        // next open re-GETs, and surface a save error for the assignment.
        // Clear lastSynced: offline-queue path may have advanced it to the dropped
        // body (never server-acked). Leaving it would make a later hard-fail PUT
        // dishonestly roll back to that dropped payload.
        lastSyncedStates[eventStaffId] = nil
        executionServerSeeded[eventStaffId] = false
        setExecutionError(
            tr(
                "team_portal.execution_save_error",
                "No pudimos guardar el checklist de ejecución."
            ),
            for: eventStaffId
        )
    }

    /// Offline flush successfully sent a queued mutation. Clear serverSeeded for
    /// matching execution-state endpoints so next open soft-revalidates against
    /// post-flush server truth. Do NOT wipe local cache (dirty or not).
    @MainActor
    private func handleOfflineMutationFlushed(_ notification: Notification) {
        guard
            let endpoint = notification.userInfo?[APIClient.offlineMutationFlushedEndpointKey] as? String,
            let eventStaffId = Self.eventStaffId(fromExecutionStateEndpoint: endpoint)
        else {
            return
        }
        executionServerSeeded[eventStaffId] = false
    }

    /// Parses `/staff/assignments/{eventStaffId}/execution-state`.
    static func eventStaffId(fromExecutionStateEndpoint endpoint: String) -> String? {
        let normalized = endpoint.hasPrefix("/") ? String(endpoint.dropFirst()) : endpoint
        let parts = normalized.split(separator: "/").map(String.init)
        // ["staff", "assignments", "{id}", "execution-state"]
        guard parts.count >= 4,
              parts[0] == "staff",
              parts[1] == "assignments",
              parts[3] == "execution-state" else {
            return nil
        }
        return parts[2]
    }

    /// Synchronously writes the local cache (UI source of truth) before any Task.
    ///
    /// No-op while load is not `.ready` so default-based mid-flight edits cannot
    /// seed the cache and race a GET. Caps `quickNote` at `maxQuickNoteLength`.
    /// While a legacy UserDefaults blob still exists, rewrites it to match so
    /// cold-start re-migrate cannot resurrect a stale snapshot.
    @MainActor
    public func applyLocalExecutionState(
        _ state: AssignmentExecutionState,
        for assignment: TeamMemberAssignment
    ) {
        let id = assignment.eventStaffId
        guard executionLoadStates[id] == .ready else { return }

        var next = state
        let lengthError = tr(
            "team_portal.quick_note_too_long",
            "La nota rápida no puede superar 2000 caracteres."
        )
        if next.quickNote.count > Self.maxQuickNoteLength {
            next.quickNote = String(next.quickNote.prefix(Self.maxQuickNoteLength))
            setExecutionError(lengthError, for: id)
        } else if executionErrorMessages[id] == lengthError {
            // User trimmed under the cap — drop only the length error.
            clearExecutionError(for: id)
        }
        executionStates[id] = next
        Self.rewriteLegacyIfPresent(eventId: assignment.eventId, state: next)
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
                    eventId: assignment.eventId,
                    state: stateToSave
                )
                if lastResult.isSuccess {
                    retriedAfterFailure = false
                    continue
                }

                // Cancellation is not a hard failure — stop drain without retry.
                if lastResult == .cancelled {
                    break
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
        eventId: String,
        state: AssignmentExecutionState
    ) async -> ExecutionPutResult {
        let legacyKey = Self.legacyDefaultsKey(eventId: eventId)
        do {
            _ = try await apiClient.putExecutionState(eventStaffId: id, state: state)
            // Always advance lastSynced for the written payload — even if a
            // concurrent local edit already moved the cache past `state`.
            lastSyncedStates[id] = state
            clearExecutionError(for: id)
            // Any durable server ack may drop leftover legacy for this event.
            UserDefaults.standard.removeObject(forKey: legacyKey)
            return .serverAcked
        } catch {
            if Self.isCancellationError(error) || Task.isCancelled {
                // Do not roll back or surface a banner for a cancelled PUT.
                return .cancelled
            }
            // Typed offline-queue acceptance (or legacy substring fallback).
            // Keep UI; rewrite legacy blob if still present so cold-start is fresh.
            if Self.isOfflineQueuedError(error) {
                lastSyncedStates[id] = state
                clearExecutionError(for: id)
                Self.rewriteLegacyIfPresent(eventId: eventId, state: state)
                return .offlineQueued
            }
            // Hard fail: roll memory back only when we have a real lastSynced
            // baseline (server-acked or offline-queued). If lastSynced is nil
            // (e.g. offline drop cleared it), keep the live cache — never invent
            // `.defaultState` or restore a dropped body.
            if executionStates[id] == state, let rollback = lastSyncedStates[id] {
                executionStates[id] = rollback
                Self.rewriteLegacyIfPresent(eventId: eventId, state: rollback)
            }
            setExecutionError(
                tr(
                    "team_portal.execution_save_error",
                    "No pudimos guardar el checklist de ejecución."
                ),
                for: id
            )
            return .failed
        }
    }

    @MainActor
    private func setExecutionError(_ message: String, for id: String) {
        executionErrorMessages[id] = message
    }

    @MainActor
    private func clearExecutionError(for id: String) {
        executionErrorMessages.removeValue(forKey: id)
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
            executionServerSeeded[id] = false
        }
    }

    /// Cancelled migrate/merge PUT: reset to idle without a banner so reopen re-GETs.
    /// Legacy UserDefaults is intentionally left intact.
    @MainActor
    private func resetExecutionLoadAfterCancelledMigrate(_ id: String) {
        cancelNoteDebounce(for: id)
        executionStates[id] = nil
        lastSyncedStates[id] = nil
        executionServerSeeded[id] = false
        executionLoadStates[id] = .idle
        clearExecutionError(for: id)
    }

    @MainActor
    private func cancelNoteDebounce(for id: String) {
        noteDebounceTasks[id]?.cancel()
        noteDebounceTasks[id] = nil
    }

    /// Detects the offline-queue acceptance path from `APIClient.put/post/patch`.
    /// Prefers typed `APIError.queuedOffline`; falls back to legacy Spanish
    /// substring only for older client builds still emitting `networkError`.
    static func isOfflineQueuedError(_ error: Error) -> Bool {
        guard let apiError = error as? APIError else { return false }
        if case .queuedOffline = apiError {
            return true
        }
        // Last-resort fallback for pre-typed queue errors still in flight.
        if case .networkError(let message) = apiError {
            return message.contains("se enviará automáticamente")
        }
        return false
    }

    /// Union-merge for checklist bools (OR) and richer non-empty quick note.
    /// When notes differ: prefer longer; equal length → prefer legacy (local
    /// migration progress). Never silently drop a distinct local note.
    static func mergeExecutionStates(
        server: AssignmentExecutionState,
        legacy: AssignmentExecutionState
    ) -> AssignmentExecutionState {
        let checklist = ExecutionChecklist(
            arrival: server.checklist.arrival || legacy.checklist.arrival,
            materials: server.checklist.materials || legacy.checklist.materials,
            closing: server.checklist.closing || legacy.checklist.closing
        )
        let serverNote = server.quickNote.trimmingCharacters(in: .whitespacesAndNewlines)
        let legacyNote = legacy.quickNote.trimmingCharacters(in: .whitespacesAndNewlines)
        let quickNote: String
        if serverNote.isEmpty {
            quickNote = legacy.quickNote
        } else if legacyNote.isEmpty {
            quickNote = server.quickNote
        } else if serverNote == legacyNote {
            quickNote = server.quickNote
        } else if legacyNote.count > serverNote.count {
            quickNote = legacy.quickNote
        } else if serverNote.count > legacyNote.count {
            quickNote = server.quickNote
        } else {
            // Equal length and different — prefer legacy (device migration intent).
            quickNote = legacy.quickNote
        }
        return AssignmentExecutionState(checklist: checklist, quickNote: quickNote)
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

    /// Persists the current cache shape into the pre-#875 UserDefaults blob.
    static func writeLegacyState(_ state: AssignmentExecutionState, forKey key: String) {
        let blob = LegacyExecutionState(
            arrivalReady: state.checklist.arrival,
            materialsReady: state.checklist.materials,
            closingDone: state.checklist.closing,
            quickNote: state.quickNote
        )
        guard let data = try? JSONEncoder().encode(blob) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    /// While a legacy key still exists, rewrite it so cold-start re-migrate is not stale.
    static func rewriteLegacyIfPresent(eventId: String, state: AssignmentExecutionState) {
        let key = legacyDefaultsKey(eventId: eventId)
        guard UserDefaults.standard.data(forKey: key) != nil else { return }
        writeLegacyState(state, forKey: key)
    }

    private func availabilityBounds(now: Date = Date()) -> (start: String, end: String) {
        let calendar = Calendar(identifier: .gregorian)
        let year = calendar.component(.year, from: now)
        return ("\(year - 1)-01-01", "\(year + 1)-12-31")
    }
}

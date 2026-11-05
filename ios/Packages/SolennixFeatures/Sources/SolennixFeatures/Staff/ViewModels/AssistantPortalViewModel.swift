import Foundation
import Observation
import SolennixCore
import SolennixNetwork

/// Read-only portal for the `assistant` (Secretario) role.
///
/// Surfaces only GET-backed data: upcoming-events agenda, per-event staffing
/// (staff + RSVP status + summary) and the staff directory. It exposes NO
/// mutations (no RSVP, checklist, availability) and never touches finances
/// or clients.
@Observable
public final class AssistantPortalViewModel {

    public var events: [Event] = []
    public var staffingByEvent: [String: [EventStaff]] = [:]
    public var staffingLoadingIds: Set<String> = []
    public var directory: [Staff] = []
    public var isLoading: Bool = false
    public var errorMessage: String?

    private let apiClient: APIClient

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    /// Loads the upcoming-events agenda and the staff directory.
    @MainActor
    public func load() async {
        isLoading = true
        errorMessage = nil

        do {
            async let eventsTask: [Event] = apiClient.getAll(Endpoint.upcomingEvents)
            async let directoryTask: [Staff] = apiClient.getAll(Endpoint.staff)
            let (loadedEvents, loadedDirectory) = try await (eventsTask, directoryTask)
            events = loadedEvents.sorted { $0.eventDate < $1.eventDate }
            directory = loadedDirectory.sorted {
                $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
            }
        } catch {
            errorMessage = tr(
                "staff.assistant.load_error_message",
                "No pudimos cargar el panel del secretario."
            )
        }

        isLoading = false
    }

    /// Loads the staffing roster for one event (GET, cached per event).
    @MainActor
    public func loadStaffing(eventId: String) async {
        guard staffingByEvent[eventId] == nil, !staffingLoadingIds.contains(eventId) else { return }
        staffingLoadingIds.insert(eventId)
        defer { staffingLoadingIds.remove(eventId) }

        do {
            let result: [EventStaff] = try await apiClient.get(Endpoint.eventStaff(eventId))
            staffingByEvent[eventId] = result.sorted {
                ($0.staffName ?? "").localizedCaseInsensitiveCompare($1.staffName ?? "") == .orderedAscending
            }
        } catch {
            errorMessage = tr(
                "staff.assistant.load_error_message",
                "No pudimos cargar el panel del secretario."
            )
        }
    }

    /// RSVP summary counts for an event's cached roster.
    public func summary(for eventId: String) -> (confirmed: Int, pending: Int, declined: Int, cancelled: Int) {
        let list = staffingByEvent[eventId] ?? []
        return (
            confirmed: list.filter { $0.assignmentStatus == .confirmed }.count,
            pending: list.filter { $0.assignmentStatus == .pending }.count,
            declined: list.filter { $0.assignmentStatus == .declined }.count,
            cancelled: list.filter { $0.assignmentStatus == .cancelled }.count
        )
    }
}

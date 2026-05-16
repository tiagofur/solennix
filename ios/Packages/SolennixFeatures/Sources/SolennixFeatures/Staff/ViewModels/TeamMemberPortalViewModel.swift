import Foundation
import Observation
import SolennixCore
import SolennixNetwork

@Observable
public final class TeamMemberPortalViewModel {

    public var assignments: [TeamMemberAssignment] = []
    public var isLoading: Bool = false
    public var isResponding: Bool = false
    public var errorMessage: String?

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
            let outcome = try await apiClient.respondAssignment(eventStaffId: assignment.id, response: response)
            assignments = assignments.map { item in
                guard item.id == assignment.id else { return item }
                return TeamMemberAssignment(
                    eventStaffId: item.eventStaffId,
                    eventId: item.eventId,
                    eventName: item.eventName,
                    eventDate: item.eventDate,
                    staffId: item.staffId,
                    status: outcome.finalStatus,
                    feeAmount: item.feeAmount,
                    roleOverride: item.roleOverride,
                    notes: item.notes,
                    shiftStart: item.shiftStart,
                    shiftEnd: item.shiftEnd,
                    offerGroupId: item.offerGroupId,
                    offerSlots: item.offerSlots,
                    notificationLastResult: item.notificationLastResult,
                    notificationSentAt: item.notificationSentAt
                )
            }
        } catch {
            errorMessage = "No pudimos actualizar tu respuesta."
        }

        isResponding = false
    }
}
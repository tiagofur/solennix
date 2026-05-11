import Foundation
import SolennixCore

private struct AssignmentResponseRequest: Encodable {
    let response: AssignmentPortalResponse
}

public extension APIClient {

    func getMyAssignments() async throws -> [TeamMemberAssignment] {
        try await get(Endpoint.staffMyAssignments)
    }

    func respondAssignment(
        eventStaffId: String,
        response: AssignmentPortalResponse
    ) async throws -> AssignmentResponseOutcome {
        try await post(
            Endpoint.staffRespondAssignment(eventStaffId),
            body: AssignmentResponseRequest(response: response)
        )
    }
}

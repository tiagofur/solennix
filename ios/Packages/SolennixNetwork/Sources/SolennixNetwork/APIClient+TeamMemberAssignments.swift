import Foundation
import SolennixCore

private struct AssignmentResponseRequest: Encodable {
    let response: AssignmentPortalResponse
}

private struct MarkTimelineReadRequest: Encodable {
    let ids: [String]
}

private struct CreateUnavailableDateRequest: Encodable {
    let startDate: String
    let endDate: String
    let startTime: String?
    let endTime: String?
    let reason: String?

    enum CodingKeys: String, CodingKey {
        case startDate = "start_date"
        case endDate = "end_date"
        case startTime = "start_time"
        case endTime = "end_time"
        case reason
    }
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

    func getMyTimeline(unreadOnly: Bool = false, limit: Int = 50) async throws -> [TeamMemberChangeEvent] {
        var params: [String: String] = ["limit": String(limit)]
        if unreadOnly {
            params["unread_only"] = "true"
        }
        return try await get(Endpoint.staffMyTimeline, params: params)
    }

    func markMyTimelineRead(ids: [String] = []) async throws -> TeamTimelineMarkReadResponse {
        try await post(Endpoint.staffMyTimelineRead, body: MarkTimelineReadRequest(ids: ids))
    }

    func getMyUnavailableDates(start: String, end: String) async throws -> [UnavailableDate] {
        try await get(Endpoint.unavailableDates, params: ["start": start, "end": end])
    }

    func createMyUnavailableDate(
        startDate: String,
        endDate: String,
        startTime: String?,
        endTime: String?,
        reason: String?
    ) async throws -> UnavailableDate {
        try await post(
            Endpoint.unavailableDates,
            body: CreateUnavailableDateRequest(
                startDate: startDate,
                endDate: endDate,
                startTime: startTime,
                endTime: endTime,
                reason: reason
            )
        )
    }

    func updateMyUnavailableDate(
        id: String,
        startDate: String,
        endDate: String,
        startTime: String?,
        endTime: String?,
        reason: String?
    ) async throws -> UnavailableDate {
        try await put(
            Endpoint.unavailableDate(id),
            body: CreateUnavailableDateRequest(
                startDate: startDate,
                endDate: endDate,
                startTime: startTime,
                endTime: endTime,
                reason: reason
            )
        )
    }

    func deleteMyUnavailableDate(id: String) async throws {
		try await delete(Endpoint.unavailableDate(id))
    }
}

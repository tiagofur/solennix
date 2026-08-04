import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Wire DTOs

private struct DataEnvelope<T: Decodable>: Decodable {
    let data: T
}

private struct UnreadCountPayload: Decodable {
    let count: Int
}

private struct OkPayload: Decodable {
    let ok: Bool?
}

private struct EmptyBody: Encodable {}

private struct RespondBody: Encodable {
    let quoteAmount: Double
    let currency: String
    let inclusions: [String]
    let validUntil: String?
    let message: String?
}

private struct DeclineBody: Encodable {
    let reason: String?
}

private struct ConvertPayload: Decodable {
    let eventId: String?
}

// MARK: - Status filter chips

public enum RequestsStatusFilter: String, CaseIterable, Identifiable, Sendable {
    case all
    case pending
    case responded
    case booked

    public var id: String { rawValue }

    var queryStatus: String? {
        switch self {
        case .all: return nil
        case .pending: return PublicRequestStatus.pending.rawValue
        case .responded: return PublicRequestStatus.responded.rawValue
        case .booked: return PublicRequestStatus.booked.rawValue
        }
    }

    var label: String {
        switch self {
        case .all: return RequestsStrings.filterAll
        case .pending: return RequestsStrings.filterPending
        case .responded: return RequestsStrings.filterResponded
        case .booked: return RequestsStrings.filterBooked
        }
    }
}

// MARK: - ViewModel

@Observable
public final class RequestsInboxViewModel {

    public var items: [PublicRequest] = []
    public var statusFilter: RequestsStatusFilter = .all
    public var isLoading: Bool = false
    public var isLoadingMore: Bool = false
    public var errorMessage: String?
    public var unreadCount: Int = 0
    public var hasMore: Bool = false

    public var selectedDetail: PublicRequestDetail?
    public var isLoadingDetail: Bool = false
    public var actionInFlight: Bool = false

    private var nextCursor: String?
    private let apiClient: APIClient
    private let pageLimit = 20

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - List

    @MainActor
    public func refresh() async {
        nextCursor = nil
        hasMore = false
        await load(reset: true)
        await refreshUnreadCount()
    }

    @MainActor
    public func applyFilter(_ filter: RequestsStatusFilter) async {
        guard filter != statusFilter else { return }
        statusFilter = filter
        nextCursor = nil
        items = []
        await load(reset: true)
    }

    @MainActor
    public func loadMoreIfNeeded(current item: PublicRequest) async {
        guard hasMore, !isLoadingMore, !isLoading else { return }
        guard let last = items.last, last.id == item.id else { return }
        await load(reset: false)
    }

    @MainActor
    private func load(reset: Bool) async {
        if reset {
            isLoading = true
            errorMessage = nil
        } else {
            isLoadingMore = true
        }

        var params: [String: String] = [
            "cursor": nextCursor ?? "",
            "limit": String(pageLimit),
            "pagination": "cursor",
        ]
        if let status = statusFilter.queryStatus {
            params["status"] = status
        }

        do {
            let page: CursorPaginatedResponse<PublicRequest> = try await apiClient.get(
                Endpoint.publicRequests,
                params: params
            )
            if reset {
                items = page.data
            } else {
                let existing = Set(items.map(\.id))
                items.append(contentsOf: page.data.filter { !existing.contains($0.id) })
            }
            nextCursor = page.nextCursor
            hasMore = page.hasMore
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
        isLoadingMore = false
    }

    @MainActor
    public func refreshUnreadCount() async {
        do {
            let envelope: DataEnvelope<UnreadCountPayload> = try await apiClient.get(
                Endpoint.publicRequestsUnreadCount
            )
            unreadCount = envelope.data.count
        } catch {
            // Badge is best-effort; list remains usable.
        }
    }

    // MARK: - Detail

    @MainActor
    public func loadDetail(id: String) async {
        isLoadingDetail = true
        errorMessage = nil
        do {
            let envelope: DataEnvelope<PublicRequestDetail> = try await apiClient.get(
                Endpoint.publicRequest(id)
            )
            selectedDetail = envelope.data
            if !envelope.data.request.isRead {
                await markRead(id: id)
            }
        } catch {
            errorMessage = mapError(error)
        }
        isLoadingDetail = false
    }

    @MainActor
    public func markRead(id: String) async {
        do {
            let _: DataEnvelope<OkPayload> = try await apiClient.post(
                Endpoint.publicRequestRead(id),
                body: EmptyBody()
            )
            if let idx = items.firstIndex(where: { $0.id == id }), !items[idx].isRead {
                let old = items[idx]
                items[idx] = withRead(old)
                if unreadCount > 0 { unreadCount -= 1 }
            }
            if let detail = selectedDetail, detail.request.id == id, !detail.request.isRead {
                selectedDetail = PublicRequestDetail(
                    request: withRead(detail.request),
                    responses: detail.responses
                )
            }
        } catch {
            // Non-blocking
        }
    }

    private func withRead(_ old: PublicRequest) -> PublicRequest {
        PublicRequest(
            id: old.id,
            contactEmail: old.contactEmail,
            contactName: old.contactName,
            eventType: old.eventType,
            eventDate: old.eventDate,
            location: old.location,
            guestCount: old.guestCount,
            budget: old.budget,
            currency: old.currency,
            services: old.services,
            message: old.message,
            status: old.status,
            isRead: true,
            eventId: old.eventId,
            declinedReason: old.declinedReason,
            lastStatusChange: old.lastStatusChange,
            createdAt: old.createdAt,
            updatedAt: old.updatedAt
        )
    }

    // MARK: - Actions

    /// Default quote validity: 7 days from today (YYYY-MM-DD), matching #1125 AC.
    public static func defaultValidUntil(from date: Date = Date()) -> String {
        let day = Calendar.current.date(byAdding: .day, value: 7, to: date) ?? date
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: day)
    }

    @MainActor
    public func respond(
        id: String,
        amount: Double,
        currency: String = "MXN",
        inclusions: [String] = [],
        validUntil: String? = nil,
        message: String?
    ) async -> Bool {
        guard !actionInFlight else { return false }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            let body = RespondBody(
                quoteAmount: amount,
                currency: currency.isEmpty ? "MXN" : currency,
                inclusions: inclusions,
                validUntil: validUntil ?? Self.defaultValidUntil(),
                message: message
            )
            let _: DataEnvelope<PublicResponse> = try await apiClient.post(
                Endpoint.publicRequestRespond(id),
                body: body
            )
            await loadDetail(id: id)
            await refresh()
            return true
        } catch {
            errorMessage = mapError(error)
            return false
        }
    }

    @MainActor
    public func requestInfo(id: String) async -> Bool {
        guard !actionInFlight else { return false }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            let _: DataEnvelope<OkPayload> = try await apiClient.post(
                Endpoint.publicRequestInfo(id),
                body: EmptyBody()
            )
            await loadDetail(id: id)
            await refresh()
            return true
        } catch {
            errorMessage = mapError(error)
            return false
        }
    }

    @MainActor
    public func decline(id: String, reason: String?) async -> Bool {
        guard !actionInFlight else { return false }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            let body = DeclineBody(reason: reason)
            let _: DataEnvelope<OkPayload> = try await apiClient.post(
                Endpoint.publicRequestDecline(id),
                body: body
            )
            await loadDetail(id: id)
            await refresh()
            return true
        } catch {
            errorMessage = mapError(error)
            return false
        }
    }

    @MainActor
    public func convertToEvent(id: String) async -> String? {
        guard !actionInFlight else { return nil }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            let envelope: DataEnvelope<ConvertPayload> = try await apiClient.post(
                Endpoint.publicRequestConvert(id),
                body: EmptyBody()
            )
            await loadDetail(id: id)
            await refresh()
            return envelope.data.eventId
        } catch {
            errorMessage = mapError(error)
            return nil
        }
    }
}

// MARK: - Error mapping

private func mapError(_ error: Error) -> String {
    if let apiError = error as? APIError {
        switch apiError {
        case .networkError(let msg): return msg
        case .serverError(_, let msg): return msg
        case .decodingError: return RequestsStrings.decodingError
        case .unauthorized: return RequestsStrings.unauthorizedError
        default: return apiError.errorDescription ?? RequestsStrings.unknownError
        }
    }
    return error.localizedDescription
}

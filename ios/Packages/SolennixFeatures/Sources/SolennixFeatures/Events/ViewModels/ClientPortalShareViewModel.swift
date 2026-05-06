import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Create / Rotate Body

/// POST body for `/events/{id}/public-link`. Omitting `ttlDays` creates a
/// link that never expires; any value 1…730 sets an expiration.
/// `APIClient` encodes `ttlDays` → `ttl_days` automatically via the
/// `.convertToSnakeCase` encoding strategy.
private struct CreatePublicLinkBody: Encodable {
    let ttlDays: Int?
}

// MARK: - Client Portal Share View Model

/// Manages the organizer-facing share flow for the client portal link of a
/// single event (PRD/12 feature A). Mirrors the web component
/// `ClientPortalShareCard.tsx` — three UI states:
///   * `isLoading`     — initial fetch in flight
///   * `link != nil`   — show URL + copy / share / rotate / revoke actions
///   * `link == nil`   — show the "Generate link" CTA
///
/// The 404 returned by `GET /public-link` when no active link exists is
/// treated as a normal empty state, NOT as an error.
@MainActor
@Observable
public final class ClientPortalShareViewModel {

    // MARK: - Public State

    public var link: EventPublicLink?
    /// `true` while the initial fetch is running (first paint only).
    public var isLoading: Bool = true
    /// `true` while a mutating action (create/rotate/revoke) is in flight.
    public var isBusy: Bool = false
    public var errorMessage: String?

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let eventId: String

    // MARK: - Init

    public init(apiClient: APIClient, eventId: String) {
        self.apiClient = apiClient
        self.eventId = eventId
    }

    // MARK: - Refresh

    /// Fetches the currently active link. A 404 means "no link yet" and
    /// leaves `link` as `nil` without surfacing an error. Any other failure
    /// is stored in `errorMessage` so the view can surface a toast/alert.
    @MainActor
    public func refresh() async {
        isLoading = true
        errorMessage = nil
        do {
            let fetched: EventPublicLink = try await apiClient.get(
                Endpoint.eventPublicLink(eventId)
            )
            link = fetched
        } catch let apiError as APIError {
            if case .serverError(let statusCode, _) = apiError, statusCode == 404 {
                // Normal empty state — organizer hasn't generated a link yet.
                link = nil
            } else {
                link = nil
                errorMessage = apiError.errorDescription
            }
        } catch {
            link = nil
            errorMessage = ClientPortalShareStrings.loadError
        }
        isLoading = false
    }

    // MARK: - Create or Rotate

    /// Creates a new active link, revoking the previous one if present.
    /// Same endpoint covers first-time creation and rotation — the
    /// backend invalidates any prior link atomically.
    /// - Parameter ttlDays: 1…730 to set an expiration, `nil` for a
    ///   never-expiring link (organizer can still revoke manually).
    /// - Returns: `true` on success, `false` otherwise.
    @MainActor
    @discardableResult
    public func createOrRotate(ttlDays: Int? = nil) async -> Bool {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }

        do {
            let body = CreatePublicLinkBody(ttlDays: ttlDays)
            let created: EventPublicLink = try await apiClient.post(
                Endpoint.eventPublicLink(eventId),
                body: body
            )
            link = created
            return true
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription
            return false
        } catch {
            errorMessage = ClientPortalShareStrings.generateError
            return false
        }
    }

    // MARK: - Revoke

    /// Revokes the currently active link. Backend responds 204 and
    /// subsequent `GET`s will return 404 until a new link is generated.
    /// - Returns: `true` on success, `false` otherwise.
    @MainActor
    @discardableResult
    public func revoke() async -> Bool {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }

        do {
            try await apiClient.delete(Endpoint.eventPublicLink(eventId))
            link = nil
            return true
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription
            return false
        } catch {
            errorMessage = ClientPortalShareStrings.disableError
            return false
        }
    }
}

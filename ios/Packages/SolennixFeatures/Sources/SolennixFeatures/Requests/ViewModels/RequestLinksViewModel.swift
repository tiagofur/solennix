import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Create Link Request

struct CreatePublicRequestLinkBody: Encodable, Sendable {
    let label: String?
    let ttlDays: Int?
    let maxUses: Int?
    let submitMode: String
}

// MARK: - Request Links View Model

@Observable
public final class RequestLinksViewModel {

    public var links: [PublicRequestLink] = []
    public var isLoading: Bool = false
    public var isGenerating: Bool = false
    public var errorMessage: String?

    private let apiClient: APIClient

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    @MainActor
    public func loadLinks() async {
        isLoading = true
        errorMessage = nil

        do {
            let result: [PublicRequestLink] = try await apiClient.getAll(Endpoint.publicRequestLinks)
            links = result.sorted { $0.createdAt > $1.createdAt }
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    @MainActor
    public func generateLink(
        label: String?,
        ttlDays: Int?,
        maxUses: Int?,
        submitMode: RequestLinkSubmitMode = .autoEvent
    ) async {
        isGenerating = true
        errorMessage = nil

        do {
            let trimmed = label?.trimmingCharacters(in: .whitespacesAndNewlines)
            let body = CreatePublicRequestLinkBody(
                label: (trimmed?.isEmpty == true) ? nil : trimmed,
                ttlDays: ttlDays,
                maxUses: maxUses,
                submitMode: submitMode.rawValue
            )
            let newLink: PublicRequestLink = try await apiClient.post(
                Endpoint.publicRequestLinks,
                body: body
            )
            links.insert(newLink, at: 0)
        } catch {
            errorMessage = mapError(error)
        }

        isGenerating = false
    }

    @MainActor
    public func deleteLink(id: String) async {
        errorMessage = nil
        do {
            try await apiClient.delete(Endpoint.publicRequestLink(id))
            links.removeAll { $0.id == id }
        } catch {
            errorMessage = mapError(error)
        }
    }

    public func displayStatus(for link: PublicRequestLink) -> String {
        switch effectiveStatus(for: link) {
        case "active": return RequestsStrings.linkStatusActive
        case "used": return RequestsStrings.linkStatusUsed
        case "expired": return RequestsStrings.linkStatusExpired
        case "revoked": return RequestsStrings.linkStatusRevoked
        default: return link.status.capitalized
        }
    }

    public func effectiveStatus(for link: PublicRequestLink) -> String {
        if link.status == "active", isExpired(link) {
            return "expired"
        }
        return link.status
    }

    public func isExpired(_ link: PublicRequestLink) -> Bool {
        guard let expiresAt = link.expiresAt, !expiresAt.isEmpty else { return false }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let expiresDate = formatter.date(from: expiresAt) {
            return expiresDate < Date()
        }
        formatter.formatOptions = [.withInternetDateTime]
        if let expiresDate = formatter.date(from: expiresAt) {
            return expiresDate < Date()
        }
        return false
    }

    public func displaySubmitMode(_ mode: String) -> String {
        switch RequestLinkSubmitMode(rawValue: mode) ?? .autoEvent {
        case .standard: return RequestsStrings.linkModeStandard
        case .autoQuote: return RequestsStrings.linkModeAutoQuote
        case .autoEvent: return RequestsStrings.linkModeAutoEvent
        }
    }

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? RequestsStrings.linkErrorUnexpected
        }
        return RequestsStrings.linkErrorUnexpectedRetry
    }
}

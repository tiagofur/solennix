import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Create Link Request

private struct CreateEventFormLinkRequest: Encodable {
    let label: String?
    let ttlDays: Int
}

// MARK: - Event Form Links View Model

@Observable
public final class EventFormLinksViewModel {

    // MARK: - Properties

    public var links: [EventFormLink] = []
    public var isLoading: Bool = false
    public var isGenerating: Bool = false
    public var errorMessage: String?

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Data Loading

    @MainActor
    public func loadLinks() async {
        isLoading = true
        errorMessage = nil

        do {
            let result: [EventFormLink] = try await apiClient.getAll(Endpoint.eventFormLinks)
            links = result.sorted { $0.createdAt > $1.createdAt }
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Generate Link

    @MainActor
    public func generateLink(label: String?, ttlDays: Int) async {
        isGenerating = true
        errorMessage = nil

        do {
            let body = CreateEventFormLinkRequest(
                label: label?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true ? nil : label?.trimmingCharacters(in: .whitespacesAndNewlines),
                ttlDays: ttlDays
            )
            let newLink: EventFormLink = try await apiClient.post(Endpoint.eventFormLinks, body: body)
            links.insert(newLink, at: 0)
        } catch {
            errorMessage = mapError(error)
        }

        isGenerating = false
    }

    // MARK: - Delete Link

    @MainActor
    public func deleteLink(id: String) async {
        do {
            try await apiClient.delete(Endpoint.eventFormLink(id))
            links.removeAll { $0.id == id }
        } catch {
            errorMessage = mapError(error)
        }
    }

    // MARK: - Helpers

    /// Returns a localized display status for the link.
    public func displayStatus(for link: EventFormLink) -> String {
        switch link.status {
        case "active":
            // Check if expired by date
            if isExpired(link) {
                return "Expirado"
            }
            return "Activo"
        case "used":
            return "Usado"
        case "expired":
            return "Expirado"
        default:
            return link.status.capitalized
        }
    }

    /// Returns the effective status considering expiration date.
    public func effectiveStatus(for link: EventFormLink) -> String {
        if link.status == "active" && isExpired(link) {
            return "expired"
        }
        return link.status
    }

    /// Whether the link has passed its expiration date.
    public func isExpired(_ link: EventFormLink) -> Bool {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let expiresDate = formatter.date(from: link.expiresAt) {
            return expiresDate < Date()
        }
        // Try without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        if let expiresDate = formatter.date(from: link.expiresAt) {
            return expiresDate < Date()
        }
        return false
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? "Ocurrió un error inesperado."
        }
        return "Ocurrió un error inesperado. Intenta de nuevo."
    }
}

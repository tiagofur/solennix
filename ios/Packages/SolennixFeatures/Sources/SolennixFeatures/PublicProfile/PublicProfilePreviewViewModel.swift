import Foundation
import Observation
import SolennixCore
import SolennixNetwork

private struct DataEnvelope<T: Decodable>: Decodable {
    let data: T
}

@Observable
public final class PublicProfilePreviewViewModel {

    public private(set) var profile: PublicOrganizerProfile?
    public private(set) var isLoading = false
    public private(set) var notFound = false
    public var errorMessage: String?

    private let apiClient: APIClient
    private let slug: String

    public init(apiClient: APIClient, slug: String) {
        self.apiClient = apiClient
        self.slug = slug.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    @MainActor
    public func load() async {
        guard !slug.isEmpty else {
            notFound = true
            return
        }
        isLoading = true
        notFound = false
        errorMessage = nil
        do {
            let envelope: DataEnvelope<PublicOrganizerProfile> = try await apiClient.get(
                Endpoint.publicOrganizer(slug)
            )
            profile = envelope.data
        } catch let api as APIError {
            switch api {
            case .serverError(let code, _) where code == 404:
                notFound = true
            case .networkError(let msg):
                errorMessage = msg
            case .serverError(_, let msg):
                errorMessage = msg
            default:
                errorMessage = api.errorDescription
                    ?? FeatureL10n.text("public_profile.preview.error", "No se pudo cargar el perfil")
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

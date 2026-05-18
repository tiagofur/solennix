import Foundation
import Observation
import SolennixCore
import SolennixNetwork

private struct DataEnvelope<T: Decodable>: Decodable {
    let data: T
}

private struct UpdateReviewResponseRequest: Encodable {
    let response: String?
}

private struct UpdateReviewVisibilityRequest: Encodable {
    let visibility: EventReviewVisibility
}

@Observable
public final class ReviewsViewModel {

    public var reviews: [EventReview] = []
    public var isLoading: Bool = false
    public var errorMessage: String?
    public var savingResponseId: String?
    public var updatingVisibilityId: String?

    private let apiClient: APIClient

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    @MainActor
    public func fetchReviews() async {
        isLoading = true
        errorMessage = nil

        do {
            let result: [EventReview] = try await apiClient.getAll(Endpoint.reviews)
            reviews = result
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    @MainActor
    public func saveResponse(reviewId: String, text: String) async {
        savingResponseId = reviewId
        errorMessage = nil

        do {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            let payload = UpdateReviewResponseRequest(response: trimmed.isEmpty ? nil : trimmed)
            let response: DataEnvelope<EventReview> = try await apiClient.patch(
                Endpoint.reviewResponse(reviewId),
                body: payload
            )
            replace(response.data)
        } catch {
            errorMessage = mapError(error)
        }

        savingResponseId = nil
    }

    @MainActor
    public func updateVisibility(reviewId: String, visibility: EventReviewVisibility) async {
        updatingVisibilityId = reviewId
        errorMessage = nil

        do {
            let payload = UpdateReviewVisibilityRequest(visibility: visibility)
            let response: DataEnvelope<EventReview> = try await apiClient.patch(
                Endpoint.reviewVisibility(reviewId),
                body: payload
            )
            replace(response.data)
        } catch {
            errorMessage = mapError(error)
        }

        updatingVisibilityId = nil
    }

    private func replace(_ updated: EventReview) {
        if let idx = reviews.firstIndex(where: { $0.id == updated.id }) {
            reviews[idx] = updated
        }
    }

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? FeatureL10n.text("common.error.unexpected", "Ocurrió un error inesperado.")
        }
        return FeatureL10n.text("common.error.retry", "Ocurrió un error inesperado. Intenta de nuevo.")
    }
}

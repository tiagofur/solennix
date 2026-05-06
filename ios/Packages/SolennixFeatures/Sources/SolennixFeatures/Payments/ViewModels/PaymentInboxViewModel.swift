import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Review Request

private struct ReviewPaymentSubmissionRequest: Encodable {
    let status: String
    let rejectionReason: String?
}

// MARK: - View Model

@Observable
public final class PaymentInboxViewModel {

    // MARK: - State

    public var submissions: [PaymentSubmission] = []
    public var isLoading: Bool = false
    public var errorMessage: String?

    /// ID currently being approved — drives row loading indicator
    public var approvingId: String? = nil
    /// ID currently being rejected
    public var rejectingId: String? = nil

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Data Loading

    @MainActor
    public func fetchSubmissions() async {
        isLoading = true
        errorMessage = nil
        do {
            let result: [PaymentSubmission] = try await apiClient.getAll(
                Endpoint.paymentSubmissionsInbox
            )
            submissions = result
        } catch {
            errorMessage = mapError(error)
        }
        isLoading = false
    }

    // MARK: - Actions

    @MainActor
    public func approve(id: String) async {
        approvingId = id
        errorMessage = nil
        do {
            let body = ReviewPaymentSubmissionRequest(status: "approved", rejectionReason: nil)
            let updated: PaymentSubmission = try await apiClient.patch(
                Endpoint.paymentSubmission(id),
                body: body
            )
            updateSubmission(updated)
        } catch {
            errorMessage = mapError(error)
        }
        approvingId = nil
    }

    @MainActor
    public func reject(id: String, reason: String) async {
        rejectingId = id
        errorMessage = nil
        do {
            let body = ReviewPaymentSubmissionRequest(status: "rejected", rejectionReason: reason)
            let updated: PaymentSubmission = try await apiClient.patch(
                Endpoint.paymentSubmission(id),
                body: body
            )
            updateSubmission(updated)
        } catch {
            errorMessage = mapError(error)
        }
        rejectingId = nil
    }

    // MARK: - Helpers

    private func updateSubmission(_ updated: PaymentSubmission) {
        if let index = submissions.firstIndex(where: { $0.id == updated.id }) {
            submissions[index] = updated
        }
    }
}

// MARK: - Error mapping (mirrors pattern from other ViewModels)

private func mapError(_ error: Error) -> String {
    if let apiError = error as? APIError {
        switch apiError {
        case .networkError(let msg): return msg
        case .serverError(_, let msg): return msg
        case .decodingError: return "Error procesando respuesta"
        case .unauthorized: return "Sesión expirada"
        default: return apiError.errorDescription ?? "Error desconocido"
        }
    }
    return error.localizedDescription
}

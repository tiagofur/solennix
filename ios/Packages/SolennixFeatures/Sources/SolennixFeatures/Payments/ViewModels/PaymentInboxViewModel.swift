import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Review Request

private struct ReviewPaymentSubmissionRequest: Encodable {
    let status: String
    let rejectionReason: String?
}

private struct DataEnvelope<T: Decodable>: Decodable {
    let data: T
}

// MARK: - View Model

@Observable
public final class PaymentInboxViewModel {

    // MARK: - State

    public var submissions: [PaymentSubmission] = []
    public var isLoading: Bool = false
    public var isPlanLocked: Bool = false
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
        isPlanLocked = false
        errorMessage = nil
        do {
            let result: [PaymentSubmission] = try await apiClient.getAll(
                Endpoint.paymentSubmissionsInbox
            )
            submissions = result
        } catch {
            let raw = mapError(error)
            if isProOnlyError(raw) {
                isPlanLocked = true
                submissions = []
                errorMessage = nil
            } else {
                errorMessage = raw
            }
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
            let response: DataEnvelope<PaymentSubmission> = try await apiClient.patch(
                Endpoint.paymentSubmission(id),
                body: body
            )
            updateSubmission(response.data)
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
            let response: DataEnvelope<PaymentSubmission> = try await apiClient.patch(
                Endpoint.paymentSubmission(id),
                body: body
            )
            updateSubmission(response.data)
        } catch {
            errorMessage = mapError(error)
        }
        rejectingId = nil
    }

    // MARK: - Helpers

    private func updateSubmission(_ updated: PaymentSubmission) {
        // Organizer inbox should only show pending submissions.
        if updated.status == .pending {
            if let index = submissions.firstIndex(where: { $0.id == updated.id }) {
                submissions[index] = updated
            }
        } else {
            submissions.removeAll { $0.id == updated.id }
        }
    }
}

private func isProOnlyError(_ message: String) -> Bool {
    let lowered = message.lowercased()
    return lowered.contains("pro-exclusive") || lowered.contains("paid plan") || lowered.contains("upgrade")
}

// MARK: - Error mapping (mirrors pattern from other ViewModels)

private func mapError(_ error: Error) -> String {
    let strings = paymentInboxL10n()
    if let apiError = error as? APIError {
        switch apiError {
        case .networkError(let msg): return msg
        case .serverError(_, let msg): return msg
        case .decodingError: return strings.decodingError
        case .unauthorized: return strings.unauthorized
        default: return apiError.errorDescription ?? strings.unknownError
        }
    }
    return error.localizedDescription
}

private struct PaymentInboxL10n {
    let decodingError: String
    let unauthorized: String
    let unknownError: String
}

private func paymentInboxL10n() -> PaymentInboxL10n {
    let lang = Locale.current.language.languageCode?.identifier ?? "es"
    if lang.hasPrefix("es") {
        return PaymentInboxL10n(
            decodingError: "Error procesando respuesta",
            unauthorized: "Sesion expirada",
            unknownError: "Error desconocido"
        )
    }

    return PaymentInboxL10n(
        decodingError: "Error processing response",
        unauthorized: "Session expired",
        unknownError: "Unknown error"
    )
}

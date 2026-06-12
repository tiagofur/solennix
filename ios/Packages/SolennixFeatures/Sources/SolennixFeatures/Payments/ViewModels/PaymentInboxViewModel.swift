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
    public var searchText: String = ""
    public var isLoading: Bool = false
    public var isPlanLocked: Bool = false
    public var errorMessage: String?

    // MARK: - Filtered

    /// Submissions filtered by the current `searchText` (client name, case- and diacritic-insensitive).
    public var filteredSubmissions: [PaymentSubmission] {
        guard !searchText.trimmingCharacters(in: .whitespaces).isEmpty else { return submissions }
        return submissions.filter { submission in
            (submission.clientName ?? "").localizedStandardContains(searchText)
                || (submission.eventLabel ?? "").localizedStandardContains(searchText)
        }
    }

    /// ID currently being approved — drives row loading indicator
    public var approvingId: String? = nil
    /// ID currently being rejected
    public var rejectingId: String? = nil
    /// ID currently being downloaded
    public var downloadingReceiptId: String? = nil

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

    @MainActor
    public func downloadReceipt(for submission: PaymentSubmission) async {
        guard let receiptPath = submission.receiptFileUrl else { return }

        downloadingReceiptId = submission.id
        errorMessage = nil
        do {
            let receiptData = try await apiClient.getData(receiptPath)
            let suggestedName = URL(string: receiptPath)?.lastPathComponent ?? "receipt-\(submission.id)"
            let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(suggestedName)
            try receiptData.write(to: fileURL, options: .atomic)
            try EventPDFFileService.presentShareSheet(fileURL: fileURL)
        } catch {
            errorMessage = mapError(error)
        }
        downloadingReceiptId = nil
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
    if let apiError = error as? APIError {
        switch apiError {
        case .networkError(let msg): return msg
        case .serverError(_, let msg): return msg
        case .decodingError: return PaymentsStrings.decodingError
        case .unauthorized: return PaymentsStrings.unauthorizedError
        default: return apiError.errorDescription ?? PaymentsStrings.unknownError
        }
    }
    return error.localizedDescription
}

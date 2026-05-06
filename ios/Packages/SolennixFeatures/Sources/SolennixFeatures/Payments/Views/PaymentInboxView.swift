import SwiftUI
import SolennixCore
import SolennixNetwork
import SolennixDesign

// MARK: - Payment Inbox View

/// Organizer inbox for reviewing client payment submissions.
/// Shows pending (and historical) transfer receipts with approve / reject actions.
public struct PaymentInboxView: View {

    // MARK: - State

    @State private var viewModel: PaymentInboxViewModel
    @State private var rejectTarget: PaymentSubmission? = nil
    @State private var rejectionReason: String = ""
    @State private var showRejectSheet = false

    // MARK: - Init

    public init(apiClient: APIClient) {
        _viewModel = State(wrappedValue: PaymentInboxViewModel(apiClient: apiClient))
    }

    // MARK: - Body

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.submissions.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.submissions.isEmpty {
                emptyState
            } else {
                submissionList
            }
        }
        .navigationTitle("Comprobantes")
        .navigationBarTitleDisplayMode(.large)
        .task { await viewModel.fetchSubmissions() }
        .refreshable { await viewModel.fetchSubmissions() }
        .sheet(isPresented: $showRejectSheet) {
            rejectSheet
        }
        .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    // MARK: - Submission List

    private var submissionList: some View {
        List {
            ForEach(viewModel.submissions) { submission in
                submissionRow(submission)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    @ViewBuilder
    private func submissionRow(_ submission: PaymentSubmission) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header row
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(submission.clientName ?? "Cliente")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.textPrimary)
                    Text(submission.eventLabel ?? "Evento")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                Spacer()
                statusBadge(for: submission.status)
            }

            // Amount + reference
            HStack(spacing: 16) {
                Label(formatAmount(submission.amount), systemImage: "dollarsign.circle.fill")
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.primary)
                if let ref = submission.transferRef {
                    Label(ref, systemImage: "number")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .lineLimit(1)
                }
            }

            // Submitted date
            Text(formatDate(submission.submittedAt))
                .font(.caption2)
                .foregroundStyle(SolennixColors.textTertiary)

            // Receipt link
            if let urlString = submission.receiptFileUrl,
               let url = URL(string: urlString) {
                Link(destination: url) {
                    Label("Ver comprobante", systemImage: "paperclip")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.info)
                }
            }

            // Rejection reason
            if submission.status == .rejected, let reason = submission.rejectionReason {
                Text("Motivo: \(reason)")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .padding(.top, 2)
            }

            // Action buttons (only for pending)
            if submission.status == .pending {
                HStack(spacing: 12) {
                    // Approve
                    Button {
                        Task { await viewModel.approve(id: submission.id) }
                    } label: {
                        if viewModel.approvingId == submission.id {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Label("Aprobar", systemImage: "checkmark.circle.fill")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(SolennixColors.success)
                    .disabled(viewModel.approvingId != nil || viewModel.rejectingId != nil)

                    // Reject
                    Button {
                        rejectTarget = submission
                        rejectionReason = ""
                        showRejectSheet = true
                    } label: {
                        Label("Rechazar", systemImage: "xmark.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(SolennixColors.error)
                    .disabled(viewModel.approvingId != nil || viewModel.rejectingId != nil)
                }
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Status Badge

    @ViewBuilder
    private func statusBadge(for status: PaymentSubmissionStatus) -> some View {
        let (label, color): (String, Color) = {
            switch status {
            case .pending:  return ("Pendiente", SolennixColors.warning)
            case .approved: return ("Aprobado",  SolennixColors.success)
            case .rejected: return ("Rechazado", SolennixColors.error)
            }
        }()
        Text(label)
            .font(.caption2)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }

    // MARK: - Reject Sheet

    private var rejectSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                if let target = rejectTarget {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(target.clientName ?? "Cliente")
                            .font(.headline)
                        Text(formatAmount(target.amount))
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Motivo del rechazo")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    TextEditor(text: $rejectionReason)
                        .frame(minHeight: 120)
                        .padding(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(SolennixColors.border, lineWidth: 1)
                        )
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Rechazar comprobante")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { showRejectSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Rechazar") {
                        guard let target = rejectTarget,
                              rejectionReason.count >= 10 else { return }
                        Task {
                            await viewModel.reject(id: target.id, reason: rejectionReason)
                            showRejectSheet = false
                        }
                    }
                    .disabled(rejectionReason.count < 10 || viewModel.rejectingId != nil)
                    .foregroundStyle(SolennixColors.error)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray.fill")
                .font(.largeTitle)
                .foregroundStyle(SolennixColors.textTertiary)
            Text("Sin comprobantes pendientes")
                .font(.headline)
                .foregroundStyle(SolennixColors.textSecondary)
            Text("Cuando un cliente envíe un comprobante de transferencia, aparecerá aquí para tu revisión.")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Formatting

    private func formatAmount(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }

    private func formatDate(_ isoString: String) -> String {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoFormatter.date(from: isoString) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.timeStyle = .short
            formatter.locale = Locale(identifier: "es_MX")
            return formatter.string(from: date)
        }
        return isoString
    }
}

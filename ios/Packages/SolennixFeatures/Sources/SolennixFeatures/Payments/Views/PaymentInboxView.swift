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
    @State private var selectedSubmission: PaymentSubmission? = nil
    @Environment(\.horizontalSizeClass) var horizontalSizeClass

    private var isRegularWidth: Bool { horizontalSizeClass == .regular }

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
            } else if viewModel.isPlanLocked {
                planLockedState
            } else if viewModel.submissions.isEmpty {
                emptyState
            } else {
                submissionContent
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(PaymentsStrings.title)
        .navigationBarTitleDisplayMode(.large)
        .task { await viewModel.fetchSubmissions() }
        .refreshable { await viewModel.fetchSubmissions() }
        .sheet(item: $selectedSubmission) { submission in
            submissionDetailSheet(submission)
        }
        .sheet(isPresented: $showRejectSheet) {
            rejectSheet
        }
        .alert(PaymentsStrings.errorTitle, isPresented: .constant(viewModel.errorMessage != nil)) {
            Button(PaymentsStrings.errorOk) { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    // MARK: - Submission Content

    private var submissionContent: some View {
        ScrollView {
            if isRegularWidth {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: Spacing.sm) {
                    ForEach(viewModel.submissions) { submission in
                        PaymentSubmissionCardView(submission: submission) {
                            selectedSubmission = submission
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.lg)
            } else {
                LazyVStack(spacing: Spacing.sm) {
                    ForEach(viewModel.submissions) { submission in
                        PaymentSubmissionCardView(submission: submission) {
                            selectedSubmission = submission
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.xxl)
            }
        }
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Submission Detail Sheet

    private func submissionDetailSheet(_ submission: PaymentSubmission) -> some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(submission.clientName ?? PaymentsStrings.clientPlaceholder)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.text)

                        Text(submission.eventLabel ?? PaymentsStrings.eventPlaceholder)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)

                        PaymentSubmissionStatusBadge(status: submission.status)
                    }

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Label(CommonFormatting.currencyMXN(submission.amount), systemImage: "dollarsign.circle.fill")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)

                        if let ref = submission.transferRef, !ref.isEmpty {
                            Label(ref, systemImage: "number")
                                .font(.subheadline)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        Label(CommonFormatting.dateTimeFromISO(submission.submittedAt), systemImage: "calendar")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    if submission.receiptFileUrl != nil {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text(PaymentsStrings.receiptHeader)
                                .font(.headline)
                                .foregroundStyle(SolennixColors.text)

                            receiptFallback

                            Button {
                                Task {
                                    await viewModel.downloadReceipt(for: submission)
                                }
                            } label: {
                                if viewModel.downloadingReceiptId == submission.id {
                                    ProgressView()
                                        .frame(maxWidth: .infinity)
                                } else {
                                    Label(PaymentsStrings.openReceipt, systemImage: "paperclip")
                                        .font(.subheadline)
                                        .frame(maxWidth: .infinity)
                                }
                            }
                            .buttonStyle(.bordered)
                            .disabled(viewModel.downloadingReceiptId != nil)
                        }
                    }

                    if submission.status == .rejected,
                       let reason = submission.rejectionReason,
                       !reason.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text(PaymentsStrings.rejectionReasonHeader)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.text)
                            Text(reason)
                                .font(.subheadline)
                                .foregroundStyle(SolennixColors.error)
                        }
                    }

                    if submission.status == .pending {
                        PaymentSubmissionActionBar(
                            submissionId: submission.id,
                            approvingId: viewModel.approvingId,
                            rejectingId: viewModel.rejectingId,
                            onApprove: {
                                Task {
                                    await viewModel.approve(id: submission.id)
                                    selectedSubmission = nil
                                }
                            },
                            onReject: {
                                selectedSubmission = nil
                                Task { @MainActor in
                                    try? await Task.sleep(for: .milliseconds(200))
                                    rejectTarget = submission
                                    rejectionReason = ""
                                    showRejectSheet = true
                                }
                            }
                        )
                    }
                }
                .padding(Spacing.lg)
            }
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle(PaymentsStrings.detailTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(PaymentsStrings.actionClose) { selectedSubmission = nil }
                }
            }
        }
    }

    private var receiptFallback: some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: "doc.text.image")
                .font(.largeTitle)
                .foregroundStyle(SolennixColors.textTertiary)
            Text(PaymentsStrings.receiptFallback)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity, minHeight: 180)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Reject Sheet

    private var rejectSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                if let target = rejectTarget {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(target.clientName ?? PaymentsStrings.clientPlaceholder)
                            .font(.headline)
                        Text(CommonFormatting.currencyMXN(target.amount))
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(PaymentsStrings.rejectReasonLabel)
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
            .navigationTitle(PaymentsStrings.rejectTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(PaymentsStrings.actionCancel) { showRejectSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(PaymentsStrings.actionReject) {
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

    // MARK: - Plan Locked State

    private var planLockedState: some View {
        EmptyStateView(
            icon: "lock.fill",
            title: PaymentsStrings.proOnlyTitle,
            message: PaymentsStrings.proOnlyMessage
        )
    }

    // MARK: - Empty State

    private var emptyState: some View {
        EmptyStateView(
            icon: "checkmark.seal",
            title: PaymentsStrings.emptyTitle,
            message: PaymentsStrings.emptyMessage,
            actionTitle: PaymentsStrings.actionRefresh
        ) {
            Task { await viewModel.fetchSubmissions() }
        }
    }

}

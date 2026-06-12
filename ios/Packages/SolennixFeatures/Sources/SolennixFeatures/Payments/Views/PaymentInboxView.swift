import SwiftUI
import SolennixCore
import SolennixNetwork
import SolennixDesign

// MARK: - Sheet State

/// Single source of truth for all modal presentations — eliminates the two-sheet dance
/// and the 200 ms Task.sleep hack (Fix 4).
private enum PaymentSheetState: Identifiable {
    case detail(PaymentSubmission)
    case reject(PaymentSubmission)

    var id: String {
        switch self {
        case .detail(let s): return "detail-\(s.id)"
        case .reject(let s): return "reject-\(s.id)"
        }
    }
}

// MARK: - Payment Inbox View

/// Organizer inbox for reviewing client payment submissions.
/// Shows pending (and historical) transfer receipts with approve / reject actions.
public struct PaymentInboxView: View {

    // MARK: - State

    @State private var viewModel: PaymentInboxViewModel
    @State private var sheetState: PaymentSheetState? = nil   // Fix 4: single sheet enum
    @State private var rejectionReason: String = ""
    @State private var approveCounter: Int = 0                 // Fix 9: sensory feedback counter
    @State private var rejectCounter: Int = 0
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(ToastManager.self) private var toastManager

    private var isRegularWidth: Bool { horizontalSizeClass == .regular }

    // MARK: - Init

    public init(apiClient: APIClient) {
        _viewModel = State(wrappedValue: PaymentInboxViewModel(apiClient: apiClient))
    }

    // MARK: - Body

    public var body: some View {
        Group {
            if isRegularWidth {
                submissionContent
            } else {
                iPhoneListContent
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(PaymentsStrings.title)
        .navigationBarTitleDisplayMode(.large)
        .solennixSearchable(text: $viewModel.searchText, prompt: PaymentsStrings.searchPrompt)  // Fix 6
        .task { await viewModel.fetchSubmissions() }
        .refreshable { await viewModel.fetchSubmissions() }
        // Fix 4: single .sheet(item:) replaces the two-sheet dance
        .sheet(item: $sheetState) { state in
            switch state {
            case .detail(let submission):
                submissionDetailSheet(submission)
                    .presentationDetents([.large])         // Fix 8
                    .presentationDragIndicator(.visible)   // Fix 8
            case .reject(let submission):
                rejectSheet(for: submission)
            }
        }
        // Fix 3: real bidirectional Binding — no .constant()
        .alert(PaymentsStrings.errorTitle, isPresented: Binding(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(PaymentsStrings.errorOk) { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        // Fix 9: sensory feedback on approve/reject (counter pattern avoids Bool double-fire)
        .sensoryFeedback(.success, trigger: approveCounter) { old, new in new > old }
        .sensoryFeedback(.success, trigger: rejectCounter) { old, new in new > old }
    }

    // MARK: - iPhone List (Fix 1)

    @ViewBuilder
    private var iPhoneListContent: some View {
        List {
            Section {
                iPhoneContentRows
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    @ViewBuilder
    private var iPhoneContentRows: some View {
        // Fix 10: error branch BEFORE empty branch
        if let error = viewModel.errorMessage, viewModel.submissions.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: PaymentsStrings.errorLoadingTitle,
                message: error,
                actionTitle: PaymentsStrings.actionRetry
            ) {
                Task { await viewModel.fetchSubmissions() }
            }
            .frame(maxWidth: .infinity)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets())
            .listRowSeparator(.hidden)
        } else if viewModel.isLoading && viewModel.submissions.isEmpty {
            // Fix 5: skeleton rows inside the List
            skeletonRows
        } else if viewModel.isPlanLocked {
            planLockedContent
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
                .listRowSeparator(.hidden)
        } else if viewModel.submissions.isEmpty {
            // Fix 11: inbox-empty is good news — no "Actualizar" CTA
            emptyContent
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
                .listRowSeparator(.hidden)
        } else if viewModel.filteredSubmissions.isEmpty {
            searchEmptyContent
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
                .listRowSeparator(.hidden)
        } else {
            // Fix 1: native List rows with swipe actions
            ForEach(viewModel.filteredSubmissions) { submission in
                PaymentSubmissionRow(submission: submission)
                    .contentShape(Rectangle())            // Fix 13
                    .onTapGesture {
                        sheetState = .detail(submission)
                    }
                    .listRowBackground(SolennixColors.card)                        // Fix 1
                    .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))     // Fix 1
                    // Fix 12: composed a11y label
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(accessibilityLabel(for: submission))
                    .accessibilityAddTraits(.isButton)
                    // Fix 12: approve/reject VoiceOver actions on pending rows
                    .accessibilityAction(named: PaymentsStrings.actionApprove) {
                        guard submission.status == .pending else { return }
                        Task { await performApprove(submission) }
                    }
                    .accessibilityAction(named: PaymentsStrings.actionReject) {
                        guard submission.status == .pending else { return }
                        openReject(submission)
                    }
                    // Fix 2: swipe actions — pending only
                    .swipeActions(edge: .leading, allowsFullSwipe: false) {
                        if submission.status == .pending {
                            Button {
                                Task { await performApprove(submission) }
                            } label: {
                                Label(PaymentsStrings.actionApprove, systemImage: "checkmark.circle.fill")
                            }
                            .tint(SolennixColors.success)
                        }
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        if submission.status == .pending {
                            Button {
                                openReject(submission)
                            } label: {
                                Label(PaymentsStrings.actionReject, systemImage: "xmark.circle.fill")
                            }
                            .tint(SolennixColors.error)
                        }
                    }
            }
        }
    }

    // Fix 5: skeleton rows — in-List, card background + separator tint
    @ViewBuilder
    private var skeletonRows: some View {
        ForEach(0..<5, id: \.self) { _ in
            PaymentSubmissionSkeletonRow()
                .listRowBackground(SolennixColors.card)
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        }
        .accessibilityHidden(true)
    }

    // MARK: - iPad Grid (unchanged)

    private var submissionContent: some View {
        Group {
            if viewModel.isLoading && viewModel.submissions.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.isPlanLocked {
                planLockedContent
            } else if let error = viewModel.errorMessage, viewModel.submissions.isEmpty {
                // Fix 10: error state on iPad too
                EmptyStateView(
                    icon: "wifi.exclamationmark",
                    title: PaymentsStrings.errorLoadingTitle,
                    message: error,
                    actionTitle: PaymentsStrings.actionRetry
                ) {
                    Task { await viewModel.fetchSubmissions() }
                }
            } else if viewModel.submissions.isEmpty {
                emptyContent
            } else if viewModel.filteredSubmissions.isEmpty {
                searchEmptyContent
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: Spacing.sm) {
                        ForEach(viewModel.filteredSubmissions) { submission in
                            PaymentSubmissionCardView(submission: submission) {
                                sheetState = .detail(submission)
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.lg)
                }
                .background(SolennixColors.surfaceGrouped)
            }
        }
    }

    // MARK: - State Views

    private var searchEmptyContent: some View {
        EmptyStateView(
            icon: "magnifyingglass",
            title: PaymentsStrings.searchEmptyTitle,
            message: PaymentsStrings.searchEmptyMessage
        )
    }

    private var planLockedContent: some View {
        EmptyStateView(
            icon: "lock.fill",
            title: PaymentsStrings.proOnlyTitle,
            message: PaymentsStrings.proOnlyMessage
        )
    }

    // Fix 11: no "Actualizar" CTA — pull-to-refresh exists
    private var emptyContent: some View {
        EmptyStateView(
            icon: "checkmark.seal",
            title: PaymentsStrings.emptyTitle,
            message: PaymentsStrings.emptyMessage
        )
    }

    // MARK: - Actions

    /// Approve flow with haptic + toast. Dismisses detail sheet INSIDE success path.
    private func performApprove(_ submission: PaymentSubmission) async {
        await viewModel.approve(id: submission.id)
        guard viewModel.errorMessage == nil else { return }
        // Fix 9: dismiss sheet on success, fire counter for haptic
        sheetState = nil
        approveCounter += 1
        toastManager.show(message: PaymentsStrings.toastApproved, type: .success)
    }

    private func openReject(_ submission: PaymentSubmission) {
        rejectionReason = ""
        sheetState = .reject(submission)
    }

    // MARK: - Accessibility

    private func accessibilityLabel(for submission: PaymentSubmission) -> String {
        let client = submission.clientName ?? PaymentsStrings.clientPlaceholder
        let event = submission.eventLabel ?? PaymentsStrings.eventPlaceholder
        let amount = CommonFormatting.currencyMXN(submission.amount)
        let status: String
        switch submission.status {
        case .pending:  status = PaymentsStrings.statusPending
        case .approved: status = PaymentsStrings.statusApproved
        case .rejected: status = PaymentsStrings.statusRejected
        }
        let date = CommonFormatting.dateTimeFromISO(submission.submittedAt)
        return [client, event, amount, status, date].joined(separator: ", ")
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

                        // Fix 12: badge as combined a11y element
                        PaymentSubmissionStatusBadge(status: submission.status)
                            .accessibilityElement(children: .combine)
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
                                    // Fix 13: paperclip icon → textSecondary (not SolennixColors.info)
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
                                Task { await performApprove(submission) }
                            },
                            onReject: {
                                openReject(submission)
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
                    Button(PaymentsStrings.actionClose) { sheetState = nil }
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

    // MARK: - Reject Sheet (Fix 7, Fix 9)

    private func rejectSheet(for target: PaymentSubmission) -> some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Spacing.lg) {    // Fix 7: Spacing token
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(target.clientName ?? PaymentsStrings.clientPlaceholder)
                        .font(.headline)
                    Text(CommonFormatting.currencyMXN(target.amount))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                VStack(alignment: .leading, spacing: Spacing.sm) {    // Fix 7: Spacing token
                    Text(PaymentsStrings.rejectReasonLabel)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    TextEditor(text: $rejectionReason)
                        .frame(minHeight: 120)
                        .padding(Spacing.sm)                           // Fix 7: Spacing token
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.md)
                                .stroke(SolennixColors.border, lineWidth: 1)
                        )
                }

                Spacer()
            }
            .padding(Spacing.lg)                                       // Fix 7: Spacing token
            .navigationTitle(PaymentsStrings.rejectTitle)
            .navigationBarTitleDisplayMode(.inline)
            .keyboardDoneToolbar()                                     // Fix 7: keyboard dismiss
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(PaymentsStrings.actionCancel) { sheetState = nil }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(PaymentsStrings.actionReject) {
                        guard rejectionReason.count >= 10 else { return }
                        Task {
                            await viewModel.reject(id: target.id, reason: rejectionReason)
                            guard viewModel.errorMessage == nil else { return }
                            // Fix 9: dismiss INSIDE success path, fire counter
                            sheetState = nil
                            rejectCounter += 1
                            toastManager.show(message: PaymentsStrings.toastRejected, type: .info)
                        }
                    }
                    .disabled(rejectionReason.count < 10 || viewModel.rejectingId != nil)
                    .foregroundStyle(SolennixColors.error)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Payment Inbox Components

struct PaymentSubmissionCardView: View {
    let submission: PaymentSubmission
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ReviewCardContainer {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(submission.clientName ?? PaymentsStrings.clientPlaceholder)
                                .font(.headline)
                                .foregroundStyle(SolennixColors.text)

                            Text(submission.eventLabel ?? PaymentsStrings.eventPlaceholder)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        Spacer()
                        PaymentSubmissionStatusBadge(status: submission.status)
                    }

                    HStack(spacing: 16) {
                        Label(CommonFormatting.currencyMXN(submission.amount), systemImage: "dollarsign.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.primary)

                        if let ref = submission.transferRef {
                            Label(ref, systemImage: "number")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                                .lineLimit(1)
                        }
                    }

                    Text(CommonFormatting.dateTimeFromISO(submission.submittedAt))
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)

                    if submission.receiptFileUrl != nil {
                        Label(PaymentsStrings.cardReceiptAttached, systemImage: "paperclip")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.info)
                    }

                    if submission.status == .rejected,
                       let reason = submission.rejectionReason {
                        Text(PaymentsStrings.cardRejectionReason(reason))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                            .padding(.top, 2)
                    }

                    Divider()
                        .padding(.vertical, 2)

                    HStack(spacing: Spacing.xs) {
                        Text(PaymentsStrings.cardReviewPrompt)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            }
        }
        .buttonStyle(.plain)
    }
}

struct PaymentSubmissionActionBar: View {
    let submissionId: String
    let approvingId: String?
    let rejectingId: String?
    let onApprove: () -> Void
    let onReject: () -> Void

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Button(action: onApprove) {
                if approvingId == submissionId {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Label(PaymentsStrings.actionApprove, systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(SolennixColors.success)
            .disabled(approvingId != nil || rejectingId != nil)

            Button(action: onReject) {
                Label(PaymentsStrings.actionReject, systemImage: "xmark.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(SolennixColors.error)
            .disabled(approvingId != nil || rejectingId != nil)
        }
    }
}

struct PaymentSubmissionStatusBadge: View {
    let status: PaymentSubmissionStatus

    var body: some View {
        let (label, color): (String, Color) = {
            switch status {
            case .pending: return (PaymentsStrings.statusPending, SolennixColors.warning)
            case .approved: return (PaymentsStrings.statusApproved, SolennixColors.success)
            case .rejected: return (PaymentsStrings.statusRejected, SolennixColors.error)
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
}

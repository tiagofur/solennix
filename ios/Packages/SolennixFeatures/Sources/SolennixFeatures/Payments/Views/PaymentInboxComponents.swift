import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Payment Inbox Components

// MARK: - Card View (iPad grid — unchanged chrome)

struct PaymentSubmissionCardView: View {
    let submission: PaymentSubmission
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ReviewCardContainer {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
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

                    HStack(spacing: Spacing.md) {
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
                        // Fix 13: paperclip → textSecondary (not SolennixColors.info)
                        Label(PaymentsStrings.cardReceiptAttached, systemImage: "paperclip")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
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
                        // Fix 12: decorative chevron hidden from a11y
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .accessibilityHidden(true)
                    }
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - List Row (iPhone insetGrouped — Fix 1, 12)

/// Flat row content for `List { Section { } }` — no card chrome (insetGrouped owns it).
/// Dynamic Type: stacks vertically at ≥ .accessibility1 (Fix 12).
struct PaymentSubmissionRow: View {
    let submission: PaymentSubmission
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        if dynamicTypeSize >= .accessibility1 {
            // Fix 12: vertical stack for large type sizes
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    clientEventStack
                    Spacer()
                }
                HStack {
                    amountLabel
                    Spacer()
                    PaymentSubmissionStatusBadge(status: submission.status)
                        .accessibilityElement(children: .combine)  // Fix 12
                }
                dateLabel
                receiptLabel
            }
            .padding(.vertical, Spacing.xs)
        } else {
            HStack(spacing: Spacing.sm) {
                clientEventStack
                Spacer()
                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    amountLabel
                    PaymentSubmissionStatusBadge(status: submission.status)
                        .accessibilityElement(children: .combine)  // Fix 12
                }
            }
            .padding(.vertical, Spacing.xs)
        }
    }

    private var clientEventStack: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(submission.clientName ?? PaymentsStrings.clientPlaceholder)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)
                .lineLimit(1)

            Text(submission.eventLabel ?? PaymentsStrings.eventPlaceholder)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
                .lineLimit(1)
        }
    }

    private var amountLabel: some View {
        Label(CommonFormatting.currencyMXN(submission.amount), systemImage: "dollarsign.circle.fill")
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(SolennixColors.primary)
    }

    private var dateLabel: some View {
        Text(CommonFormatting.dateTimeFromISO(submission.submittedAt))
            .font(.caption2)
            .foregroundStyle(SolennixColors.textTertiary)
    }

    @ViewBuilder
    private var receiptLabel: some View {
        if submission.receiptFileUrl != nil {
            // Fix 13: paperclip → textSecondary (not SolennixColors.info)
            Label(PaymentsStrings.cardReceiptAttached, systemImage: "paperclip")
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
        }
    }
}

// MARK: - Skeleton Row (Fix 5)

/// In-List skeleton placeholder matching PaymentSubmissionRow shape:
/// client bar, event bar, trailing amount bar + badge stub.
struct PaymentSubmissionSkeletonRow: View {
    public init() {}

    public var body: some View {
        HStack(spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonLine(width: 130, height: 14)  // client name — subheadline
                SkeletonLine(width: 90, height: 12)   // event label — caption
                SkeletonLine(width: 70, height: 10)   // date — caption2
            }

            Spacer(minLength: Spacing.sm)

            VStack(alignment: .trailing, spacing: Spacing.xs) {
                SkeletonLine(width: 64, height: 14)   // amount — subheadline
                SkeletonLine(width: 56, height: 18)   // badge stub — Capsule shape
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Action Bar

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

// MARK: - Status Badge (Fix 13)

struct PaymentSubmissionStatusBadge: View {
    let status: PaymentSubmissionStatus

    var body: some View {
        let (label, color, bg): (String, Color, Color) = {
            switch status {
            case .pending:
                return (PaymentsStrings.statusPending, SolennixColors.warning, SolennixColors.warningBg)
            case .approved:
                return (PaymentsStrings.statusApproved, SolennixColors.success, SolennixColors.successBg)
            case .rejected:
                return (PaymentsStrings.statusRejected, SolennixColors.error, SolennixColors.errorBg)
            }
        }()

        Text(label)
            .font(.caption2)
            .fontWeight(.semibold)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(bg)                          // Fix 13: token instead of color.opacity(0.15)
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

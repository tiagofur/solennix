import SwiftUI
import UIKit
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff Detail View

public struct StaffDetailView: View {

    let staffId: String

    @State private var staff: Staff?
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    @State private var showDeleteConfirm: Bool = false
    @State private var showRevokeConfirm: Bool = false
    @State private var isInviting: Bool = false
    @State private var isRevoking: Bool = false
    @State private var inviteURL: String?
    @State private var inviteFeedback: String?
    @State private var inviteFeedbackIsError: Bool = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    private let apiClient: APIClient

    public init(staffId: String, apiClient: APIClient) {
        self.staffId = staffId
        self.apiClient = apiClient
    }

    public var body: some View {
        Group {
            if isLoading && staff == nil {
                ProgressView(StaffStrings.loadingStaff)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let item = staff {
                scrollContent(item)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: StaffStrings.errorTitle,
                    message: errorMessage ?? StaffStrings.notFoundMessage
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(staff?.name ?? StaffStrings.navTitleFallback)
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            StaffStrings.deleteTitle,
            isPresented: $showDeleteConfirm
        ) {
            Button(StaffStrings.deleteAction, role: .destructive) {
                Task {
                    do {
                        try await apiClient.delete(Endpoint.staff(staffId))
                        dismiss()
                    } catch {
                        errorMessage = StaffStrings.deleteError
                    }
                }
            }
            Button(StaffStrings.cancel, role: .cancel) {}
        } message: {
            Text(StaffStrings.deleteConfirmMessage(staff?.name ?? ""))
        }
        .confirmationDialog(
            StaffStrings.revokeConfirmTitle,
            isPresented: $showRevokeConfirm
        ) {
            Button(StaffStrings.revokeInvite, role: .destructive) {
                Task { await revokeInviteAccess() }
            }
            Button(StaffStrings.cancel, role: .cancel) {}
        } message: {
            Text(StaffStrings.revokeConfirmMessage)
        }
        .task { await loadData() }
    }

    // MARK: - Scroll Content

    private func scrollContent(_ item: Staff) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                headerCard(item)

                contactSection(item)

                if item.notificationEmailOptIn {
                    notificationOptInBanner
                }

                if let notes = item.notes, !notes.isEmpty {
                    notesCard(notes)
                }

                if let inviteURL, !inviteURL.isEmpty {
                    inviteLinkCard(inviteURL)
                } else if hasPendingInvite {
                    pendingInviteCard
                }

                if let inviteFeedback, !inviteFeedback.isEmpty {
                    Text(inviteFeedback)
                        .font(.footnote)
                        .foregroundStyle(inviteFeedbackIsError ? SolennixColors.error : SolennixColors.success)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                actionButtons
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .refreshable { await loadData() }
    }

    // MARK: - Header Card

    private func headerCard(_ item: Staff) -> some View {
        VStack(spacing: Spacing.md) {
            Avatar(name: item.name, photoURL: nil, size: 72)

            Text(item.name)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)

            if let role = item.roleLabel, !role.isEmpty {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "briefcase.fill")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.primary)
                    Text(role)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    // MARK: - Contact Section

    private func contactSection(_ item: Staff) -> some View {
        VStack(spacing: Spacing.sm) {
            if let phone = item.phone, !phone.isEmpty {
                contactRow(
                    icon: "phone.fill",
                    iconBg: SolennixColors.success,
                    text: phone
                ) {
                    if let url = URL(string: "tel:\(phone)") {
                        openURL(url)
                    }
                }
            }

            if let email = item.email, !email.isEmpty {
                contactRow(
                    icon: "envelope.fill",
                    iconBg: SolennixColors.info,
                    text: email
                ) {
                    if let url = URL(string: "mailto:\(email)") {
                        openURL(url)
                    }
                }
            }
        }
    }

    // MARK: - Notification Opt-In Banner

    private var notificationOptInBanner: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "bell.badge.fill")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)

            VStack(alignment: .leading, spacing: 2) {
                Text(StaffStrings.emailNotifTitle)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Text(StaffStrings.emailNotifSubtitle)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Notes Card

    private func notesCard(_ notes: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "note.text")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                Text(StaffStrings.notesTitle)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Text(notes)
                .font(.body)
                .foregroundStyle(SolennixColors.text)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    // MARK: - Contact Row

    private func contactRow(
        icon: String,
        iconBg: Color,
        iconFg: Color = .white,
        text: String,
        action: (() -> Void)? = nil
    ) -> some View {
        Button {
            action?()
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(iconFg)
                    .frame(width: 36, height: 36)
                    .background(iconBg)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

                Text(text)
                    .font(.body)
                    .foregroundStyle(SolennixColors.text)
                    .multilineTextAlignment(.leading)

                Spacer()

                if action != nil {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
            .padding(Spacing.md)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: Spacing.sm) {
                if let item = staff,
               let email = item.email,
               !email.isEmpty,
                    item.invitedUserId == nil,
                    !hasPendingInvite {
                Button {
                    inviteAccess()
                } label: {
                    actionButton(
                        icon: "paperplane",
                        label: isInviting ? StaffStrings.inviting : StaffStrings.inviteAccess,
                        fg: SolennixColors.primary
                    )
                }
                .disabled(isInviting)
            }

            if hasPendingInvite {
                Button {
                    showRevokeConfirm = true
                } label: {
                    actionButton(
                        icon: "xmark.shield",
                        label: isRevoking ? StaffStrings.revoking : StaffStrings.revokeInvite,
                        fg: SolennixColors.error
                    )
                }
                .disabled(isRevoking || isInviting)
            }

            NavigationLink(value: Route.staffForm(id: staffId)) {
                actionButton(
                    icon: "pencil",
                    label: StaffStrings.edit,
                    fg: SolennixColors.info
                )
            }

            Button {
                showDeleteConfirm = true
            } label: {
                actionButton(
                    icon: "trash",
                    label: StaffStrings.deleteAction,
                    fg: SolennixColors.error
                )
            }
        }
    }

    private func actionButton(icon: String, label: String, fg: Color) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(fg)

            Text(label)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    private func inviteLinkCard(_ url: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(StaffStrings.inviteLinkTitle)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.textSecondary)

            Text(url)
                .font(.footnote)
                .foregroundStyle(SolennixColors.text)
                .textSelection(.enabled)

            Button {
                UIPasteboard.general.string = url
                inviteFeedback = StaffStrings.inviteLinkCopied
                inviteFeedbackIsError = false
            } label: {
                Label(StaffStrings.copyInviteLink, systemImage: "doc.on.doc")
                    .font(.footnote)
                    .foregroundStyle(SolennixColors.primary)
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    private var pendingInviteCard: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(StaffStrings.inviteLinkTitle)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.textSecondary)

            Text(StaffStrings.invitePendingActive)
                .font(.footnote)
                .foregroundStyle(SolennixColors.text)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    private var hasPendingInvite: Bool {
        !inviteURL.orEmpty.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            || staff?.inviteStatus == "pending"
    }

    // MARK: - Data Loading

    @MainActor
    private func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            let item: Staff = try await apiClient.get(Endpoint.staff(staffId))
            staff = item
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription
            } else {
                errorMessage = StaffStrings.unexpectedError
            }
        }

        isLoading = false
    }

    @MainActor
    private func inviteAccess() {
        guard let item = staff else { return }
        guard let email = item.email, !email.isEmpty else {
            inviteFeedback = StaffStrings.inviteEmailRequired
            inviteFeedbackIsError = true
            return
        }
        guard item.invitedUserId == nil else {
            inviteFeedback = StaffStrings.inviteAlreadyActivated
            inviteFeedbackIsError = false
            return
        }
        guard !hasPendingInvite else {
            return
        }

        Task {
            isInviting = true
            inviteFeedback = nil
            inviteFeedbackIsError = false
            do {
                let response = try await apiClient.inviteStaffUser(staffId: staffId)
                inviteURL = response.acceptUrl
                inviteFeedback = StaffStrings.inviteCreated
                inviteFeedbackIsError = false
                await loadData()
            } catch {
                if let apiError = error as? APIError {
                    inviteFeedback = apiError.errorDescription ?? StaffStrings.inviteCreateError
                } else {
                    inviteFeedback = StaffStrings.inviteCreateError
                }
                inviteFeedbackIsError = true
            }
            isInviting = false
        }
    }

    @MainActor
    private func revokeInviteAccess() async {
        guard hasPendingInvite else { return }
        isRevoking = true
        inviteFeedback = nil
        inviteFeedbackIsError = false

        do {
            try await apiClient.revokeStaffInvite(staffId: staffId)
            inviteURL = nil
            inviteFeedback = StaffStrings.inviteRevoked
            inviteFeedbackIsError = false
            await loadData()
        } catch {
            if let apiError = error as? APIError {
                inviteFeedback = apiError.errorDescription ?? StaffStrings.inviteRevokeError
            } else {
                inviteFeedback = StaffStrings.inviteRevokeError
            }
            inviteFeedbackIsError = true
        }

        isRevoking = false
    }
}

private extension Optional where Wrapped == String {
    var orEmpty: String { self ?? "" }
}

// MARK: - Preview

#Preview("Staff Detail") {
    NavigationStack {
        StaffDetailView(staffId: "123", apiClient: APIClient())
    }
}

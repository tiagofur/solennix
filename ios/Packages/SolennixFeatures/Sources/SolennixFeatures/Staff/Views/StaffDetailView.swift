import SwiftUI
import UIKit
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff Detail View

public struct StaffDetailView: View {
    private func isPendingInviteStatus(_ status: String?) -> Bool {
        guard let raw = status?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() else {
            return false
        }
        return raw == "pending" || raw == "active" || raw == "invited" || raw == "sent"
    }

    let staffId: String

    @State private var staff: Staff?
    @State private var scoped: ViewScopedTask?
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    @State private var showDeleteConfirm: Bool = false
    @State private var showRevokeConfirm: Bool = false
    @State private var isInviting: Bool = false
    @State private var inviteURL: String?
    @State private var isSharingInvite: Bool = false
    @State private var inviteFeedback: String?
    @State private var inviteFeedbackIsError: Bool = false
    @State private var inviteTargetRole: StaffInviteTargetRole = .teamMember
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(AuthManager.self) private var authManager

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
                ContentUnavailableView {
                    Label(StaffStrings.errorTitle, systemImage: "exclamationmark.triangle")
                } description: {
                    Text(errorMessage ?? StaffStrings.notFoundMessage)
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(staff?.name ?? StaffStrings.navTitleFallback)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.staffForm(id: staffId)) {
                        Label(StaffStrings.edit, systemImage: "pencil")
                    }

                    if hasPendingInvite {
                        Button(role: .destructive) {
                            showRevokeConfirm = true
                        } label: {
                            Label(StaffStrings.revokeInvite, systemImage: "xmark.shield")
                        }
                    }

                    Divider()

                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label(StaffStrings.deleteAction, systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(StaffStrings.moreActions)
                }
            }
        }
        .confirmationDialog(
            StaffStrings.deleteTitle,
            isPresented: $showDeleteConfirm
        ) {
            Button(StaffStrings.deleteAction, role: .destructive) {
                scoped?.start {
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
                scoped?.start { await revokeInviteAccess() }
            }
            Button(StaffStrings.cancel, role: .cancel) {}
        } message: {
            Text(StaffStrings.revokeConfirmMessage)
        }
        .task { await loadData() }
        .viewScopedTask(scoped: $scoped)
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

                primaryInviteAction
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
        .solennixCard(border: false)
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
        .solennixCard(radius: CornerRadius.lg, border: false)
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
            .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }

    // MARK: - Primary Action

    /// Secretario (`assistant`) invites require a Business plan (server-enforced).
    private var isBusinessPlan: Bool {
        authManager.currentUser?.plan == .business
    }

    @ViewBuilder
    private var inviteRolePicker: some View {
        if isBusinessPlan {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Picker(StaffStrings.inviteRoleLabel, selection: $inviteTargetRole) {
                    Text(StaffStrings.inviteRoleMember).tag(StaffInviteTargetRole.teamMember)
                    Text(StaffStrings.inviteRoleAssistant).tag(StaffInviteTargetRole.assistant)
                }
                .pickerStyle(.segmented)

                Text(StaffStrings.inviteRoleHint)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
    }

    @ViewBuilder
    private var primaryInviteAction: some View {
        if let item = staff,
           let email = item.email,
           !email.isEmpty,
           item.invitedUserId == nil,
           !hasPendingInvite {
            inviteRolePicker
            PremiumButton(
                title: isInviting ? StaffStrings.inviting : StaffStrings.inviteAccess,
                isLoading: isInviting,
                isDisabled: isInviting,
                icon: "paperplane.fill"
            ) {
                inviteAccess()
            }
        }
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

            HStack(spacing: Spacing.md) {
                Button {
                    UIPasteboard.general.string = url
                    inviteFeedback = StaffStrings.inviteLinkCopied
                    inviteFeedbackIsError = false
                } label: {
                    Label(StaffStrings.copyInviteLink, systemImage: "doc.on.doc")
                        .font(.footnote)
                        .foregroundStyle(SolennixColors.primary)
                }

                Button {
                    isSharingInvite = true
                } label: {
                    Label(StaffStrings.shareInviteLink, systemImage: "square.and.arrow.up")
                        .font(.footnote)
                        .foregroundStyle(SolennixColors.primary)
                }
            }

            inviteStepsHint
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(radius: CornerRadius.lg, border: false)
        .sheet(isPresented: $isSharingInvite) {
            ShareSheet(items: [shareInviteText(url: url)])
        }
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

            Text(StaffStrings.invitePendingNoLink)
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)

            inviteRolePicker

            PremiumButton(
                title: isInviting ? StaffStrings.inviting : StaffStrings.resendInvite,
                isLoading: isInviting,
                isDisabled: isInviting,
                style: .secondary,
                icon: "paperplane.fill"
            ) {
                inviteAccess(force: true)
            }

            inviteStepsHint
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(radius: CornerRadius.lg, border: false)
    }

    private var inviteStepsHint: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(StaffStrings.inviteStepsTitle)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.textSecondary)

            Text(StaffStrings.inviteStepOpenLink)
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)

            Text(StaffStrings.inviteStepCreatePassword)
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)

            Text(StaffStrings.inviteStepSeeSchedule)
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .padding(.top, Spacing.xs)
    }

    private func shareInviteText(url: String) -> String {
        StaffStrings.shareInviteMessage(
            staff?.name ?? StaffStrings.navTitleFallback,
            role: staff?.roleLabel,
            url
        )
    }

    private var hasPendingInvite: Bool {
        !inviteURL.orEmpty.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            || isPendingInviteStatus(staff?.inviteStatus)
    }

    // MARK: - Data Loading

    @MainActor
    private func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            let item: Staff = try await apiClient.get(Endpoint.staff(staffId))
            staff = item
            if item.invitedUserId != nil || !isPendingInviteStatus(item.inviteStatus) {
                inviteURL = nil
            }
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
    private func inviteAccess(force: Bool = false) {
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
        guard force || !hasPendingInvite else {
            return
        }

        scoped?.start {
            isInviting = true
            inviteFeedback = nil
            inviteFeedbackIsError = false
            do {
                let response = try await apiClient.inviteStaffUser(staffId: staffId, targetRole: inviteTargetRole)
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
    }
}

private extension Optional where Wrapped == String {
    var orEmpty: String { self ?? "" }
}

// MARK: - Share Sheet

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        // iPad presents activity controllers in a popover and crashes without an anchor.
        if let popover = controller.popoverPresentationController,
           let rootView = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow })?.rootViewController?.view {
            popover.sourceView = rootView
            popover.sourceRect = CGRect(x: rootView.bounds.midX, y: rootView.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Preview

#Preview("Staff Detail") {
    NavigationStack {
        StaffDetailView(staffId: "123", apiClient: APIClient())
    }
}

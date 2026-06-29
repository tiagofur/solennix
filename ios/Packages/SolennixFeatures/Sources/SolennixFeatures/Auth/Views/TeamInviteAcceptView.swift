import SwiftUI
import SolennixDesign
import SolennixNetwork

// MARK: - Team Invite Accept View

public struct TeamInviteAcceptView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var viewModel: AuthViewModel?
    @ScaledMetric(relativeTo: .largeTitle) private var formIconSize: CGFloat = 48
    @ScaledMetric(relativeTo: .largeTitle) private var successIconSize: CGFloat = 64

    let token: String

    public init(token: String) {
        self.token = token
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                if viewModel?.showSuccess == true {
                    successState
                } else {
                    formState
                }
            }
            .padding(.horizontal, sizeClass == .regular ? Spacing.xxxl : Spacing.xl)
            .padding(.vertical, Spacing.xxl)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
        .navigationTitle(AuthStrings.teamInviteTitle)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if viewModel == nil {
                viewModel = AuthViewModel(authManager: authManager)
            }
        }
    }

    // MARK: - Form

    private var formState: some View {
        VStack(spacing: Spacing.xl) {
            VStack(spacing: Spacing.sm) {
                Image(systemName: "person.badge.key.fill")
                    .font(.system(size: formIconSize))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(SolennixColors.primary)

                Text(AuthStrings.teamInviteSubtitle)
                    .font(.body)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.lg)

            if let error = viewModel?.errorMessage {
                errorBanner(message: error)
            }

            SolennixTextField(
                label: AuthStrings.teamInvitePasswordLabel,
                text: Binding(
                    get: { viewModel?.password ?? "" },
                    set: { viewModel?.password = $0 }
                ),
                placeholder: AuthStrings.teamInvitePasswordPlaceholder,
                leftIcon: "lock",
                isSecure: true,
                textContentType: .newPassword
            )

            SolennixTextField(
                label: AuthStrings.teamInviteConfirmLabel,
                text: Binding(
                    get: { viewModel?.confirmPassword ?? "" },
                    set: { viewModel?.confirmPassword = $0 }
                ),
                placeholder: AuthStrings.teamInviteConfirmPlaceholder,
                leftIcon: "lock",
                isSecure: true,
                // No content type on confirm field — .newPassword on both causes iOS to
                // auto-fill both with the same suggestion, defeating confirmation.
                textContentType: nil
            )

            PremiumButton(
                title: AuthStrings.teamInviteSubmit,
                isLoading: viewModel?.isLoading ?? false,
                isDisabled: !(viewModel?.isResetValid ?? false)
            ) {
                Task { await viewModel?.acceptTeamInvite(token: token) }
            }

            Button {
                dismiss()
            } label: {
                Text(AuthStrings.teamInviteBackToLogin)
                    .font(.body)
                    .foregroundStyle(SolennixColors.primary)
            }
        }
    }

    // MARK: - Success

    private var successState: some View {
        VStack(spacing: Spacing.xl) {
            Spacer(minLength: Spacing.xxxl)

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: successIconSize))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(SolennixColors.success)

            VStack(spacing: Spacing.sm) {
                Text(AuthStrings.teamInviteSuccessTitle)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Text(AuthStrings.teamInviteSuccessMessage)
                    .font(.body)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            PremiumButton(title: AuthStrings.teamInviteGoToApp) {
                dismiss()
            }

            Spacer(minLength: Spacing.xxxl)
        }
    }

    // MARK: - Error Banner

    private func errorBanner(message: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.error)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.sm + 4)
        .background(SolennixColors.errorBg)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(SolennixColors.error)
                .frame(width: 4)
                .clipShape(
                    UnevenRoundedRectangle(
                        topLeadingRadius: CornerRadius.sm,
                        bottomLeadingRadius: CornerRadius.sm
                    )
                )
        }
        .onTapGesture {
            viewModel?.clearError()
        }
    }
}

#Preview {
    NavigationStack {
        TeamInviteAcceptView(token: "preview-token")
    }
    .environment(AuthManager())
}

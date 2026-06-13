import SwiftUI
import SolennixDesign
import SolennixNetwork

// MARK: - Reset Password View

public struct ResetPasswordView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dismiss) private var dismiss

    @State private var viewModel: AuthViewModel?
    @ScaledMetric(relativeTo: .largeTitle) private var formIconSize: CGFloat = 48
    @ScaledMetric(relativeTo: .largeTitle) private var successIconSize: CGFloat = 64

    let token: String

    public init(token: String) {
        self.token = token
    }

    public var body: some View {
        Group {
            if sizeClass == .regular {
                iPadLayout
            } else {
                iPhoneLayout
            }
        }
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
        .navigationTitle(AuthStrings.resetPasswordTitle)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if viewModel == nil {
                viewModel = AuthViewModel(authManager: authManager)
            }
        }
    }

    // MARK: - iPhone Layout

    private var iPhoneLayout: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                if viewModel?.showSuccess == true {
                    successState
                } else {
                    formState
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.xxl)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    // MARK: - iPad Layout

    private var iPadLayout: some View {
        GeometryReader { proxy in
            HStack(spacing: 0) {
                // Left brand panel (40%)
                brandPanel
                    .frame(width: proxy.size.width * 0.4)

                // Right form panel (60%)
                ScrollView {
                    VStack(spacing: Spacing.xl) {
                        Spacer(minLength: Spacing.xxxl)

                        if viewModel?.showSuccess == true {
                            successState
                                .frame(maxWidth: 440)
                        } else {
                            formState
                                .frame(maxWidth: 440)
                        }

                        Spacer(minLength: Spacing.xxxl)
                    }
                    .padding(.horizontal, Spacing.xxxl)
                    .frame(maxWidth: .infinity)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    // MARK: - Brand Panel (iPad)

    private var brandPanel: some View {
        ZStack {
            SolennixGradient.premium
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: Spacing.xl) {
                Text("Solennix")
                    .font(.solennixTitle)
                    .foregroundStyle(.white)

                Text(AuthStrings.resetPasswordBrandSubtitle)
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.85))

                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "key.fill")
                            .font(.body)
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(.white.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

                        Text(AuthStrings.resetPasswordBrandFeatureMin)
                            .font(.body)
                            .foregroundStyle(.white)
                    }

                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "checkmark.shield.fill")
                            .font(.body)
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(.white.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

                        Text(AuthStrings.resetPasswordBrandFeatureRules)
                            .font(.body)
                            .foregroundStyle(.white)
                    }
                }
                .padding(.top, Spacing.sm)
            }
            .padding(.horizontal, Spacing.xxxl)
        }
    }

    // MARK: - Form State

    private var formState: some View {
        VStack(spacing: Spacing.xl) {
            // Instruction
            VStack(spacing: Spacing.sm) {
                Image(systemName: "key.fill")
                    .font(.system(size: formIconSize))
                    .foregroundStyle(SolennixColors.primary)

                Text(AuthStrings.resetPasswordSubtitle)
                    .font(.body)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.lg)

            // Error banner
            if let error = viewModel?.errorMessage {
                errorBanner(message: error)
            }

            SolennixTextField(
                label: AuthStrings.resetPasswordPasswordLabel,
                text: Binding(
                    get: { viewModel?.password ?? "" },
                    set: { viewModel?.password = $0 }
                ),
                placeholder: AuthStrings.resetPasswordPasswordPlaceholder,
                leftIcon: "lock",
                isSecure: true,
                textContentType: .newPassword
            )

            SolennixTextField(
                label: AuthStrings.resetPasswordConfirmLabel,
                text: Binding(
                    get: { viewModel?.confirmPassword ?? "" },
                    set: { viewModel?.confirmPassword = $0 }
                ),
                placeholder: AuthStrings.resetPasswordConfirmPlaceholder,
                leftIcon: "lock",
                isSecure: true,
                textContentType: .newPassword
            )

            PremiumButton(
                title: AuthStrings.resetPasswordSubmit,
                isLoading: viewModel?.isLoading ?? false,
                isDisabled: !(viewModel?.isResetValid ?? false)
            ) {
                Task { await viewModel?.resetPassword(token: token) }
            }
        }
    }

    // MARK: - Success State

    private var successState: some View {
        VStack(spacing: Spacing.xl) {
            Spacer(minLength: Spacing.xxxl)

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: successIconSize))
                .foregroundStyle(SolennixColors.success)

            VStack(spacing: Spacing.sm) {
                Text(AuthStrings.resetPasswordSuccessTitle)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Text(AuthStrings.resetPasswordSuccessMessage)
                    .font(.body)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                dismiss()
            } label: {
                Text(AuthStrings.resetPasswordGoToLogin)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(SolennixColors.primaryLight)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
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

// MARK: - Preview

#Preview("Form State") {
    NavigationStack {
        ResetPasswordView(token: "preview-token-123")
    }
    .environment(AuthManager())
}

import SwiftUI
import AuthenticationServices
import SolennixDesign
import SolennixNetwork

// MARK: - Login View

public struct LoginView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.colorScheme) private var colorScheme

    @State private var viewModel: AuthViewModel?

    public init() {}

    public var body: some View {
        Group {
            if sizeClass == .regular {
                iPadLayout
            } else {
                iPhoneLayout
            }
        }
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
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
                brandHeader

                formContent

                forgotPasswordLink

                dividerWithText

                socialSignInButtons

                registerLink
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

                    Text(AuthStrings.loginTitle)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    formContent
                        .frame(maxWidth: 440)

                    forgotPasswordLink

                    dividerWithText

                    socialSignInButtons
                        .frame(maxWidth: 440)

                    registerLink

                    Spacer(minLength: Spacing.xxxl)
                }
                .padding(.horizontal, Spacing.xxxl)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        }
    }

    // MARK: - Brand Header (iPhone)

    private var brandHeader: some View {
        VStack(spacing: Spacing.sm) {
            Text("Solennix")
                .font(.solennixTitle)
                .foregroundStyle(SolennixColors.primary)

            Text(AuthStrings.loginTagline)
                .font(.caption)
                .fontWeight(.light)
                .tracking(5.5)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .padding(.top, Spacing.xxl)
        .padding(.bottom, Spacing.lg)
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

                Text(AuthStrings.loginBrandSubtitle)
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.85))

                VStack(alignment: .leading, spacing: Spacing.md) {
                    BrandFeatureRow(icon: "calendar", text: AuthStrings.loginBrandFeatureEvents)
                    BrandFeatureRow(icon: "person.2.fill", text: AuthStrings.loginBrandFeatureClients)
                    BrandFeatureRow(icon: "chart.bar.fill", text: AuthStrings.loginBrandFeatureReports)
                }
                .padding(.top, Spacing.sm)
            }
            .padding(.horizontal, Spacing.xxxl)
        }
    }

    // MARK: - Form Content

    private var formContent: some View {
        VStack(spacing: Spacing.md) {
            // Error banner
            if let error = viewModel?.errorMessage {
                errorBanner(message: error)
            }

            if let notice = viewModel?.verificationNotice {
                infoBanner(
                    message: notice,
                    actionTitle: AuthStrings.loginResendVerification,
                    action: {
                        Task { await viewModel?.resendVerificationEmail() }
                    }
                )
            }

            SolennixTextField(
                label: AuthStrings.loginEmailLabel,
                text: Binding(
                    get: { viewModel?.email ?? "" },
                    set: { viewModel?.email = $0 }
                ),
                placeholder: AuthStrings.loginEmailPlaceholder,
                leftIcon: "envelope",
                textContentType: .emailAddress,
                keyboardType: .emailAddress,
                autocapitalization: .never
            )

            SolennixTextField(
                label: AuthStrings.loginPasswordLabel,
                text: Binding(
                    get: { viewModel?.password ?? "" },
                    set: { viewModel?.password = $0 }
                ),
                placeholder: AuthStrings.loginPasswordPlaceholder,
                leftIcon: "lock",
                isSecure: true,
                textContentType: .password
            )

            PremiumButton(
                title: AuthStrings.loginSubmit,
                isLoading: viewModel?.isLoading ?? false,
                isDisabled: !(viewModel?.isLoginValid ?? false)
            ) {
                Task { await viewModel?.signIn() }
            }
        }
        .onSubmit {
            Task { await viewModel?.signIn() }
        }
    }

    // MARK: - Forgot Password Link

    private var forgotPasswordLink: some View {
        NavigationLink {
            ForgotPasswordView()
        } label: {
            Text(AuthStrings.loginForgotPassword)
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
        }
    }

    // MARK: - Divider with Text

    private var dividerWithText: some View {
        HStack(spacing: Spacing.md) {
            Rectangle()
                .fill(SolennixColors.separator)
                .frame(height: 1)

            Text(AuthStrings.loginOrSeparator)
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)
                .fixedSize()

            Rectangle()
                .fill(SolennixColors.separator)
                .frame(height: 1)
        }
    }

    // MARK: - Social Sign In Buttons

    private var socialSignInButtons: some View {
        VStack(spacing: Spacing.md) {
            // Apple Sign In
            Button {
                Task { await viewModel?.signInWithApple() }
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "apple.logo")
                        .font(.title3)
                    Text(AuthStrings.socialAppleContinue)
                        .font(.body)
                        .fontWeight(.medium)
                }
                .foregroundStyle(colorScheme == .dark ? .black : .white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(colorScheme == .dark ? Color.white : Color.black)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .disabled(viewModel?.isLoading ?? false)

            // Google Sign In
            Button {
                Task { await viewModel?.triggerGoogleSignIn() }
            } label: {
                HStack(spacing: Spacing.sm) {
                    Text("G")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundStyle(.red)
                    Text(AuthStrings.socialGoogleContinue)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(SolennixColors.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.separator, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .disabled(viewModel?.isLoading ?? false)
        }
    }

    // MARK: - Register Link

    private var registerLink: some View {
        NavigationLink {
            RegisterView()
        } label: {
            HStack(spacing: Spacing.xs) {
                Text(AuthStrings.loginNoAccount)
                    .foregroundStyle(SolennixColors.textSecondary)
                Text(AuthStrings.loginCreateAccount)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.primary)
            }
            .font(.body)
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

    private func infoBanner(message: String, actionTitle: String, action: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.success)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button(actionTitle) {
                action()
            }
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(SolennixColors.success)
            .disabled(viewModel?.isLoading ?? false)
        }
        .padding(Spacing.sm + 4)
        .background(SolennixColors.success.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(SolennixColors.success)
                .frame(width: 4)
                .clipShape(
                    UnevenRoundedRectangle(
                        topLeadingRadius: CornerRadius.sm,
                        bottomLeadingRadius: CornerRadius.sm
                    )
                )
        }
    }
}

// MARK: - Brand Feature Row

private struct BrandFeatureRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(.white.opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

            Text(text)
                .font(.body)
                .foregroundStyle(.white)
        }
    }
}

// MARK: - Preview

#Preview("iPhone") {
    NavigationStack {
        LoginView()
    }
    .environment(AuthManager())
}

#Preview("iPad") {
    NavigationStack {
        LoginView()
    }
    .environment(AuthManager())
}

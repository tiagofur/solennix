import SwiftUI
import AuthenticationServices
import SolennixDesign
import SolennixNetwork
import SolennixCore

// MARK: - Register View

public struct RegisterView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

    @State private var viewModel: AuthViewModel?
    @State private var legalSheetURL: IdentifiableURL?

    @ScaledMetric(relativeTo: .largeTitle) private var successIconSize: CGFloat = 64

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
        .navigationTitle(AuthStrings.registerTitle)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if viewModel == nil {
                viewModel = AuthViewModel(authManager: authManager)
            }
        }
        .sheet(item: $legalSheetURL) { wrapper in
            SafariView(url: wrapper.url)
                .ignoresSafeArea()
        }
    }

    // MARK: - iPhone Layout

    private var iPhoneLayout: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                if viewModel?.showSuccess == true {
                    successState
                } else {
                    formContent

                    termsText

                    PremiumButton(
                        title: AuthStrings.registerTitle,
                        isLoading: viewModel?.isLoading ?? false,
                        isDisabled: !(viewModel?.isRegisterValid ?? false)
                    ) {
                        Task { await viewModel?.signUp() }
                    }

                    dividerWithText

                    socialSignInButtons

                    loginLink
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.xl)
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
                    Spacer(minLength: Spacing.xxl)

                    if viewModel?.showSuccess == true {
                        successState
                            .frame(maxWidth: 440)
                    } else {
                        Text(AuthStrings.registerTitle)
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.text)

                        formContent
                            .frame(maxWidth: 440)

                        termsText
                            .frame(maxWidth: 440)

                        PremiumButton(
                            title: AuthStrings.registerTitle,
                            isLoading: viewModel?.isLoading ?? false,
                            isDisabled: !(viewModel?.isRegisterValid ?? false)
                        ) {
                            Task { await viewModel?.signUp() }
                        }
                        .frame(maxWidth: 440)

                        dividerWithText
                            .frame(maxWidth: 440)

                        socialSignInButtons
                            .frame(maxWidth: 440)

                        loginLink
                    }

                    Spacer(minLength: Spacing.xxl)
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
                Text(AuthStrings.registerBrandTitle)
                    .font(.solennixSubtitle)
                    // Navy on gold: contrast ≥4.9:1 on both gradient ends (WCAG AA).
                    .foregroundStyle(SolennixColors.onPrimary)

                Text(AuthStrings.registerBrandSubtitle)
                    .font(.body)
                    .foregroundStyle(SolennixColors.onPrimary)

                VStack(alignment: .leading, spacing: Spacing.md) {
                    FeaturePill(icon: "gift.fill", text: AuthStrings.registerFeatureFree, description: AuthStrings.registerFeatureFreeDesc)
                    FeaturePill(icon: "lock.shield.fill", text: AuthStrings.registerFeatureSecure, description: AuthStrings.registerFeatureSecureDesc)
                    FeaturePill(icon: "arrow.up.right", text: AuthStrings.registerFeatureScalable, description: AuthStrings.registerFeatureScalableDesc)
                }
                .padding(.top, Spacing.sm)
            }
            .padding(.horizontal, Spacing.xxxl)
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
                Text(AuthStrings.registerTitle)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let notice = viewModel?.verificationNotice {
                    Text(notice)
                        .font(.body)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }

            PremiumButton(title: AuthStrings.loginTitle) {
                dismiss()
            }

            Spacer(minLength: Spacing.xxxl)
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
                infoBanner(message: notice)
            }

            SolennixTextField(
                label: AuthStrings.registerNameLabel,
                text: Binding(
                    get: { viewModel?.name ?? "" },
                    set: { viewModel?.name = $0 }
                ),
                placeholder: AuthStrings.registerNamePlaceholder,
                leftIcon: "person",
                textContentType: .name
            )

            SolennixTextField(
                label: AuthStrings.registerEmailLabel,
                text: Binding(
                    get: { viewModel?.email ?? "" },
                    set: { viewModel?.email = $0 }
                ),
                placeholder: AuthStrings.registerEmailPlaceholder,
                leftIcon: "envelope",
                textContentType: .emailAddress,
                keyboardType: .emailAddress,
                autocapitalization: .never
            )

            SolennixTextField(
                label: AuthStrings.registerPasswordLabel,
                text: Binding(
                    get: { viewModel?.password ?? "" },
                    set: { viewModel?.password = $0 }
                ),
                placeholder: AuthStrings.registerPasswordPlaceholder,
                leftIcon: "lock",
                isSecure: true,
                textContentType: .newPassword
            )

            SolennixTextField(
                label: AuthStrings.registerConfirmPasswordLabel,
                text: Binding(
                    get: { viewModel?.confirmPassword ?? "" },
                    set: { viewModel?.confirmPassword = $0 }
                ),
                placeholder: AuthStrings.registerConfirmPasswordPlaceholder,
                leftIcon: "lock",
                isSecure: true,
                // No content type on the confirm field — setting .newPassword here causes
                // iOS to auto-fill both fields with the same suggestion, defeating the
                // confirmation purpose. The first password field keeps .newPassword.
                textContentType: nil
            )
        }
        .onSubmit {
            Task { await viewModel?.signUp() }
        }
    }

    // MARK: - Terms Text

    private var termsText: some View {
        HStack(spacing: 4) {
            Text(AuthStrings.registerTermsIntro)
                .foregroundStyle(SolennixColors.textSecondary)

            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.terms)
            } label: {
                Text(AuthStrings.registerTermsLink)
                    .foregroundStyle(SolennixColors.primary)
                    .underline()
            }
            .buttonStyle(.plain)
            .accessibilityHint(AuthStrings.registerTermsHint)

            Text(AuthStrings.registerAnd)
                .foregroundStyle(SolennixColors.textSecondary)

            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.privacy)
            } label: {
                Text(AuthStrings.registerPrivacyLink)
                    .foregroundStyle(SolennixColors.primary)
                    .underline()
            }
            .buttonStyle(.plain)
            .accessibilityHint(AuthStrings.registerPrivacyHint)
        }
        .font(.caption)
        .multilineTextAlignment(.center)
    }

    // MARK: - Divider with Text

    private var dividerWithText: some View {
        HStack(spacing: Spacing.md) {
            Rectangle()
                .fill(SolennixColors.separator)
                .frame(height: 1)

            Text(AuthStrings.registerOrSeparator)
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
            // Apple Sign In — native button required by App Store review guidelines.
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                Task { await viewModel?.handleAppleSignInResult(result) }
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .disabled(viewModel?.isLoading ?? false)

            // Google Sign In
            Button {
                Task { await viewModel?.triggerGoogleSignIn() }
            } label: {
                HStack(spacing: Spacing.sm) {
                    Text("G")
                        .font(.title3)
                        .fontWeight(.bold)
                        // Google brand red #DB4437 — brand identity requirement, not a semantic color.
                        .foregroundStyle(Color(red: 0.859, green: 0.267, blue: 0.216))
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

    // MARK: - Login Link

    private var loginLink: some View {
        Button {
            dismiss()
        } label: {
            HStack(spacing: Spacing.xs) {
                Text(AuthStrings.registerHasAccount)
                    .foregroundStyle(SolennixColors.textSecondary)
                Text(AuthStrings.registerSignIn)
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

    private func infoBanner(message: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Text(message)
                .font(.subheadline)
                // info (blue) — "verify email" is informational, not a completion state.
                .foregroundStyle(SolennixColors.info)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.sm + 4)
        .background(SolennixColors.infoBg)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(SolennixColors.info)
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

// MARK: - Feature Pill

private struct FeaturePill: View {
    let icon: String
    let text: String
    let description: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.body)
                // Navy on gold for legibility (≥4.9:1 on both gradient ends).
                .foregroundStyle(SolennixColors.onPrimary)
                .frame(width: 36, height: 36)
                // Translucent navy chip — decorative, low-opacity.
                .background(SolennixColors.onPrimary.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(text)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.onPrimary)

                Text(description)
                    .font(.caption)
                    // Reduced opacity for hierarchy; still readable against gold.
                    .foregroundStyle(SolennixColors.onPrimary)
            }
        }
    }
}

// MARK: - Preview

#Preview("iPhone") {
    NavigationStack {
        RegisterView()
    }
    .environment(AuthManager())
}

#Preview("iPad") {
    NavigationStack {
        RegisterView()
    }
    .environment(AuthManager())
}

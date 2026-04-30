import SwiftUI
import SolennixDesign
import SolennixNetwork

// MARK: - Forgot Password View

public struct ForgotPasswordView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dismiss) private var dismiss

    @State private var viewModel: AuthViewModel?

    public init() {}

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
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
        .navigationTitle(tr("auth.forgot_password.title", "Recuperar contraseña"))
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
        HStack(spacing: 0) {
            // Left brand panel (40%)
            brandPanel
                .frame(maxWidth: .infinity)
                .frame(width: UIScreen.main.bounds.width * 0.4)

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

                Text(tr("auth.forgot_password.brand.subtitle", "Recupera el acceso a tu cuenta"))
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.85))

                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "envelope.open.fill")
                            .font(.body)
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(.white.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

                        Text(tr("auth.forgot_password.brand.feature_email", "Te enviaremos un enlace seguro"))
                            .font(.body)
                            .foregroundStyle(.white)
                    }

                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "lock.shield.fill")
                            .font(.body)
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(.white.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

                        Text(tr("auth.forgot_password.brand.feature_secure", "Tus datos siempre protegidos"))
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
                Image(systemName: "envelope.open.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(SolennixColors.primary)

                Text(tr("auth.forgot_password.subtitle", "Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña."))
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
                label: tr("auth.forgot_password.email_label", "Correo electrónico"),
                text: Binding(
                    get: { viewModel?.email ?? "" },
                    set: { viewModel?.email = $0 }
                ),
                placeholder: tr("auth.forgot_password.email_placeholder", "tu@email.com"),
                leftIcon: "envelope",
                textContentType: .emailAddress,
                keyboardType: .emailAddress,
                autocapitalization: .never
            )

            PremiumButton(
                title: tr("auth.forgot_password.submit", "Enviar enlace"),
                isLoading: viewModel?.isLoading ?? false,
                isDisabled: !(viewModel?.isForgotValid ?? false)
            ) {
                Task { await viewModel?.forgotPassword() }
            }

            Button {
                dismiss()
            } label: {
                Text(tr("auth.forgot_password.back_to_login", "Volver al inicio de sesión"))
                    .font(.body)
                    .foregroundStyle(SolennixColors.primary)
            }
        }
    }

    // MARK: - Success State

    private var successState: some View {
        VStack(spacing: Spacing.xl) {
            Spacer(minLength: Spacing.xxxl)

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(SolennixColors.success)

            VStack(spacing: Spacing.sm) {
                Text(tr("auth.forgot_password.success_title", "Revisa tu correo"))
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Text(tr("auth.forgot_password.success_message", "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."))
                    .font(.body)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                dismiss()
            } label: {
                Text(tr("auth.forgot_password.back_to_login", "Volver al inicio de sesión"))
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
        ForgotPasswordView()
    }
    .environment(AuthManager())
}

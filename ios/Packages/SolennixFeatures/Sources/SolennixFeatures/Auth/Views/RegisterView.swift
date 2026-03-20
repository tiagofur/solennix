import SwiftUI
import AuthenticationServices
import SolennixDesign
import SolennixNetwork

// MARK: - Register View

public struct RegisterView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

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
        .background(SolennixColors.background.ignoresSafeArea())
        .navigationTitle("Crear Cuenta")
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
                formContent

                termsText

                PremiumButton(
                    title: "Crear Cuenta",
                    isLoading: viewModel?.isLoading ?? false,
                    isDisabled: !(viewModel?.isRegisterValid ?? false)
                ) {
                    Task { await viewModel?.signUp() }
                }

                dividerWithText

                appleSignInButton

                loginLink
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.xl)
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
                    Spacer(minLength: Spacing.xxl)

                    Text("Crear Cuenta")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    formContent
                        .frame(maxWidth: 440)

                    termsText
                        .frame(maxWidth: 440)

                    PremiumButton(
                        title: "Crear Cuenta",
                        isLoading: viewModel?.isLoading ?? false,
                        isDisabled: !(viewModel?.isRegisterValid ?? false)
                    ) {
                        Task { await viewModel?.signUp() }
                    }
                    .frame(maxWidth: 440)

                    dividerWithText
                        .frame(maxWidth: 440)

                    appleSignInButton
                        .frame(maxWidth: 440)

                    loginLink

                    Spacer(minLength: Spacing.xxl)
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
                Text("Unete a Solennix")
                    .font(.solennixSubtitle)
                    .foregroundStyle(.white)

                Text("Tu plataforma para gestionar eventos de manera profesional")
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.85))

                VStack(alignment: .leading, spacing: Spacing.md) {
                    FeaturePill(icon: "gift.fill", text: "Gratis", description: "Comienza sin costo")
                    FeaturePill(icon: "lock.shield.fill", text: "Seguro", description: "Tus datos protegidos")
                    FeaturePill(icon: "arrow.up.right", text: "Escalable", description: "Crece a tu ritmo")
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

            SolennixTextField(
                label: "Nombre",
                text: Binding(
                    get: { viewModel?.name ?? "" },
                    set: { viewModel?.name = $0 }
                ),
                placeholder: "Tu nombre completo",
                leftIcon: "person",
                textContentType: .name
            )

            SolennixTextField(
                label: "Correo electronico",
                text: Binding(
                    get: { viewModel?.email ?? "" },
                    set: { viewModel?.email = $0 }
                ),
                placeholder: "tu@email.com",
                leftIcon: "envelope",
                textContentType: .emailAddress,
                keyboardType: .emailAddress,
                autocapitalization: .never
            )

            SolennixTextField(
                label: "Contrasena",
                text: Binding(
                    get: { viewModel?.password ?? "" },
                    set: { viewModel?.password = $0 }
                ),
                placeholder: "Minimo 6 caracteres",
                leftIcon: "lock",
                isSecure: true,
                textContentType: .newPassword
            )

            SolennixTextField(
                label: "Confirmar contrasena",
                text: Binding(
                    get: { viewModel?.confirmPassword ?? "" },
                    set: { viewModel?.confirmPassword = $0 }
                ),
                placeholder: "Repite tu contrasena",
                leftIcon: "lock",
                isSecure: true,
                textContentType: .newPassword
            )
        }
        .onSubmit {
            Task { await viewModel?.signUp() }
        }
    }

    // MARK: - Terms Text

    private var termsText: some View {
        Text("Al registrarte aceptas nuestros ")
            .foregroundStyle(SolennixColors.textSecondary)
        + Text("Terminos")
            .foregroundStyle(SolennixColors.primary)
            .underline()
        + Text(" y ")
            .foregroundStyle(SolennixColors.textSecondary)
        + Text("Politica de Privacidad")
            .foregroundStyle(SolennixColors.primary)
            .underline()
    }

    // MARK: - Divider with Text

    private var dividerWithText: some View {
        HStack(spacing: Spacing.md) {
            Rectangle()
                .fill(SolennixColors.separator)
                .frame(height: 1)

            Text("o continua con")
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)
                .fixedSize()

            Rectangle()
                .fill(SolennixColors.separator)
                .frame(height: 1)
        }
    }

    // MARK: - Apple Sign In

    private var appleSignInButton: some View {
        SignInWithAppleButton(.signUp) { request in
            request.requestedScopes = [.fullName, .email]
        } onCompletion: { _ in
            // Apple Sign In handled via AppleSignInService in a real implementation
        }
        .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
        .frame(height: 50)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Login Link

    private var loginLink: some View {
        Button {
            dismiss()
        } label: {
            HStack(spacing: Spacing.xs) {
                Text("Ya tienes cuenta?")
                    .foregroundStyle(SolennixColors.textSecondary)
                Text("Inicia sesion")
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
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(.white.opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(text)
                    .font(.headline)
                    .foregroundStyle(.white)

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
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

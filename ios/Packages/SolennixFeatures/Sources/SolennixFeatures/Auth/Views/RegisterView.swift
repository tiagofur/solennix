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
        .navigationTitle(tr("auth.register.title", "Crear cuenta"))
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
                formContent

                termsText

                PremiumButton(
                    title: tr("auth.register.submit", "Crear cuenta"),
                    isLoading: viewModel?.isLoading ?? false,
                    isDisabled: !(viewModel?.isRegisterValid ?? false)
                ) {
                    Task { await viewModel?.signUp() }
                }

                dividerWithText

                socialSignInButtons

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

                    Text(tr("auth.register.title", "Crear cuenta"))
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    formContent
                        .frame(maxWidth: 440)

                    termsText
                        .frame(maxWidth: 440)

                    PremiumButton(
                        title: tr("auth.register.submit", "Crear cuenta"),
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
                Text(tr("auth.register.brand.title", "Únete a Solennix"))
                    .font(.solennixSubtitle)
                    .foregroundStyle(.white)

                Text(tr("auth.register.brand.subtitle", "Tu plataforma para gestionar eventos de manera profesional"))
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.85))

                VStack(alignment: .leading, spacing: Spacing.md) {
                    FeaturePill(icon: "gift.fill", text: tr("auth.register.feature.free", "Gratis"), description: tr("auth.register.feature.free_desc", "Comienza sin costo"))
                    FeaturePill(icon: "lock.shield.fill", text: tr("auth.register.feature.secure", "Seguro"), description: tr("auth.register.feature.secure_desc", "Tus datos protegidos"))
                    FeaturePill(icon: "arrow.up.right", text: tr("auth.register.feature.scalable", "Escalable"), description: tr("auth.register.feature.scalable_desc", "Crece a tu ritmo"))
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
                label: tr("auth.register.name_label", "Nombre completo"),
                text: Binding(
                    get: { viewModel?.name ?? "" },
                    set: { viewModel?.name = $0 }
                ),
                placeholder: tr("auth.register.name_placeholder", "Tu nombre"),
                leftIcon: "person",
                textContentType: .name
            )

            SolennixTextField(
                label: tr("auth.register.email_label", "Correo electrónico"),
                text: Binding(
                    get: { viewModel?.email ?? "" },
                    set: { viewModel?.email = $0 }
                ),
                placeholder: tr("auth.register.email_placeholder", "tu@email.com"),
                leftIcon: "envelope",
                textContentType: .emailAddress,
                keyboardType: .emailAddress,
                autocapitalization: .never
            )

            SolennixTextField(
                label: tr("auth.register.password_label", "Contraseña"),
                text: Binding(
                    get: { viewModel?.password ?? "" },
                    set: { viewModel?.password = $0 }
                ),
                placeholder: tr("auth.register.password_placeholder", "Mínimo 8 caracteres"),
                leftIcon: "lock",
                isSecure: true,
                textContentType: .newPassword
            )

            SolennixTextField(
                label: tr("auth.register.confirm_password_label", "Confirmar contraseña"),
                text: Binding(
                    get: { viewModel?.confirmPassword ?? "" },
                    set: { viewModel?.confirmPassword = $0 }
                ),
                placeholder: tr("auth.register.confirm_password_placeholder", "Repite tu contraseña"),
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
        HStack(spacing: 4) {
            Text(tr("auth.register.terms_intro", "Al registrarte aceptas nuestros"))
                .foregroundStyle(SolennixColors.textSecondary)

            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.terms)
            } label: {
                Text(tr("auth.register.terms_link", "Términos"))
                    .foregroundStyle(SolennixColors.primary)
                    .underline()
            }
            .buttonStyle(.plain)
            .accessibilityHint(tr("auth.register.terms_hint", "Abre los términos de uso en Safari"))

            Text(tr("auth.register.and", "y"))
                .foregroundStyle(SolennixColors.textSecondary)

            Button {
                HapticsHelper.play(.selection)
                legalSheetURL = IdentifiableURL(LegalURL.privacy)
            } label: {
                Text(tr("auth.register.privacy_link", "Privacidad"))
                    .foregroundStyle(SolennixColors.primary)
                    .underline()
            }
            .buttonStyle(.plain)
            .accessibilityHint(tr("auth.register.privacy_hint", "Abre la política de privacidad en Safari"))
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

            Text(tr("auth.register.or_separator", "o continuá con"))
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
                    Text(tr("auth.social.apple.continue", "Continuar con Apple"))
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
                    Text(tr("auth.social.google.continue", "Continuar con Google"))
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
                Text(tr("auth.register.has_account", "¿Ya tienes cuenta?"))
                    .foregroundStyle(SolennixColors.textSecondary)
                Text(tr("auth.register.sign_in", "Iniciar sesión"))
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

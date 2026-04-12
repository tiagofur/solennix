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
        HStack(spacing: 0) {
            // Left brand panel (40%)
            brandPanel
                .frame(maxWidth: .infinity)
                .frame(width: UIScreen.main.bounds.width * 0.4)

            // Right form panel (60%)
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    Spacer(minLength: Spacing.xxxl)

                    Text("Inicia sesion")
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

    // MARK: - Brand Header (iPhone)

    private var brandHeader: some View {
        VStack(spacing: Spacing.sm) {
            Text("Solennix")
                .font(.solennixTitle)
                .foregroundStyle(SolennixColors.primary)

            Text("CADA DETALLE IMPORTA")
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

                Text("Cada detalle importa")
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.85))

                VStack(alignment: .leading, spacing: Spacing.md) {
                    BrandFeatureRow(icon: "calendar", text: "Gestiona eventos de principio a fin")
                    BrandFeatureRow(icon: "person.2.fill", text: "CRM integrado para tus clientes")
                    BrandFeatureRow(icon: "chart.bar.fill", text: "Reportes financieros en tiempo real")
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
                placeholder: "Tu contrasena",
                leftIcon: "lock",
                isSecure: true,
                textContentType: .password
            )

            PremiumButton(
                title: "Iniciar Sesion",
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
            Text("Olvidaste tu contrasena?")
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

            Text("o continua con")
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
                    Text("Continuar con Apple")
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
                    Text("Continuar con Google")
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
                Text("No tienes cuenta?")
                    .foregroundStyle(SolennixColors.textSecondary)
                Text("Registrate")
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

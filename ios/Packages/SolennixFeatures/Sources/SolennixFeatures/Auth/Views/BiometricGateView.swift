import SwiftUI
import LocalAuthentication
import SolennixDesign
import SolennixNetwork

// MARK: - Biometric Gate View

/// Shown when `authState == .biometricLocked`. Prompts the user for Face ID / Touch ID
/// to unlock the app, with a fallback to password-based login.
public struct BiometricGateView: View {

    @Environment(AuthManager.self) private var authManager

    @State private var biometricType: BiometricType = .none
    @State private var errorMessage: String?

    @ScaledMetric(relativeTo: .largeTitle) private var iconSize: CGFloat = 64

    public init() {}

    public var body: some View {
        biometricContent
            .onAppear {
                biometricType = detectBiometricType()
                // Auto-prompt on appear
                Task { await authenticate() }
            }
    }

    // MARK: - Content

    private var biometricContent: some View {
        VStack(spacing: Spacing.xxl) {
            Spacer()

            // App logo / brand
            VStack(spacing: Spacing.md) {
                Text("Solennix")
                    .font(.solennixTitle)
                    .foregroundStyle(SolennixColors.primary)

                Text(AuthStrings.biometricBrandTagline)
                    .font(.caption)
                    .fontWeight(.light)
                    .tracking(5.5)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()

            // Biometric icon
            VStack(spacing: Spacing.lg) {
                Image(systemName: biometricIconName)
                    .font(.system(size: iconSize))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(SolennixColors.primary)

                Text(AuthStrings.biometricUnlockTitle)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                // Error message
                if let errorMessage {
                    Text(errorMessage)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                        .multilineTextAlignment(.center)
                }
            }

            Spacer()

            // Actions
            VStack(spacing: Spacing.md) {
                PremiumButton(title: biometricButtonTitle) {
                    Task { await authenticate() }
                }
                .accessibilityLabel(biometricButtonTitle)

                Button {
                    // Transition to login WITHOUT invalidating the server session.
                    // signOut() would revoke tokens on all devices — that is wrong
                    // for a biometric fallback where the user still has a valid session.
                    // presentPasswordFallback() clears only the local biometric gate and
                    // sets authState = .unauthenticated so the router shows LoginView.
                    authManager.presentPasswordFallback()
                } label: {
                    Text(AuthStrings.biometricButtonPassword)
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                }
                .accessibilityLabel(AuthStrings.biometricButtonPassword)
            }
            .padding(.bottom, Spacing.xxl)
        }
        .padding(.horizontal, Spacing.xl)
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
    }

    // MARK: - Biometric Type Detection

    private enum BiometricType {
        case faceID
        case touchID
        case none
    }

    private func detectBiometricType() -> BiometricType {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }
        switch context.biometryType {
        case .faceID:
            return .faceID
        case .touchID:
            return .touchID
        default:
            return .none
        }
    }

    private var biometricIconName: String {
        switch biometricType {
        case .faceID:
            return "faceid"
        case .touchID:
            return "touchid"
        case .none:
            return "lock.fill"
        }
    }

    private var biometricButtonTitle: String {
        switch biometricType {
        case .faceID:
            return AuthStrings.biometricButtonFaceID
        case .touchID:
            return AuthStrings.biometricButtonTouchID
        case .none:
            return AuthStrings.biometricButtonUnlock
        }
    }

    // MARK: - Authentication

    @MainActor
    private func authenticate() async {
        errorMessage = nil
        do {
            let success = try await authManager.authenticateWithBiometrics()
            if success {
                // AuthManager should transition state to .authenticated
                // after successful biometric auth. Trigger session restore.
                await authManager.checkAuth()
            }
        } catch {
            if let laError = error as? LAError, laError.code == .userCancel {
                // User cancelled — no error message needed
                return
            }
            errorMessage = AuthStrings.biometricErrorAuthFailed
        }
    }
}

// MARK: - Preview

#Preview {
    BiometricGateView()
        .environment(AuthManager())
}

import SwiftUI
import CoreSpotlight
import GoogleSignIn
import SolennixCore
import SolennixNetwork
import SolennixDesign
import SolennixFeatures

// MARK: - Content View

/// DEBUG-only launch-arg gate used by UI tests to render the main layout without
/// going through auth (the app is otherwise auth-gated). Compiled out in Release
/// so it can never affect production. Set via `SOLX_UI_TEST_BYPASS_AUTH=1` in the
/// app's launch environment.
#if DEBUG
private enum SolennixUITestBypass {
    static let authBypassEnabled =
        ProcessInfo.processInfo.environment["SOLX_UI_TEST_BYPASS_AUTH"] == "1"
}
#endif

/// The root view of the app. Switches between auth, biometric gate,
/// splash, and the main layout based on `AuthManager.authState`.
struct ContentView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.apiClient) private var apiClient
    @Environment(NetworkMonitor.self) private var networkMonitor
    @Environment(\.horizontalSizeClass) private var sizeClass

    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    @State private var deepLinkResetToken: String?
    @State private var deepLinkTeamInviteToken: String?
    @State private var pendingSpotlightRoute: Route?

    var body: some View {
        VStack(spacing: 0) {
            // MARK: - Offline Banner
            if !networkMonitor.isConnected {
                offlineBanner
            }

            Group {
                #if DEBUG
                if SolennixUITestBypass.authBypassEnabled {
                    // UI-test bypass: render the main layout directly (no auth) so
                    // the bottom-nav slot fit can be validated against the REAL
                    // `CompactTabLayout`. Compiled out in Release builds.
                    mainLayout
                } else {
                    authDrivenContent
                }
                #else
                authDrivenContent
                #endif
            }
            .frame(maxHeight: .infinity)
        }
        .animation(.easeInOut(duration: 0.3), value: networkMonitor.isConnected)
        .fullScreenCover(isPresented: onboardingBinding) {
            OnboardingView()
        }
        .onOpenURL { url in
            GIDSignIn.sharedInstance.handle(url)
            handleDeepLink(url)
        }
        .onReceive(NotificationCenter.default.publisher(for: .spotlightNavigationRequested)) { notification in
            guard authManager.isAuthenticated,
                  let route = notification.userInfo?["route"] as? Route else { return }
            pendingSpotlightRoute = route
        }
        .onAppear {
            WidgetDataSync.shared.syncUserPlan(authManager.currentUser?.plan.rawValue)
        }
        .onChange(of: authManager.currentUser?.plan.rawValue) { _, newValue in
            WidgetDataSync.shared.syncUserPlan(newValue)
        }
    }

    // MARK: - Offline Banner

    /// Banner shown at the top of the screen when the device has no network connectivity.
    private var offlineBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .font(.subheadline)

            Text("Sin conexion - Mostrando datos guardados")
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .padding(.horizontal, 16)
        .background(SolennixColors.warning)
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    // MARK: - Main Layout

    /// Adaptive layout:
    /// - iPhone (compact): always tabs
    /// - iPad portrait: tabs (like iPhone)
    /// - iPad landscape: sidebar split
    @ViewBuilder
    private var mainLayout: some View {
        if sizeClass == .compact {
            CompactTabLayout(apiClient: apiClient, pendingSpotlightRoute: $pendingSpotlightRoute)
        } else {
            GeometryReader { geo in
                if geo.size.width > geo.size.height {
                    SidebarSplitLayout(pendingSpotlightRoute: $pendingSpotlightRoute)
                } else {
                    CompactTabLayout(apiClient: apiClient, pendingSpotlightRoute: $pendingSpotlightRoute)
                }
            }
        }
    }

    @ViewBuilder
    private var authenticatedLayout: some View {
        if authManager.currentUser?.role == "team_member" {
            TeamMemberPortalView(apiClient: apiClient)
        } else {
            mainLayout
        }
    }

    /// The production auth-driven content switch (bypassed only under the DEBUG
    /// UI-test gate above).
    @ViewBuilder
    private var authDrivenContent: some View {
        switch authManager.authState {
        case .unknown:
            SplashView()

        case .unauthenticated:
            AuthFlowView(
                deepLinkResetToken: $deepLinkResetToken,
                deepLinkTeamInviteToken: $deepLinkTeamInviteToken
            )

        case .biometricLocked:
            BiometricGateView()

        case .authenticated:
            authenticatedLayout
        }
    }

    /// Onboarding cover binding. Suppressed under the DEBUG UI-test bypass so the
    /// real tab layout is directly inspectable.
    private var onboardingBinding: Binding<Bool> {
        Binding(
            get: {
                #if DEBUG
                return !hasSeenOnboarding && !SolennixUITestBypass.authBypassEnabled
                #else
                return !hasSeenOnboarding
                #endif
            },
            set: { newValue in hasSeenOnboarding = !newValue }
        )
    }

    // MARK: - Deep Link Handling

    private func handleDeepLink(_ url: URL) {
        guard let action = DeepLinkHandler.handle(url) else { return }

        switch action {
        case .resetPassword(let token):
            deepLinkResetToken = token
        case .teamInvite(let token):
            deepLinkTeamInviteToken = token
        }
    }
}

// MARK: - Splash View

/// A minimal splash screen shown while the auth state is being determined.
struct SplashView: View {
    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .controlSize(.large)

            Text("SOLENNIX")
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.primary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SolennixColors.background)
    }
}

// MARK: - Biometric Gate View

/// Shown when the user has tokens but biometric unlock is required.
/// Prompts for Face ID / Touch ID, with a fallback to re-login.
struct BiometricGateView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var showError = false
    @State private var failureCount = 0

    private let maxAttempts = 3

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "faceid")
                .font(.system(size: sizeClass == .regular ? 96 : 64))
                .foregroundStyle(SolennixColors.primary)

            Text("SOLENNIX")
                .font(sizeClass == .regular ? .largeTitle : .title)
                .fontWeight(.bold)

            Text("Desbloquea para continuar")
                .font(sizeClass == .regular ? .body : .subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

            if showError {
                Text("No se pudo verificar tu identidad")
                    .font(.footnote)
                    .foregroundStyle(SolennixColors.error)
            }

            Button("Desbloquear") {
                Task { await authenticate() }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(sizeClass == .regular ? .large : .regular)

            Spacer()

            if failureCount >= maxAttempts {
                Button("Iniciar sesion de nuevo") {
                    // Use signOut() so authState transitions to .unauthenticated
                    // and the full session cleanup path in SolennixApp fires.
                    Task { await authManager.signOut() }
                }
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)
                .padding(.bottom, 32)
            }
        }
        .frame(maxWidth: sizeClass == .regular ? 500 : .infinity, maxHeight: .infinity)
        .frame(maxWidth: .infinity)
        .background(SolennixColors.background)
        .task {
            await authenticate()
        }
    }

    private func authenticate() async {
        do {
            let success = try await authManager.authenticateWithBiometrics()
            if success {
                // The authManager should transition to .authenticated
                // after biometric unlock. We trigger checkAuth to do that.
                await authManager.checkAuth()
            } else {
                failureCount += 1
                showError = true
            }
        } catch {
            failureCount += 1
            showError = true
            if failureCount >= maxAttempts {
                // Use signOut() so authState transitions to .unauthenticated
                // and the full session cleanup path in SolennixApp fires.
                Task { await authManager.signOut() }
            }
        }
    }
}

// MARK: - Preview

#Preview("Authenticated - Compact") {
    let keychain = KeychainHelper.standard
    let auth = AuthManager(keychain: keychain)

    ContentView()
        .environment(auth)
}

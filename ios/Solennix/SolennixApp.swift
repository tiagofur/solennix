import SwiftUI
import SwiftData
import CoreSpotlight
import BackgroundTasks
import GoogleSignIn
import SolennixCore
import SolennixNetwork
import SolennixDesign
import SolennixFeatures

// NOTE: APIClient EnvironmentKey is defined in SolennixNetwork/APIClientEnvironmentKey.swift.
// Do NOT redeclare it here — that would shadow the package's public key and cause
// feature modules (which import SolennixNetwork) to read a different default value.

// MARK: - App Entry Point

@main
struct SolennixApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var authManager: AuthManager
    @State private var planLimitsManager: PlanLimitsManager
    @State private var subscriptionManager = SubscriptionManager()
    @State private var toastManager = ToastManager()
    @State private var networkMonitor = NetworkMonitor()
    @State private var cacheManager: CacheManager?
    @State private var backgroundTaskManager: BackgroundTaskManager?

    @AppStorage("appearance") private var appearance: String = "system"
    @AppStorage("hasRequestedPushAuthorization") private var hasRequestedPushAuthorization = false
    /// Session-identity epoch for nav state restoration (ios-lifecycle PR-B / B4).
    /// Incremented in `performSessionCleanup`; the nav layouts discard any
    /// persisted navigation whose epoch no longer matches, so a second user can
    /// never land on the first user's restored navigation. Stored via
    /// `@AppStorage` (UserDefaults.standard — reliably writable, not scene-mangled).
    @AppStorage(NavSession.resetEpoch) private var sessionEpoch: Int = 0
    @Environment(\.scenePhase) private var scenePhase

    /// The SwiftData model container for offline caching.
    private let modelContainer: ModelContainer

    /// The shared API client instance.
    private let apiClient: APIClient

    /// Reports the device's system language to the backend on launch / locale change.
    /// Throttled via `UserDefaults.lastReportedLanguage` (see `LanguageReporter`).
    private let languageReporter: LanguageReporter

    // MARK: - Init

    init() {
        #if DEBUG
        Self.applyUITestLaunchDefaults()
        #endif

        let keychain = KeychainHelper.standard
        let baseURL = URL(string: "https://api.solennix.com/api")!
        let client = APIClient(baseURL: baseURL, keychainHelper: keychain)
        let auth = AuthManager(keychain: keychain)
        auth.apiClient = client
        auth.userTrackingDelegate = SentryUserTrackingDelegate.shared

        let limits = PlanLimitsManager(apiClient: client)
        limits.setAuthManager(auth)

        let subManager = SubscriptionManager()
        let info = Bundle.main.infoDictionary
        let revenueCatAPIKey = (info?["REVENUECAT_PUBLIC_API_KEY"] as? String) ?? ""
        subManager.configure(apiKey: revenueCatAPIKey)
        subManager.delegate = SentrySubscriptionDelegate.shared

        auth.signOutDelegate = AppSignOutDelegate.shared

        _authManager = State(initialValue: auth)
        _planLimitsManager = State(initialValue: limits)
        _subscriptionManager = State(initialValue: subManager)
        self.apiClient = client
        self.languageReporter = LanguageReporter(authManager: auth)

        // Wire APIClient into LiveActivityManager for push token registration.
        LiveActivityManager.shared.configure(apiClient: client)

        // Configure Google Sign-In — client ID read from Info.plist (set via GOOGLE_CLIENT_ID in xcconfig).
        let googleClientID = (info?["GOOGLE_CLIENT_ID"] as? String) ?? ""
        if googleClientID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            SentryHelper.capture(message: "Google client ID missing: set GOOGLE_CLIENT_ID in Secrets.xcconfig.")
        }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: googleClientID)

        // Configure Tab Bar appearance globally
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor(SolennixColors.tabBarBackground)
        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance

        // Navigation bar appearance is intentionally left to SwiftUI defaults.
        // A global UINavigationBarAppearance with opaque background + equal
        // standard/scrollEdge appearances breaks large-title rendering and the
        // collapse-to-inline behavior on scroll. SwiftUI's default gives us the
        // Apple-native look (transparent at rest with large title, blurred when
        // scrolled) across every tab.

        // Configure TipKit for Onboarding
        TipsHelper.configure()

        // Configure Sentry
        let sentryDSN = info?["SENTRY_DSN"] as? String
        let sentryEnvironment = (info?["SENTRY_ENVIRONMENT"] as? String) ?? "development"
        let releaseName = "ios@\(Bundle.main.appVersion)+\(Bundle.main.buildNumber)"
        SentryHelper.configure(dsn: sentryDSN, environment: sentryEnvironment, releaseName: releaseName)
        if revenueCatAPIKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            SentryHelper.capture(message: "RevenueCat key missing: set REVENUECAT_PUBLIC_API_KEY in build settings.")
        }

        // Configure SwiftData for offline caching. If the container cannot be
        // created (persistent + in-memory both fail), report to Sentry before
        // terminating so we get real diagnostics instead of an opaque crash.
        do {
            self.modelContainer = try SolennixModelContainer.create { fallbackError in
                // Persistent store failed but in-memory fallback succeeded: the
                // app runs in degraded mode (data not persisted). Route to Sentry
                // so we get real diagnostics instead of silent data loss.
                SentryHelper.capture(
                    error: fallbackError,
                    context: "SwiftData persistent store failed; fell back to in-memory"
                )
            }
        } catch {
            SentryHelper.capture(
                error: error,
                context: "SwiftData container init failed (persistent + in-memory fallback)"
            )
            fatalError("[Solennix] SwiftData container init failed irrecoverably: \(error)")
        }
    }

    // MARK: - Scene

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
                .environment(planLimitsManager)
                .environment(subscriptionManager)
                .environment(\.apiClient, apiClient)
                .environment(toastManager)
                .toastOverlay(toastManager)
                .environment(networkMonitor)
                .modelContainer(modelContainer)
                .preferredColorScheme(resolvedColorScheme)
                .task {
                    // Initialize CacheManager with the model context
                    if cacheManager == nil {
                        let cache = CacheManager(
                            modelContext: modelContainer.mainContext
                        )
                        cacheManager = cache
                        // Start the widget sync coordinator now that the cache
                        // is available. CRUD/foreground/locale triggers keep
                        // widget timelines fresh from the local cache
                        // (REQ-WDS-03 amended). Idempotent on re-entry.
                        WidgetSyncCoordinator.shared.start(
                            cache: cache,
                            isAuthorized: { [authManager] in authManager.isAuthenticated }
                        )
                        // Cold-launch sync so widgets reflect cached data
                        // immediately (the scene-activated trigger may race
                        // coordinator registration).
                        if authManager.isAuthenticated {
                            WidgetSyncCoordinator.shared.syncAll()
                        }

                        // Wire the BackgroundTaskManager in the SAME .task that
                        // builds the cache (issue #813). Previously the manager
                        // was constructed in a separate .task and captured a
                        // possibly-nil cacheManager, so background refresh
                        // couldn't persist data until the next app launch.
                        // Building both here guarantees the manager sees a
                        // non-nil cache before any BG refresh can fire.
                        if backgroundTaskManager == nil {
                            let manager = BackgroundTaskManager(
                                apiClient: apiClient,
                                authManager: authManager
                            )
                            manager.attach(cache: cache)
                            BackgroundTaskManager.shared = manager
                            manager.scheduleAppRefresh()
                            backgroundTaskManager = manager
                        } else {
                            backgroundTaskManager?.attach(cache: cache)
                        }
                    }
                }
                .environment(cacheManager)
                .task {
                    // Wire NotificationManager's auth gate early so cold-start
                    // notification taps resolve against AuthManager.isAuthenticated.
                    NotificationManager.shared.isAuthorizedForNavigation = { [authManager] in
                        authManager.isAuthenticated
                    }
                    // Ensure auth manager is set on the actor before checking auth
                    await apiClient.setAuthManager(authManager)
                    await authManager.checkAuth()

                    // Login to RevenueCat with user ID so entitlements are synced
                    if let user = authManager.currentUser {
                        await subscriptionManager.login(userID: user.id)
                        // If backend says pro but RC doesn't know yet (web purchase),
                        // force premium status locally
                        if user.plan != .basic {
                            subscriptionManager.setBackendPremiumStatus(true)
                        }
                        await apiClient.flushQueuedMutations()
                    }

                    // Report the device's system language to the backend (throttled —
                    // only fires when it changed since the last successful report).
                    if authManager.isAuthenticated {
                        await languageReporter.reportIfNeeded()
                    }
                }
                .task {
                    // Load RevenueCat offerings (products with prices)
                    await subscriptionManager.loadOfferings()
                    await subscriptionManager.checkEntitlementStatus()
                }
                .task {
                    await processPendingDeviceTokenRegistration()
                    await syncUpcomingEventNotifications()
                }
                .onChange(of: authManager.authState) { oldState, newState in
                    // Sync RevenueCat when user signs in (fresh login/register/social auth).
                    // The .task above handles session restore at app launch; this covers
                    // transitions that happen AFTER launch — matching Android parity.
                    if case .authenticated(let user) = newState {
                        Task {
                            // Mark the widget extension as authenticated and force a
                            // timeline reload so widgets leave the signed-out state
                            // immediately on login.
                            WidgetDataSync.shared.setAuthState(.authenticated)
                            WidgetDataSync.shared.reloadAllWidgets()
                            await subscriptionManager.login(userID: user.id)
                            if user.plan != .basic {
                                subscriptionManager.setBackendPremiumStatus(true)
                            }
                            await ensurePushAuthorization()
                            await processPendingDeviceTokenRegistration()
                            await apiClient.flushQueuedMutations()
                            await syncUpcomingEventNotifications()
                            // Fresh login: report the system language (throttled).
                            await languageReporter.reportIfNeeded()
                        }
                    }

                    // Session cleanup on logout / account deletion.
                    // Guard: only run when transitioning FROM authenticated — not on cold
                    // launch where the initial state is .unknown → .unauthenticated.
                    if case .unauthenticated = newState,
                       case .authenticated = oldState {
                        Task {
                            await performSessionCleanup()
                        }
                    }
                }
                .onChange(of: networkMonitor.isConnected) { _, isConnected in
                    guard isConnected else { return }

                    // #800: If checkAuth() deferred to .unknown on cold launch with no
                    // connectivity (tokens present, couldn't reach /auth/me), retry now that
                    // the network is back so the session resolves instead of staying stuck.
                    if case .unknown = authManager.authState, authManager.getAccessToken() != nil {
                        Task { await authManager.checkAuth() }
                        return
                    }

                    guard authManager.isAuthenticated else { return }
                    Task {
                        await apiClient.flushQueuedMutations()
                        await syncUpcomingEventNotifications()
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: .deviceTokenReceived)) { notification in
                    guard authManager.isAuthenticated,
                          let token = notification.userInfo?["token"] as? String,
                          !token.isEmpty else { return }
                    Task {
                        await registerDeviceTokenWithBackend(token)
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: NSLocale.currentLocaleDidChangeNotification)) { _ in
                    // The user changed their device language/region in Settings. Report
                    // the new system language (throttled) so the backend stays in sync.
                    // No point reporting for a logged-out user.
                    guard authManager.isAuthenticated else { return }
                    Task {
                        await languageReporter.reportIfNeeded()
                    }
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .background {
                        backgroundTaskManager?.scheduleAppRefresh()
                    } else if newPhase == .active {
                        Task {
                            await syncUpcomingEventNotifications()
                        }
                        // Refresh month-bound data (dashboard KPIs, plan limits) so an app
                        // that was backgrounded across a month boundary doesn't show stale data.
                        // PlanLimitsManager.checkLimits() re-derives the current-month date
                        // range on each call, so this is cheap and safe to call on every
                        // foreground event.
                        if authManager.isAuthenticated {
                            Task {
                                await planLimitsManager.checkLimits()
                            }
                            NotificationCenter.default.post(name: .solennixSceneActivated, object: nil)
                        }
                    }
                }
                .onContinueUserActivity(CSSearchableItemActionType) { userActivity in
                    // Manejar resultado de búsqueda de Core Spotlight
                    guard let action = DeepLinkHandler.handleSpotlight(userActivity) else { return }
                    let route = DeepLinkHandler.route(for: action)
                    NotificationCenter.default.post(
                        name: .spotlightNavigationRequested,
                        object: nil,
                        userInfo: ["route": route]
                    )
                }
        }
    }

    // MARK: - Appearance

    /// Resolves the user's appearance preference to a SwiftUI `ColorScheme`.
    private var resolvedColorScheme: ColorScheme? {
        switch appearance {
        case "light": return .light
        case "dark":  return .dark
        default:      return nil // system default
        }
    }

    private func ensurePushAuthorization() async {
        await NotificationManager.shared.checkAuthorizationStatus()
        if NotificationManager.shared.isAuthorized {
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
            return
        }

        guard !hasRequestedPushAuthorization else { return }
        hasRequestedPushAuthorization = true
        let _ = await NotificationManager.shared.requestAuthorization()
    }

    private func processPendingDeviceTokenRegistration() async {
        guard authManager.isAuthenticated else { return }
        guard let token = UserDefaults.standard.string(forKey: "pendingDeviceToken"), !token.isEmpty else { return }
        await registerDeviceTokenWithBackend(token)
    }

    private func registerDeviceTokenWithBackend(_ token: String) async {
        guard authManager.isAuthenticated else { return }
        do {
            let body = ["token": token, "platform": "ios"]
            let _: EmptyResponse = try await apiClient.post(Endpoint.registerDevice, body: body)
            // Clear the pending-retry key and record the successfully registered token
            // so AppSignOutDelegate can unregister it even after the pending key is gone.
            UserDefaults.standard.removeObject(forKey: "pendingDeviceToken")
            UserDefaults.standard.set(token, forKey: "registeredDeviceToken")
        } catch {
            SentryHelper.capture(error: error, context: "push_register_device")
        }
    }

    private func syncUpcomingEventNotifications() async {
        guard authManager.isAuthenticated else { return }
        await NotificationManager.shared.checkAuthorizationStatus()
        guard NotificationManager.shared.isAuthorized else { return }

        do {
            async let upcomingEventsTask: [Event] = apiClient.getAll(
                Endpoint.upcomingEvents,
                params: ["limit": "50"]
            )
            async let clientsTask: [Client] = apiClient.getAll(Endpoint.clients)
            let upcomingEvents = try await upcomingEventsTask
            let clients = try await clientsTask
            let clientNameById = Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0.name) })
            await NotificationManager.shared.syncUpcomingEventReminders(
                events: upcomingEvents,
                clientNamesById: clientNameById
            )
        } catch {
            SentryHelper.capture(error: error, context: "sync_upcoming_event_notifications")
        }
    }

    #if DEBUG
    /// Seeds UserDefaults for UI tests. Launch arguments for `@AppStorage` are unreliable
    /// across the XCUITest runner ↔ app process boundary on CI simulators.
    private static func applyUITestLaunchDefaults() {
        let env = ProcessInfo.processInfo.environment
        guard env["SOLX_UI_TEST_BYPASS_AUTH"] == "1" || env["SOLX_UI_TEST_MOCK_LOGIN"] == "1" else {
            return
        }
        UserDefaults.standard.set(true, forKey: "hasSeenOnboarding")
    }
    #endif

    // MARK: - Session Cleanup

    /// Clears all per-user local state after logout or account deletion.
    /// Must only be called when transitioning FROM authenticated → unauthenticated
    /// (guarded by the onChange observer) so it does not fire on cold launch.
    private func performSessionCleanup() async {
        // 1. Clear SwiftData cache
        try? cacheManager?.clearAll()

        // 2. Mark widgets signed-out BEFORE clearing data keys so the extension
        //    renders the signed-out state (not empty) on the next timeline reload.
        //    clearWidgetData() intentionally preserves the authState key.
        WidgetDataSync.shared.setAuthState(.signedOut)

        // 3. Clear widget shared container and reload widget timelines so widgets
        //    show a logged-out / empty state immediately.
        WidgetDataSync.shared.clearWidgetData()

        // 4. Cancel all pending local event reminders. Payment receipts that already
        //    fired are in Notification Center (delivered) and cannot be removed here
        //    without also removing the legitimate history — leave them as-is.
        NotificationManager.shared.cancelAllPendingNotifications()

        // 5. Reset per-user UserDefaults keys (extracted so tests can verify
        //    which keys survive vs get cleared without driving the full async
        //    cleanup that also touches SwiftData, widgets, and notifications).
        Self.clearPerUserUserDefaults()

        // 6. Clear Core Spotlight index so the next user cannot search previous
        //    user's events, clients, or products from the system search.
        SpotlightIndexer.removeAll()

        // 7. Invalidate persisted navigation state (ios-lifecycle PR-B / B4).
        //    @SceneStorage survives cold launches AND view teardown, so without
        //    an active clear the next user would land on the previous user's
        //    restored tab/section/screens. The deterministic guard is the session
        //    epoch: bumping it makes every nav-restoration modifier discard any
        //    envelope stamped with the old (previous user's) epoch. The
        //    UserDefaults removal below is defense-in-depth (SceneStorage keys
        //    may be scene-mangled, so this is best-effort, not load-bearing).
        sessionEpoch &+= 1
        for key in NavSceneStorage.allKeys {
            UserDefaults.standard.removeObject(forKey: key)
        }

        // Mirror the @AppStorage-backed properties so they take effect immediately
        // (UserDefaults.standard and @AppStorage share the same store, but the
        // @AppStorage wrapper caches the value; resetting via UserDefaults is enough
        // for newly launched views — in-flight views will re-read on next render).
        hasRequestedPushAuthorization = false
    }

    /// Clears the per-user `UserDefaults` keys on logout.
    ///
    /// Extracted from `performSessionCleanup` so tests can verify which keys
    /// are cleared vs preserved without driving the full async cleanup (which
    /// also touches SwiftData, widgets, and notifications).
    ///
    /// Device-scoped keys NOT cleared (survive logout/login on the same device):
    /// - `appearance`: device-wide preference, not user-specific.
    /// - `hasSeenOnboarding`: onboarding completion is per-device, not per-session;
    ///   clearing it forced a full replay on every logout (#810). Parity with
    ///   Android (`has_seen_onboarding` survives signOut).
    internal static func clearPerUserUserDefaults() {
        UserDefaults.standard.removeObject(forKey: "hasRequestedPushAuthorization")
        UserDefaults.standard.removeObject(forKey: "pendingDeviceToken")
        UserDefaults.standard.removeObject(forKey: "registeredDeviceToken")
    }
}

private final class SentryUserTrackingDelegate: UserTrackingDelegate, @unchecked Sendable {
    static let shared = SentryUserTrackingDelegate()
    private init() {}

    func setUser(id: String, email: String, name: String) {
        SentryHelper.setUser(id: id, email: email, name: name)
    }

    func clearUser() {
        SentryHelper.clearUser()
    }
}

private final class SentrySubscriptionDelegate: SubscriptionDelegate, @unchecked Sendable {
    static let shared = SentrySubscriptionDelegate()
    private init() {}

    func subscriptionManager(_ manager: SubscriptionManager, didFailVerificationFor productId: String, transactionId: UInt64) {
        let error = NSError(domain: "com.solennix.SubscriptionError", code: 1001, userInfo: [
            NSLocalizedDescriptionKey: "StoreKit 2 transaction verification failed for \(productId) (ID: \(transactionId))"
        ])
        SentryHelper.capture(error: error, context: "storekit2_verification_failed")
    }
}

// MARK: - App Sign-Out Delegate

/// Implements `SignOutDelegate` to unregister the push device token from the backend
/// while the auth token is still valid (called inside `AuthManager.signOut()` before
/// `clearTokens()`). Errors are swallowed — unregistration is best-effort.
private final class AppSignOutDelegate: SignOutDelegate, @unchecked Sendable {
    static let shared = AppSignOutDelegate()
    private init() {}

    func willClearTokens(apiClient: APIClient) async {
        // Clear persisted search recents so the next user does not inherit them
        // (spec: clear recents on logout).
        SearchViewModel.clearRecentQueriesFromStorage()

        // Prefer the in-memory token (always set while the app is live).
        // NotificationManager is @MainActor, so read deviceToken on the main actor
        // first, then fall back to the UserDefaults key written on successful registration.
        // This covers the case where "pendingDeviceToken" was already removed
        // after a successful register call.
        let liveToken = await MainActor.run { NotificationManager.shared.deviceToken }
        let token: String?
        if let live = liveToken, !live.isEmpty {
            token = live
        } else {
            token = UserDefaults.standard.string(forKey: "registeredDeviceToken")
        }

        guard let token, !token.isEmpty else { return }

        let body = ["token": token, "platform": "ios"]
        _ = try? await apiClient.post(Endpoint.unregisterDevice, body: body) as EmptyResponse

        // Clear the persisted keys so a subsequent user does not inherit them.
        UserDefaults.standard.removeObject(forKey: "registeredDeviceToken")
        UserDefaults.standard.removeObject(forKey: "pendingDeviceToken")
    }
}

private extension Bundle {
    var appVersion: String {
        infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
    }

    var buildNumber: String {
        infoDictionary?["CFBundleVersion"] as? String ?? "0"
    }
}

// MARK: - Spotlight Navigation Notification

extension Notification.Name {
    /// Se publica cuando el usuario toca un resultado de Core Spotlight
    /// y la app necesita navegar a la ruta correspondiente.
    static let spotlightNavigationRequested = Notification.Name("spotlightNavigationRequested")
}

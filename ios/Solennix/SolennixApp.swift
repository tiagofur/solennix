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
    @AppStorage("preferredLocale") private var preferredLocale: String = ""
    @AppStorage("hasRequestedPushAuthorization") private var hasRequestedPushAuthorization = false
    @Environment(\.scenePhase) private var scenePhase

    /// The SwiftData model container for offline caching.
    private let modelContainer: ModelContainer

    /// The shared API client instance.
    private let apiClient: APIClient

    // MARK: - Init

    init() {
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

        _authManager = State(initialValue: auth)
        _planLimitsManager = State(initialValue: limits)
        _subscriptionManager = State(initialValue: subManager)
        self.apiClient = client

        // Wire APIClient into LiveActivityManager for push token registration.
        LiveActivityManager.shared.configure(apiClient: client)

        // Configure Google Sign-In
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: "43149798972-0nn6jdl55fau93m4knb6pts1k2eikan8.apps.googleusercontent.com")

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
            self.modelContainer = try SolennixModelContainer.create()
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
                        cacheManager = CacheManager(
                            modelContext: modelContainer.mainContext
                        )
                    }
                }
                .environment(cacheManager)
                .environment(\.locale, preferredLocale.isEmpty ? .autoupdatingCurrent : Locale(identifier: preferredLocale))
                .task {
                    // Ensure auth manager is set on the actor before checking auth
                    await apiClient.setAuthManager(authManager)
                    await authManager.checkAuth()

                    // Login to RevenueCat with user ID so entitlements are synced
                    if let user = authManager.currentUser {
                        preferredLocale = user.preferredLanguage ?? preferredLocale
                        await subscriptionManager.login(userID: user.id)
                        // If backend says pro but RC doesn't know yet (web purchase),
                        // force premium status locally
                        if user.plan != .basic {
                            subscriptionManager.setBackendPremiumStatus(true)
                        }
                        await apiClient.flushQueuedMutations()
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
                .onChange(of: authManager.authState) { _, newState in
                    // Sync RevenueCat when user signs in (fresh login/register/social auth).
                    // The .task above handles session restore at app launch; this covers
                    // transitions that happen AFTER launch — matching Android parity.
                    if case .authenticated(let user) = newState {
                        Task {
                            preferredLocale = user.preferredLanguage ?? preferredLocale
                            await subscriptionManager.login(userID: user.id)
                            if user.plan != .basic {
                                subscriptionManager.setBackendPremiumStatus(true)
                            }
                            await ensurePushAuthorization()
                            await processPendingDeviceTokenRegistration()
                            await apiClient.flushQueuedMutations()
                            await syncUpcomingEventNotifications()
                        }
                    }
                }
                .onChange(of: networkMonitor.isConnected) { _, isConnected in
                    guard isConnected, authManager.isAuthenticated else { return }
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
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .background {
                        backgroundTaskManager?.scheduleAppRefresh()
                    } else if newPhase == .active {
                        Task {
                            await syncUpcomingEventNotifications()
                        }
                    }
                }
                .task {
                    // BG task handler is registered synchronously in AppDelegate
                    // (iOS requires it before launch completes). Here we only wire up
                    // the manager that resolves dependencies for that handler and
                    // schedules the next refresh.
                    if backgroundTaskManager == nil {
                        let manager = BackgroundTaskManager(apiClient: apiClient, cacheManager: cacheManager)
                        BackgroundTaskManager.shared = manager
                        manager.scheduleAppRefresh()
                        backgroundTaskManager = manager
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
            UserDefaults.standard.removeObject(forKey: "pendingDeviceToken")
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

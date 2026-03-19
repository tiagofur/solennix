import SwiftUI
import SwiftData
import CoreSpotlight
import SolennixCore
import SolennixNetwork
import SolennixDesign
import SolennixFeatures

// MARK: - APIClient Environment Key

/// Custom `EnvironmentKey` for injecting the `APIClient` actor.
///
/// Since `actor` types cannot conform to `@Observable`, we use a
/// traditional `EnvironmentKey` + `EnvironmentValues` extension
/// rather than the `@Environment(Type.self)` pattern.
private struct APIClientKey: EnvironmentKey {
    static let defaultValue: APIClient = APIClient()
}

extension EnvironmentValues {
    /// The shared API client for making network requests.
    var apiClient: APIClient {
        get { self[APIClientKey.self] }
        set { self[APIClientKey.self] = newValue }
    }
}

// MARK: - App Entry Point

@main
struct SolennixApp: App {

    @State private var authManager: AuthManager
    @State private var planLimitsManager: PlanLimitsManager
    @State private var subscriptionManager = SubscriptionManager()
    @State private var toastManager = ToastManager()
    @State private var networkMonitor = NetworkMonitor()
    @State private var cacheManager: CacheManager?

    @AppStorage("appearance") private var appearance: String = "system"

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

        let limits = PlanLimitsManager(apiClient: client)
        limits.setAuthManager(auth)

        // Use Task to set auth manager on the actor after init
        let authRef = auth
        Task { await client.setAuthManager(authRef) }

        _authManager = State(initialValue: auth)
        _planLimitsManager = State(initialValue: limits)
        self.apiClient = client
        
        // Configure TipKit for Onboarding
        TipsHelper.configure()
        
        // Configure Sentry
        SentryHelper.configure()

        // Configure SwiftData for offline caching
        self.modelContainer = SolennixModelContainer.create()
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
                .task {
                    // Start checking for auth tokens
                    await authManager.checkAuth()
                }
                .task {
                    // Iniciar escucha de transacciones de StoreKit
                    subscriptionManager.startTransactionListener()
                    await subscriptionManager.loadProducts()
                    await subscriptionManager.updateSubscriptionStatus()
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
}

// MARK: - Spotlight Navigation Notification

extension Notification.Name {
    /// Se publica cuando el usuario toca un resultado de Core Spotlight
    /// y la app necesita navegar a la ruta correspondiente.
    static let spotlightNavigationRequested = Notification.Name("spotlightNavigationRequested")
}

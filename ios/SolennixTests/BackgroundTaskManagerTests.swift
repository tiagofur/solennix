import XCTest
import SwiftData
@testable import Solennix
import SolennixCore
import SolennixNetwork

/// Tests for `BackgroundTaskManager` issue #813: the cold-launch race where the
/// manager was constructed in a `.task` separate from the one that builds the
/// `CacheManager`, so the manager captured a `nil` cache and background refresh
/// could never persist fetched data.
///
/// These tests pin the `attach(cache:)` + `isReadyForRefresh` contract that
/// replaced the capture-at-init pattern. They do NOT drive a real network
/// refresh (that requires a backend); they assert the readiness guard that
/// `performRefresh()` uses to short-circuit.
@MainActor
final class BackgroundTaskManagerTests: XCTestCase {

    /// Retains in-memory containers for the test's lifetime (a released
    /// container invalidates its context).
    private var containers: [ModelContainer] = []

    // MARK: - isReadyForRefresh: the #813 race guard

    /// Cold-launch race (#813): a freshly constructed manager with no cache
    /// attached must NOT be ready for refresh, even when authenticated. This is
    /// the exact state the bug produced — `performRefresh` fetched data it
    /// couldn't persist.
    func testNotReadyWhenCacheNotAttachedEvenIfAuthenticated() throws {
        let manager = makeManager(authenticated: true, attachCache: false)

        XCTAssertFalse(manager.isReadyForRefresh,
                       "BG refresh must be blocked when cache is not attached (issue #813 cold-launch race)")
    }

    /// After `attach(cache:)` is called (the fix — wiring happens in the same
    /// `.task` that builds the cache), the manager becomes ready.
    func testReadyAfterAttachCache() throws {
        let manager = makeManager(authenticated: true, attachCache: false)
        let cache = try makeCacheManager()

        XCTAssertFalse(manager.isReadyForRefresh, "precondition: not ready before attach")

        manager.attach(cache: cache)

        XCTAssertTrue(manager.isReadyForRefresh,
                      "BG refresh must proceed once cache is attached")
    }

    /// Auth gate is preserved: even with a cache attached, an unauthenticated
    /// user must not trigger background API calls (avoids 401 noise after logout).
    func testNotReadyWhenNotAuthenticatedEvenWithCache() throws {
        let cache = try makeCacheManager()
        let manager = makeManager(authenticated: false, attachCache: true, cache: cache)

        XCTAssertFalse(manager.isReadyForRefresh,
                       "BG refresh must be blocked for logged-out users even if cache is attached")
    }

    /// `attach` is idempotent: attaching twice (e.g., re-entry into the cache
    /// `.task`) must keep the manager ready, not break state.
    func testAttachIsIdempotent() throws {
        let manager = makeManager(authenticated: true, attachCache: false)
        let cacheA = try makeCacheManager()
        let cacheB = try makeCacheManager()

        manager.attach(cache: cacheA)
        XCTAssertTrue(manager.isReadyForRefresh)

        manager.attach(cache: cacheB)
        XCTAssertTrue(manager.isReadyForRefresh,
                      "re-attaching a cache must keep the manager ready")
    }

    /// Constructor path that existed before #813 (passing cacheManager at init)
    /// still works — `isReadyForRefresh` must reflect the init-provided cache.
    func testInitWithCacheAttachedIsReady() throws {
        let cache = try makeCacheManager()
        let manager = makeManager(authenticated: true, attachCache: true, cache: cache)

        XCTAssertTrue(manager.isReadyForRefresh,
                      "manager constructed with a cache must be ready immediately")
    }

    /// `BackgroundTaskManager.shared` weak reference must be settable and clearable
    /// (the launch handler resolves it lazily). Pins the rendezvous contract.
    func testSharedWeakReferenceRoundTrip() {
        let manager = makeManager(authenticated: false, attachCache: false)
        BackgroundTaskManager.shared = manager

        XCTAssertIdentical(BackgroundTaskManager.shared, manager)

        BackgroundTaskManager.shared = nil
        XCTAssertNil(BackgroundTaskManager.shared)
    }

    // MARK: - Helpers

    /// Builds a `BackgroundTaskManager` with a real `AuthManager` whose auth
    /// state is driven by the UI-test bypass env var (the only DEBUG seam
    /// `AuthManager` exposes for synchronous auth bootstrap, used by UI tests).
    private func makeManager(authenticated: Bool, attachCache: Bool, cache: CacheManager? = nil) -> BackgroundTaskManager {
        setBypassAuth(authenticated)
        let auth = AuthManager()
        let manager = BackgroundTaskManager(
            apiClient: APIClient(),
            authManager: auth
        )
        if attachCache, let cache {
            manager.attach(cache: cache)
        }
        return manager
    }

    private func makeCacheManager() throws -> CacheManager {
        let schema = Schema([
            CachedClient.self,
            CachedEvent.self,
            CachedProduct.self,
            CachedInventoryItem.self,
            CachedPayment.self
        ])
        let configuration = ModelConfiguration(
            "BackgroundTaskManagerTests-\(UUID().uuidString)",
            schema: schema,
            isStoredInMemoryOnly: true
        )
        let container = try ModelContainer(for: schema, configurations: [configuration])
        containers.append(container)
        return CacheManager(modelContext: container.mainContext)
    }

    /// Toggles `SOLX_UI_TEST_BYPASS_AUTH` so `AuthManager`'s DEBUG bootstrap
    /// resolves synchronously to `.authenticated` or `.unauthenticated`.
    private func setBypassAuth(_ enabled: Bool) {
        if enabled {
            setenv("SOLX_UI_TEST_BYPASS_AUTH", "1", 1)
        } else {
            unsetenv("SOLX_UI_TEST_BYPASS_AUTH")
        }
    }
}

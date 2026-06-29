import XCTest
import SolennixFeatures
@testable import Solennix

/// Tab metadata contract tests (bottom-nav-search, PR1 task 1.4).
///
/// Locks the `Tab.search` presentation metadata (icon + localized title + enum
/// position) so the search destination renders the magnifier + "Buscar" label
/// the spec requires, and so the case is part of `allCases` (which the tab bar
/// and other `Tab`-iterating code rely on).
final class TabMetadataTests: XCTestCase {

    // MARK: - Search tab metadata

    func testSearchTabUsesMagnifyingGlassIcon() {
        XCTAssertEqual(Tab.search.iconName, "magnifyingglass")
    }

    func testSearchTabTitleIsBuscar() {
        // The title resolves through CommonStrings.tabSearch ("Buscar"), which
        // already existed — this change only wires `Tab.search` to it.
        XCTAssertEqual(Tab.search.title, CommonStrings.tabSearch)
        XCTAssertEqual(Tab.search.title, "Buscar")
    }

    // MARK: - Enum membership / ordering

    func testSearchIsTheFifthCase() {
        XCTAssertEqual(Tab.allCases.count, 5)
        XCTAssertEqual(Tab.allCases, [.home, .events, .clients, .more, .search])
        XCTAssertEqual(Tab.allCases.last, .search)
    }

    // MARK: - Triangulation: every tab exposes non-empty metadata

    func testAllTabsExposeNonEmptyIconAndTitle() {
        for tab in Tab.allCases {
            XCTAssertFalse(tab.iconName.isEmpty, "Expected non-empty icon for \(tab)")
            XCTAssertFalse(tab.title.isEmpty, "Expected non-empty title for \(tab)")
        }
    }
}

// MARK: - Navigation state-restoration (ios-lifecycle PR-B)

/// Locks the logout-clear security invariant (B4): every per-user navigation
/// SceneStorage key MUST be enumerated in `NavSceneStorage.allKeys` (so
/// `performSessionCleanup` can clear them), and the session-epoch discard
/// decision MUST reject any state persisted under a previous epoch.
final class NavSceneStorageTests: XCTestCase {

    /// If a new nav SceneStorage key is ever added (e.g. a 6th tab) but forgotten
    /// in `allKeys`, the previous user's state for that key would survive logout
    /// and leak to the next user. This test forces the author to update `allKeys`.
    func testAllKeysCoversEveryNavSceneStorageKey() {
        let declared = Set([
            NavSceneStorage.selectedTab,
            NavSceneStorage.homePath,
            NavSceneStorage.eventsPath,
            NavSceneStorage.clientsPath,
            NavSceneStorage.morePath,
            NavSceneStorage.searchPath,
            NavSceneStorage.selectedSection,
            NavSceneStorage.contentPath
        ])
        XCTAssertEqual(Set(NavSceneStorage.allKeys), declared,
                       "NavSceneStorage.allKeys must list every per-user nav key exactly once")
        XCTAssertEqual(NavSceneStorage.allKeys.count, declared.count,
                       "allKeys must not contain duplicates")
    }

    /// The reset-epoch key is an AppStorage (UserDefaults.standard) key, NOT a
    /// SceneStorage key. It must NEVER appear in `allKeys` — clearing it on
    /// logout would reset the epoch and re-enable the very state we just cleared.
    func testResetEpochKeyIsNotInAllKeys() {
        XCTAssertFalse(NavSceneStorage.allKeys.contains(NavSession.resetEpoch),
                       "The epoch key must not be cleared by performSessionCleanup")
    }

    /// The deterministic logout guard: navigation persisted under epoch N must be
    /// discarded once the session advances to epoch N+1 (logout happened).
    func testSessionEpochGuardDiscardsStateFromPreviousSession() {
        XCTAssertTrue(NavPersistence.shouldRestore(persistedEpoch: 0, currentEpoch: 0),
                      "Same-session state must restore")
        XCTAssertFalse(NavPersistence.shouldRestore(persistedEpoch: 0, currentEpoch: 1),
                       "State from a logged-out session must NOT restore (user-2 would see user-1's nav)")
        XCTAssertFalse(NavPersistence.shouldRestore(persistedEpoch: 5, currentEpoch: 6),
                       "Any epoch mismatch must block restoration")
    }

    /// The epoch-stamped envelope round-trips: a persisted value survives encode/
    /// decode and keeps its epoch, so the guard can compare reliably.
    func testPersistedValueEnvelopeRoundTripsWithEpoch() throws {
        let envelope = NavPersistedValue<Tab>(epoch: 3, value: .events)
        let data = try JSONEncoder().encode(envelope)
        let decoded = try JSONDecoder().decode(NavPersistedValue<Tab>.self, from: data)
        XCTAssertEqual(decoded.epoch, 3)
        XCTAssertEqual(decoded.value, .events)
    }
}

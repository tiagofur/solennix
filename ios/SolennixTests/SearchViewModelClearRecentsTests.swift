import XCTest
@testable import SolennixFeatures

/// search-empty-state task 4.5 — unit test for the static `clearRecentQueriesFromStorage()`
/// method on `SearchViewModel`. Verifies that the UserDefaults key is removed
/// when called, which is used during logout cleanup (AppSignOutDelegate).
final class SearchViewModelClearRecentsTests: XCTestCase {

    private let recentsKey = "solennix.search.recentQueries"

    override func setUp() {
        super.setUp()
        UserDefaults.standard.removeObject(forKey: recentsKey)
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: recentsKey)
        super.tearDown()
    }

    func testClearRecentQueriesFromStorageRemovesKey() {
        // Seed the UserDefaults key with some recents.
        let recentQueries = ["Test query 1", "Test query 2"]
        UserDefaults.standard.set(recentQueries, forKey: recentsKey)
        XCTAssertEqual(UserDefaults.standard.stringArray(forKey: recentsKey), recentQueries,
                       "Precondition: UserDefaults must contain seeded recents.")

        // Call the static method — this is the code under test.
        SearchViewModel.clearRecentQueriesFromStorage()

        // The key MUST be removed from UserDefaults.
        XCTAssertNil(UserDefaults.standard.stringArray(forKey: recentsKey),
                     "clearRecentQueriesFromStorage() MUST remove the recents key from UserDefaults.")
    }

    func testClearRecentQueriesFromStorageOnEmptyKeyIsNoop() {
        // Ensure no key exists before calling.
        XCTAssertNil(UserDefaults.standard.stringArray(forKey: recentsKey),
                     "Precondition: key should not exist initially.")

        // Calling on a non-existent key should not crash.
        SearchViewModel.clearRecentQueriesFromStorage()

        // Key still absent — no crash, no error.
        XCTAssertNil(UserDefaults.standard.stringArray(forKey: recentsKey),
                     "Calling clearRecentQueriesFromStorage() on a missing key should remain nil.")
    }
}

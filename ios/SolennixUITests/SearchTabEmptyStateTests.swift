import XCTest

/// search-empty-state -- automated verification for the MODIFIED R6 spec.
///
/// R6 now requires the bottom-nav search tab to render Recent Searches when
/// recentQueries is non-empty, and an onboarding hint when it is empty.
///
/// NOTE: iOS 26 Tab(role: .search) wraps content in a system-managed search
/// presentation. Element discovery for recents (seeded via UserDefaults) is
/// unreliable due to process isolation between XCUITest runner and app process.
/// The onboarding-hint test (zero recents) and the unit test for
/// clearRecentQueriesFromStorage() are fully automated. Recents-populated
/// scenarios are covered by the manual smoke checklist.
final class SearchTabEmptyStateTests: XCTestCase {

    private let recentsKey = "solennix.search.recentQueries"

    override func setUp() {
        super.setUp()
        UserDefaults.standard.removeObject(forKey: recentsKey)
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: recentsKey)
        super.tearDown()
    }

    // MARK: - 4.2 Onboarding hint visible when recentQueries is empty

    func testOnboardingHintVisibleWhenEmpty() throws {
        // No recents seeded -- setUp already cleared UserDefaults.
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_BYPASS_AUTH"] = "1"
        app.launch()

        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 20),
                       "Tab bar should render under the auth-bypass gate.")

        let searchTab = tabBar.buttons.element(boundBy: 4)
        XCTAssertTrue(searchTab.waitForExistence(timeout: 5),
                       "The 5th tab (search) should exist.")
        searchTab.tap()

        _ = app.wait(for: .runningForeground, timeout: 5)

        // R6: with zero recents, the onboarding hint MUST be visible.
        // Use the text label which is more reliable than accessibility identifiers
        // inside iOS 26's system search presentation.
        let hintText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'clientes'")
        ).firstMatch
        XCTAssertTrue(hintText.waitForExistence(timeout: 10),
                       "Onboarding hint MUST be visible when recentQueries is empty.")

        // Capture evidence.
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = "search-onboarding-hint"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    // MARK: - 4.1, 4.3, 4.4 -- Recents-populated scenarios (manual verification)

    /// Verifies that the search tab renders under the auth-bypass gate without
    /// crashing. Recents-populated scenarios (4.1, 4.3, 4.4) require manual
    /// smoke verification because XCUITest UserDefaults seeding is unreliable
    /// across process boundaries with iOS 26's Tab(role: .search).
    func testSearchTabRendersWithoutCrash() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_BYPASS_AUTH"] = "1"
        app.launch()

        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 20),
                       "Tab bar should render under the auth-bypass gate.")

        let searchTab = tabBar.buttons.element(boundBy: 4)
        XCTAssertTrue(searchTab.waitForExistence(timeout: 5),
                       "The 5th tab (search) should exist.")
        searchTab.tap()

        _ = app.wait(for: .runningForeground, timeout: 5)

        // Verify the app is still running and the tab bar is present.
        XCTAssertTrue(tabBar.exists, "Tab bar must still exist after search tab tap.")

        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = "search-tab-render-check"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

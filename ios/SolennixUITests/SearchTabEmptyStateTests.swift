import XCTest

/// PR3 task 3.5 — automated verification for spec R6 (Search Empty State): an
/// empty query MUST render a BLANK surface and MUST NOT show recents,
/// suggestions, or history.
///
/// This is launched under the DEBUG `SOLX_UI_TEST_BYPASS_AUTH` gate (compiled
/// out in Release) which renders the REAL `CompactTabLayout` + the search tab.
/// With an empty query the `.bottomNavTab` `SearchView` renders no List section
/// → no cells. R4 (results rendering across 4 entities + detail navigation)
/// needs a live backend with seed data and is NOT automatable here — it lives in
/// the manual checklist (`pr3-manual-checklist.md`).
final class SearchTabEmptyStateTests: XCTestCase {

    func testEmptyQueryRendersBlankSurface() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_BYPASS_AUTH"] = "1"
        app.launch()

        // Wait for the tab bar and find the search destination.
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 20), "Tab bar should render under the auth-bypass gate.")

        let searchTab = tabBar.buttons.element(boundBy: 4)
        XCTAssertTrue(searchTab.waitForExistence(timeout: 5), "The 5th tab (search) should exist.")
        searchTab.tap()

        // Give the search presentation a moment to settle.
        _ = app.wait(for: .runningForeground, timeout: 5)

        // R6: with an EMPTY query, no result rows / recents / suggestions render.
        // The List must be blank (the suggestions/recents surfaces are gated to
        // the `.pushed` context only).
        let cells = app.cells
        // Allow the UI to settle, then assert no list cells exist.
        let cellCount = cells.count
        XCTAssertEqual(cellCount, 0,
                       "Empty query MUST render a blank surface (no recents/suggestions/history). cells=\(cellCount)")

        // Recents/suggestions are gated to `.pushed`; neither header should appear
        // in the bottom-nav tab even if the device has stored recent queries.
        let suggestionsHeader = app.staticTexts["Sugerencias"]
        XCTAssertFalse(suggestionsHeader.exists,
                       "The bottom-nav search tab must not surface recents/suggestions on empty query.")

        // Retain evidence (screenshot of the blank surface).
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = "search-empty-state-pr3"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

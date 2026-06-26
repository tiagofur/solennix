import XCTest

/// PR2 task 2.1 — REAL on-device slot-fit validation for the bottom-nav search
/// tab. The app is auth-gated, so we launch it under the DEBUG
/// `SOLX_UI_TEST_BYPASS_AUTH` gate (compiled out in Release) which renders the
/// REAL `CompactTabLayout` directly — NOT a replica. This validates that
/// 4 regular tabs + 1 search-role tab produce EXACTLY 5 directly-tappable items
/// with NO 6th system-overflow item (the legitimate "Más" more-tab IS one of the
/// 5 expected items; the overflow failure mode is a 6th item).
///
/// Evidence (screenshot + label list) is attached here and copied into
/// `openspec/changes/bottom-nav-search/` for retention.
final class TabBarSlotFitTests: XCTestCase {

    func testFiveSlotFitProducesNoOverflow() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_BYPASS_AUTH"] = "1"
        app.launch()

        let tabBar = app.tabBars.firstMatch
        let tabBarExists = tabBar.waitForExistence(timeout: 20)
        XCTAssertTrue(tabBarExists, "Tab bar should render under the auth-bypass gate.")

        // Snapshot the directly-tappable items and their accessibility labels.
        let buttons = tabBar.buttons
        let count = buttons.count
        let labels = (0..<count).map { buttons.element(boundBy: $0).label }

        // Attach a screenshot + the recorded label list (retained evidence).
        let screenshot = XCUIScreen.main.screenshot()
        let screenshotAttachment = XCTAttachment(screenshot: screenshot)
        screenshotAttachment.name = "slot-fit-pr2"
        screenshotAttachment.lifetime = .keepAlways
        add(screenshotAttachment)

        let summary = "tabBar.buttons.count=\(count) labels=\(labels)"
        let summaryAttachment = XCTAttachment(string: summary)
        summaryAttachment.name = "slot-fit-labels"
        summaryAttachment.lifetime = .keepAlways
        add(summaryAttachment)

        // PASS criterion: exactly 5 directly-tappable items, NO 6th overflow.
        XCTAssertEqual(count, 5, summary)
        // The search destination must be among them (system "Buscar" label).
        XCTAssertTrue(
            labels.contains(where: { $0.lowercased().contains("buscar") || $0.lowercased().contains("search") }),
            "Search tab should be present. \(summary)"
        )
    }
}

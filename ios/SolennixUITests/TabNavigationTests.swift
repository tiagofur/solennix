import XCTest

/// Taps an element only after it exists AND is hittable. Replaces raw `.tap()`
/// after navigation transitions so XCUITest does not race SwiftUI render.
extension XCUIElement {
    func safeTap(timeout: TimeInterval = 5) {
        let predicate = NSPredicate(format: "exists == true && isHittable == true")
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: self)
        _ = XCTWaiter().wait(for: [expectation], timeout: timeout)
        tap()
    }
}

final class TabNavigationTests: XCTestCase {

    /// Verifies the "Más" tab routing (Productos / Inventario / Ajustes) plus a
    /// smoke check that all 5 bottom-nav tabs are present and tappable.
    ///
    /// This test deliberately does NOT tap into the Home / Events / Clients tabs.
    /// Under the `SOLX_UI_TEST_BYPASS_AUTH` gate there is no backend, so those
    /// screens render `SkeletonLine` placeholders whose `repeatForever` shimmer
    /// animation keeps the app perpetually non-idle. XCUITest then hangs on
    /// "Wait for … to idle" (60s) and every subsequent query times out — the
    /// exact CI failure this rewrite fixes. The "Más" menu is fully static
    /// (no `.task` / API calls), so its drill-downs are stable to drive.
    /// Tab-bar slot fit + search-tab rendering are covered by
    /// `TabBarSlotFitTests` and `SearchTabEmptyStateTests`.
    func testTabNavigationAndMoreMenuRouting() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_BYPASS_AUTH"] = "1"
        app.launchArguments.append("-hasSeenOnboarding")
        app.launchArguments.append("YES")
        app.launch()

        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 20), "Tab bar should exist.")

        // Smoke: all 5 tabs present and hittable. Existence/hittability checks do
        // not require the app to be idle the way a tap-then-query does, so they
        // are safe even while another tab's skeleton is animating.
        for index in 0..<5 {
            let tab = tabBar.buttons.element(boundBy: index)
            XCTAssertTrue(tab.waitForExistence(timeout: 5), "Tab at index \(index) should exist.")
            XCTAssertTrue(tab.isHittable, "Tab at index \(index) should be hittable.")
        }

        // Navigate directly to the "Más" tab (index 3) — its content is static.
        let masTab = tabBar.buttons.element(boundBy: 3)
        masTab.safeTap()

        // 1. Productos
        try verifyMoreMenuRow(
            app: app,
            rowPredicates: ["Productos", "Products"],
            titlePredicates: ["Productos", "Products"],
            missingMessage: "Productos row should exist in Más menu."
        )

        // 2. Inventario
        try verifyMoreMenuRow(
            app: app,
            rowPredicates: ["Inventario", "Inventory"],
            titlePredicates: ["Inventario", "Inventory"],
            missingMessage: "Inventario row should exist in Más menu."
        )

        // 3. Configuración (Ajustes / Settings)
        try verifyMoreMenuRow(
            app: app,
            rowPredicates: ["Ajustes", "Settings"],
            titlePredicates: ["Ajustes", "Configuraci", "Settings"],
            missingMessage: "Configuracion (Ajustes) row should exist in Más menu."
        )
    }

    /// Taps a "Más" menu row, asserts the pushed view's navigation title matches
    /// one of `titlePredicates`, then pops back. Each step uses `waitForExistence`
    /// instead of fixed sleeps so the test is both fast and resilient to render
    /// jitter on the CI simulator.
    private func verifyMoreMenuRow(
        app: XCUIApplication,
        rowPredicates: [String],
        titlePredicates: [String],
        missingMessage: String
    ) throws {
        let predicateFormat = rowPredicates
            .map { "label CONTAINS[c] '\($0)'" }
            .joined(separator: " || ")
        let row = app.buttons.matching(NSPredicate(format: predicateFormat)).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 10), missingMessage)
        row.safeTap()

        let title = app.navigationBars.firstMatch.staticTexts.firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 10), "Detail nav title should appear for \(rowPredicates.first ?? "").")
        XCTAssertTrue(
            titlePredicates.contains(where: { title.label.localizedCaseInsensitiveContains($0) }),
            "Detail nav title '\(title.label)' should match one of \(titlePredicates)."
        )

        // Pop back to the "Más" menu.
        let backButton = app.navigationBars.buttons.element(boundBy: 0)
        XCTAssertTrue(backButton.waitForExistence(timeout: 5), "Back button should exist.")
        backButton.safeTap()
    }
}

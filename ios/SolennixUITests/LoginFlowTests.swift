import XCTest

extension XCUIElement {
    func waitForHittable(timeout: TimeInterval = 10) -> Bool {
        let predicate = NSPredicate(format: "exists == true && isHittable == true")
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: self)
        return XCTWaiter().wait(for: [expectation], timeout: timeout) == .completed
    }
}

final class LoginFlowTests: XCTestCase {

    func testMockLoginBypass() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_MOCK_LOGIN"] = "1"
        app.launchArguments.append("-hasSeenOnboarding")
        app.launchArguments.append("YES")
        app.launch()

        // Check if we are already logged in (if tab bar exists, sign out to ensure clean test)
        let tabBar = app.tabBars.firstMatch
        if tabBar.exists {
            // Tap the "Más" tab (index 3)
            let masTab = app.tabBars.buttons.element(boundBy: 3)
            if masTab.exists {
                masTab.tap()
                // Tap "Configuración" / "Settings" row
                let settingsCell = app.cells.matching(NSPredicate(format: "label CONTAINS[c] 'Configuraci' || label CONTAINS[c] 'Settings'")).firstMatch
                if settingsCell.waitForExistence(timeout: 5) {
                    settingsCell.tap()
                    // Tap log out button in SettingsView
                    let logoutButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Cerrar' || label CONTAINS[c] 'Log'")).firstMatch
                    if logoutButton.waitForExistence(timeout: 5) {
                        logoutButton.tap()
                        // Confirm logout in confirmation dialog
                        let confirmButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Cerrar' || label CONTAINS[c] 'Log'")).firstMatch
                        if confirmButton.waitForExistence(timeout: 5) {
                            confirmButton.tap()
                        }
                    }
                }
            }
        }

        let emailField = app.textFields["login_email_field"]
        let passwordField = app.secureTextFields["login_password_field"]
        let submitButton = app.buttons["login_submit_button"]

        XCTAssertTrue(emailField.waitForHittable(timeout: 10), "Email field should exist and be hittable.")
        XCTAssertTrue(passwordField.waitForHittable(timeout: 10), "Password field should exist and be hittable.")
        XCTAssertTrue(submitButton.waitForHittable(timeout: 10), "Submit button should exist and be hittable.")

        emailField.tap()
        emailField.typeText("test@example.com")

        passwordField.tap()
        passwordField.typeText("password123")

        submitButton.tap()

        // Verify transition to tab bar
        XCTAssertTrue(tabBar.waitForExistence(timeout: 10), "Should transition to tab bar on successful login.")
    }
}

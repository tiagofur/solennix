import XCTest

final class LoginFlowTests: XCTestCase {

    func testMockLoginBypass() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_MOCK_LOGIN"] = "1"
        app.launch()

        // Check if we are already logged in (if tab bar exists, sign out to ensure clean test)
        let tabBar = app.tabBars.firstMatch
        if tabBar.exists {
            // Tap the "Más" tab
            let masTab = app.tabBars.buttons.element(boundBy: 4)
            if masTab.exists {
                masTab.tap()
                // Find and tap the sign out button/cell (often has "cerrar sesión" or "Cerrar sesión")
                let signOutButton = app.cells.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'cerrar'")).firstMatch
                if signOutButton.waitForExistence(timeout: 5) {
                    signOutButton.tap()
                    // Confirm sign out in alert if visible
                    let confirmAlertButton = app.alerts.buttons.element(boundBy: 0)
                    if confirmAlertButton.exists {
                        confirmAlertButton.tap()
                    }
                }
            }
        }

        let emailField = app.textFields["login_email_field"]
        let passwordField = app.secureTextFields["login_password_field"]
        let submitButton = app.buttons["login_submit_button"]

        XCTAssertTrue(emailField.waitForExistence(timeout: 10), "Email field should exist.")
        XCTAssertTrue(passwordField.waitForExistence(timeout: 10), "Password field should exist.")
        XCTAssertTrue(submitButton.waitForExistence(timeout: 10), "Submit button should exist.")

        emailField.tap()
        emailField.typeText("test@example.com")

        passwordField.tap()
        passwordField.typeText("password123")

        submitButton.tap()

        // Verify transition to tab bar
        XCTAssertTrue(tabBar.waitForExistence(timeout: 10), "Should transition to tab bar on successful login.")
    }
}

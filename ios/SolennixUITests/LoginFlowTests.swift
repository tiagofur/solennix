import XCTest

extension XCUIElement {
    func waitForHittable(timeout: TimeInterval = 10) -> Bool {
        let predicate = NSPredicate(format: "exists == true && isHittable == true")
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: self)
        return XCTWaiter().wait(for: [expectation], timeout: timeout) == .completed
    }
}

final class LoginFlowTests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        UserDefaults.standard.set(true, forKey: "hasSeenOnboarding")
        XCUIApplication().terminate()
    }

    func testMockLoginBypass() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_MOCK_LOGIN"] = "1"
        app.launchArguments += ["-hasSeenOnboarding", "YES"]
        app.launch()

        let emailField = app.textFields["login_email_field"]
        let passwordField = app.secureTextFields["login_password_field"]
        let submitButton = app.buttons["login_submit_button"]

        XCTAssertTrue(emailField.waitForExistence(timeout: 30), "Email field should exist on the login screen.")
        XCTAssertTrue(emailField.waitForHittable(timeout: 10), "Email field should exist and be hittable.")
        XCTAssertTrue(passwordField.waitForHittable(timeout: 10), "Password field should exist and be hittable.")
        XCTAssertTrue(submitButton.waitForHittable(timeout: 10), "Submit button should exist and be hittable.")

        emailField.tap()
        emailField.typeText("test@example.com")

        passwordField.tap()
        passwordField.typeText("password123")

        submitButton.tap()

        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 15), "Should transition to tab bar on successful login.")
    }
}
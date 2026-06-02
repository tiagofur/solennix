import XCTest
@testable import SolennixFeatures

// MARK: - Onboarding Localization Tests

final class OnboardingLocalizationTests: XCTestCase {

    override func tearDown() {
        super.tearDown()
        UserDefaults.standard.removeObject(forKey: "preferredLocale")
    }

    // MARK: - Helpers

    private func setLocale(_ identifier: String) {
        UserDefaults.standard.set(identifier, forKey: "preferredLocale")
    }

    // MARK: - Navigation Actions

    func testActionSkip_Spanish() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.actionSkip, "Omitir")
    }

    func testActionSkip_English() {
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.actionSkip, "Skip")
    }

    func testActionNext_Spanish() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.actionNext, "Siguiente")
    }

    func testActionNext_English() {
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.actionNext, "Next")
    }

    func testActionStart_Spanish() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.actionStart, "Comenzar")
    }

    func testActionStart_English() {
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.actionStart, "Get Started")
    }

    // MARK: - Page Titles

    func testWelcomeTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.welcomeTitle, "Bienvenido a Solennix")
    }

    func testWelcomeTitle_English() {
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.welcomeTitle, "Welcome to Solennix")
    }

    func testCoreFeaturesTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.coreFeaturesTitle, "Todo en un Solo Lugar")
    }

    func testCoreFeaturesTitle_English() {
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.coreFeaturesTitle, "Everything in One Place")
    }

    func testAppleFeaturesTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.appleFeaturesTitle, "Diseñado para Apple")
    }

    func testAppleFeaturesTitle_English() {
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.appleFeaturesTitle, "Designed for Apple")
    }

    func testGetStartedTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.getStartedTitle, "Comienza Ahora")
    }

    func testGetStartedTitle_English() {
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.getStartedTitle, "Get Started Now")
    }

    // MARK: - Dynamic Switching

    func testDynamicSwitching_SkipButton() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.actionSkip, "Omitir")
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.actionSkip, "Skip")
    }

    func testDynamicSwitching_PageTitles() {
        setLocale("es")
        XCTAssertEqual(OnboardingStrings.welcomeTitle, "Bienvenido a Solennix")
        setLocale("en")
        XCTAssertEqual(OnboardingStrings.welcomeTitle, "Welcome to Solennix")
    }
}

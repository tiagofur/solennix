import XCTest
@testable import SolennixFeatures

// MARK: - Onboarding Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class OnboardingLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    // MARK: - Navigation Actions

    func testActionSkip_Resolves() {
        XCTAssertEqual(OnboardingStrings.actionSkip, expected(spanish: "Omitir", english: "Skip"))
    }

    func testActionNext_Resolves() {
        XCTAssertEqual(OnboardingStrings.actionNext, expected(spanish: "Siguiente", english: "Next"))
    }

    func testActionStart_Resolves() {
        XCTAssertEqual(OnboardingStrings.actionStart, expected(spanish: "Comenzar", english: "Get Started"))
    }

    // MARK: - Page Titles

    func testWelcomeTitle_Resolves() {
        XCTAssertEqual(OnboardingStrings.welcomeTitle, expected(spanish: "Bienvenido a Solennix", english: "Welcome to Solennix"))
    }

    func testCoreFeaturesTitle_Resolves() {
        XCTAssertEqual(OnboardingStrings.coreFeaturesTitle, expected(spanish: "Todo en un Solo Lugar", english: "Everything in One Place"))
    }

    func testAppleFeaturesTitle_Resolves() {
        XCTAssertEqual(OnboardingStrings.appleFeaturesTitle, expected(spanish: "Diseñado para Apple", english: "Designed for Apple"))
    }

    func testGetStartedTitle_Resolves() {
        XCTAssertEqual(OnboardingStrings.getStartedTitle, expected(spanish: "Comienza Ahora", english: "Get Started Now"))
    }
}

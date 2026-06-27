import XCTest
@testable import SolennixFeatures

// MARK: - Settings Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class SettingsLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    // MARK: - General Tests

    func testSettingsTitle_Resolves() {
        XCTAssertEqual(SettingsStrings.title, expected(spanish: "Ajustes", english: "Settings"))
    }

    func testThemeSystemDefault_Resolves() {
        XCTAssertEqual(SettingsStrings.themeSystemDefault, expected(spanish: "Predeterminado del sistema", english: "System default"))
    }

    // MARK: - Sections Tests

    func testSectionAppearance_Resolves() {
        XCTAssertEqual(SettingsStrings.sectionAppearance, expected(spanish: "Apariencia", english: "Appearance"))
    }

    // MARK: - Account Deletion Tests

    func testDeleteAccountTitle_Resolves() {
        XCTAssertEqual(SettingsStrings.deleteAccountTitle, expected(spanish: "Eliminar cuenta", english: "Delete Account"))
    }

    func testDeleteAccountGraceWarning_Resolves() {
        let spanish = "Tu cuenta entrará en un período de gracia de 90 días. Durante este tiempo, tu información estará resguardada de forma segura y podrás revocar esta solicitud contactándote con soporte en caso de que cambies de opinión."
        let english = "Your account will enter a 90-day grace period. During this time, your information will be safely backed up and you can revoke this request by contacting support in case you change your mind."
        XCTAssertEqual(SettingsStrings.deleteAccountGraceWarning, expected(spanish: spanish, english: english))
    }

    // MARK: - Password Tests

    func testPasswordCurrentLabel_Resolves() {
        XCTAssertEqual(SettingsStrings.passwordCurrentLabel, expected(spanish: "Contraseña actual", english: "Current password"))
    }
}

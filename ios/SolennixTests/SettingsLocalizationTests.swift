import XCTest
@testable import SolennixFeatures

// MARK: - Settings Localization Tests

final class SettingsLocalizationTests: XCTestCase {

    override func tearDown() {
        super.tearDown()
        UserDefaults.standard.removeObject(forKey: "preferredLocale")
    }

    // MARK: - Helpers

    private func setLocale(_ identifier: String) {
        UserDefaults.standard.set(identifier, forKey: "preferredLocale")
    }

    // MARK: - General Tests

    func testSettingsTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(SettingsStrings.title, "Ajustes")
    }

    func testSettingsTitle_English() {
        setLocale("en")
        XCTAssertEqual(SettingsStrings.title, "Settings")
    }

    func testThemeSystemDefault_Spanish() {
        setLocale("es")
        XCTAssertEqual(SettingsStrings.themeSystemDefault, "Predeterminado del sistema")
    }

    func testThemeSystemDefault_English() {
        setLocale("en")
        XCTAssertEqual(SettingsStrings.themeSystemDefault, "System default")
    }

    // MARK: - Sections Tests

    func testSectionAppearance_Spanish() {
        setLocale("es")
        XCTAssertEqual(SettingsStrings.sectionAppearance, "Apariencia")
    }

    func testSectionAppearance_English() {
        setLocale("en")
        XCTAssertEqual(SettingsStrings.sectionAppearance, "Appearance")
    }

    // MARK: - Account Deletion Tests

    func testDeleteAccountTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(SettingsStrings.deleteAccountTitle, "Eliminar cuenta")
    }

    func testDeleteAccountTitle_English() {
        setLocale("en")
        XCTAssertEqual(SettingsStrings.deleteAccountTitle, "Delete Account")
    }

    func testDeleteAccountGraceWarning_Spanish() {
        setLocale("es")
        let expectedEs = "Tu cuenta entrará en un período de gracia de 90 días. Durante este tiempo, tu información estará resguardada de forma segura y podrás revocar esta solicitud contactándote con soporte en caso de que cambies de opinión."
        XCTAssertEqual(SettingsStrings.deleteAccountGraceWarning, expectedEs)
    }

    func testDeleteAccountGraceWarning_English() {
        setLocale("en")
        let expectedEn = "Your account will enter a 90-day grace period. During this time, your information will be safely backed up and you can revoke this request by contacting support in case you change your mind."
        XCTAssertEqual(SettingsStrings.deleteAccountGraceWarning, expectedEn)
    }

    // MARK: - Password Tests

    func testPasswordCurrentLabel_Spanish() {
        setLocale("es")
        XCTAssertEqual(SettingsStrings.passwordCurrentLabel, "Contraseña actual")
    }

    func testPasswordCurrentLabel_English() {
        setLocale("en")
        XCTAssertEqual(SettingsStrings.passwordCurrentLabel, "Current password")
    }

    // MARK: - Dynamic Switching

    func testDynamicSwitching_SettingsTitle() {
        setLocale("es")
        XCTAssertEqual(SettingsStrings.title, "Ajustes")
        setLocale("en")
        XCTAssertEqual(SettingsStrings.title, "Settings")
    }

    func testDynamicSwitching_DeleteAccountTitle() {
        setLocale("es")
        XCTAssertEqual(SettingsStrings.deleteAccountTitle, "Eliminar cuenta")
        setLocale("en")
        XCTAssertEqual(SettingsStrings.deleteAccountTitle, "Delete Account")
    }
}

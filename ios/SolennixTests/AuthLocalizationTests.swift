import XCTest
@testable import SolennixFeatures

// MARK: - Auth Localization Tests

final class AuthLocalizationTests: XCTestCase {

    override func tearDown() {
        super.tearDown()
        UserDefaults.standard.removeObject(forKey: "preferredLocale")
    }

    // MARK: - Helpers

    private func setLocale(_ identifier: String) {
        UserDefaults.standard.set(identifier, forKey: "preferredLocale")
    }

    // MARK: - Login Tests

    func testLoginTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.loginTitle, "Iniciar sesión")
    }

    func testLoginTitle_English() {
        setLocale("en")
        XCTAssertEqual(AuthStrings.loginTitle, "Sign in")
    }

    func testLoginTagline_Spanish() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.loginTagline, "CADA DETALLE IMPORTA")
    }

    func testLoginTagline_English() {
        setLocale("en")
        XCTAssertEqual(AuthStrings.loginTagline, "EVERY DETAIL MATTERS")
    }

    // MARK: - Forgot Password Tests

    func testForgotPasswordTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.forgotPasswordTitle, "Recuperar contraseña")
    }

    func testForgotPasswordTitle_English() {
        setLocale("en")
        XCTAssertEqual(AuthStrings.forgotPasswordTitle, "Recover password")
    }

    // MARK: - Reset Password Tests

    func testResetPasswordTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.resetPasswordTitle, "Restablecer contraseña")
    }

    func testResetPasswordTitle_English() {
        setLocale("en")
        XCTAssertEqual(AuthStrings.resetPasswordTitle, "Reset password")
    }

    // MARK: - Register Tests

    func testRegisterTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.registerTitle, "Crear cuenta")
    }

    func testRegisterTitle_English() {
        setLocale("en")
        XCTAssertEqual(AuthStrings.registerTitle, "Create account")
    }

    // MARK: - Biometrics Tests

    func testBiometricUnlockTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.biometricUnlockTitle, "Desbloquea Solennix")
    }

    func testBiometricUnlockTitle_English() {
        setLocale("en")
        XCTAssertEqual(AuthStrings.biometricUnlockTitle, "Unlock Solennix")
    }

    func testBiometricErrorAuthFailed_Spanish() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.biometricErrorAuthFailed, "No se pudo verificar tu identidad. Intenta de nuevo.")
    }

    func testBiometricErrorAuthFailed_English() {
        setLocale("en")
        XCTAssertEqual(AuthStrings.biometricErrorAuthFailed, "Could not verify your identity. Please try again.")
    }

    func testBiometricButtonPassword_Spanish() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.biometricButtonPassword, "Usar contraseña")
    }

    func testBiometricButtonPassword_English() {
        setLocale("en")
        XCTAssertEqual(AuthStrings.biometricButtonPassword, "Use password")
    }

    // MARK: - Dynamic Switching

    func testDynamicSwitching_LoginTitle() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.loginTitle, "Iniciar sesión")
        setLocale("en")
        XCTAssertEqual(AuthStrings.loginTitle, "Sign in")
    }

    func testDynamicSwitching_BiometricUnlockTitle() {
        setLocale("es")
        XCTAssertEqual(AuthStrings.biometricUnlockTitle, "Desbloquea Solennix")
        setLocale("en")
        XCTAssertEqual(AuthStrings.biometricUnlockTitle, "Unlock Solennix")
    }
}

import XCTest
@testable import SolennixFeatures

// MARK: - Auth Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution).
///
/// These tests assert that localized feature strings RESOLVE from the module
/// bundle for the simulator's current system locale — proving the resolution
/// path works end-to-end with no runtime override. They do NOT flip the
/// language at runtime (the `preferredLocale` override was retired in B-1);
/// each assertion checks the EXPECTED value for the locale the app actually
/// runs under (see `expected(spanish:english:)` below). Full catalog coverage
/// across both languages is B-2/B-4 territory (catalog-coverage harness).
final class AuthLocalizationTests: XCTestCase {

    /// Selects the EXPECTED resolved value for the simulator's current system
    /// locale. B-1 follows the system locale (no runtime override); these tests
    /// therefore assert the value the app would actually show under the locale
    /// it runs in — selected via `FeatureL10n.languageCode`, the same signal
    /// the app uses, so the assertion and the production resolution stay
    /// aligned on both `es` and `en` sims (Spanish is the source/dev language
    /// and is used as the fallback for any other locale).
    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    // MARK: - Login Tests

    func testLoginTitle_Resolves() {
        XCTAssertEqual(AuthStrings.loginTitle, expected(spanish: "Iniciar sesión", english: "Sign in"))
    }

    func testLoginTagline_Resolves() {
        XCTAssertEqual(AuthStrings.loginTagline, expected(spanish: "CADA DETALLE IMPORTA", english: "EVERY DETAIL MATTERS"))
    }

    // MARK: - Forgot Password Tests

    func testForgotPasswordTitle_Resolves() {
        XCTAssertEqual(AuthStrings.forgotPasswordTitle, expected(spanish: "Recuperar contraseña", english: "Recover password"))
    }

    // MARK: - Reset Password Tests

    func testResetPasswordTitle_Resolves() {
        XCTAssertEqual(AuthStrings.resetPasswordTitle, expected(spanish: "Restablecer contraseña", english: "Reset password"))
    }

    // MARK: - Register Tests

    func testRegisterTitle_Resolves() {
        XCTAssertEqual(AuthStrings.registerTitle, expected(spanish: "Crear cuenta", english: "Create account"))
    }

    // MARK: - Biometrics Tests

    func testBiometricUnlockTitle_Resolves() {
        XCTAssertEqual(AuthStrings.biometricUnlockTitle, expected(spanish: "Desbloquea Solennix", english: "Unlock Solennix"))
    }

    func testBiometricErrorAuthFailed_Resolves() {
        XCTAssertEqual(
            AuthStrings.biometricErrorAuthFailed,
            expected(
                spanish: "No se pudo verificar tu identidad. Intenta de nuevo.",
                english: "Could not verify your identity. Please try again."
            )
        )
    }

    func testBiometricButtonPassword_Resolves() {
        XCTAssertEqual(AuthStrings.biometricButtonPassword, expected(spanish: "Usar contraseña", english: "Use password"))
    }
}

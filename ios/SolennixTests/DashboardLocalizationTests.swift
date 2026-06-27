import XCTest
import Foundation
@testable import SolennixFeatures

// MARK: - Dashboard Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
///
/// These resolve directly through `FeatureL10n.text` to prove the module bundle
/// resolution path for known dashboard keys.
final class DashboardLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    func testDashboardTitle_Resolves() {
        let title = FeatureL10n.text("dashboard.title", "Fallback")
        XCTAssertEqual(title, expected(spanish: "Inicio", english: "Home"))
    }

    func testDashboardNetSales_Resolves() {
        let netSales = FeatureL10n.text("dashboard.kpi.net_sales", "Fallback")
        XCTAssertEqual(netSales, expected(spanish: "Ventas netas", english: "Net sales"))
    }

    func testDashboardWelcome_Resolves() {
        let welcome = FeatureL10n.text("dashboard.welcome", "Fallback")
        XCTAssertEqual(welcome, expected(spanish: "Hola, %@", english: "Hello, %@"))
    }
}

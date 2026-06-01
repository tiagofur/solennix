import XCTest
import Foundation
@testable import SolennixFeatures

final class DashboardLocalizationTests: XCTestCase {

    override func setUp() {
        super.setUp()
        // Save the previous preferred locale to avoid polluting user settings
        let oldLocale = UserDefaults.standard.string(forKey: "preferredLocale")
        addTeardownBlock {
            if let oldLocale = oldLocale {
                UserDefaults.standard.set(oldLocale, forKey: "preferredLocale")
            } else {
                UserDefaults.standard.removeObject(forKey: "preferredLocale")
            }
        }
    }

    func testDashboardTranslationsResolveForSpanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")
        
        let title = FeatureL10n.text("dashboard.title", "Fallback")
        let netSales = FeatureL10n.text("dashboard.kpi.net_sales", "Fallback")
        let welcome = FeatureL10n.text("dashboard.welcome", "Fallback")
        
        XCTAssertEqual(title, "Inicio")
        XCTAssertEqual(netSales, "Ventas netas")
        XCTAssertEqual(welcome, "Hola, %@")
    }

    func testDashboardTranslationsResolveForEnglish() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")
        
        let title = FeatureL10n.text("dashboard.title", "Fallback")
        let netSales = FeatureL10n.text("dashboard.kpi.net_sales", "Fallback")
        let welcome = FeatureL10n.text("dashboard.welcome", "Fallback")
        
        XCTAssertEqual(title, "Home")
        XCTAssertEqual(netSales, "Net sales")
        XCTAssertEqual(welcome, "Hello, %@" )
    }
}

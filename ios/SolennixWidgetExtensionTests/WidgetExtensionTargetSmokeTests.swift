import XCTest
import SolennixCore

/// Smoke test proving the `SolennixWidgetExtensionTests` target compiles the
/// widget data layer (the extension product itself is not linkable by a test
/// bundle, so the data sources are compiled into this target). Substantive
/// data tests live alongside this file.
final class WidgetExtensionTargetSmokeTests: XCTestCase {

    func testTargetCanReachExtensionAppGroupConstant() {
        // If the test target could not see the compiled-in extension code this
        // would not compile.
        XCTAssertEqual(AppGroup.identifier, "group.com.solennix.app")
    }
}

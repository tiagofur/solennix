import XCTest
@testable import SolennixFeatures

/// Bootstrap test proving the new `SolennixFeaturesTests` target compiles and
/// links against the `SolennixFeatures` product (ADR-8 harness wiring).
///
/// Real behavioral tests live alongside their subjects in this target
/// (CalendarSync, Events, Settings, Mocks).
final class SolennixFeaturesTestsTargetBootstrap: XCTestCase {

    func testTargetCompilesAndLinks() {
        // The act of compiling + running this assertion proves the test target,
        // its dependencies, and the `swift-snapshot-testing` product all resolve.
        XCTAssertTrue(true, "SolennixFeaturesTests target is wired and runnable.")
    }
}

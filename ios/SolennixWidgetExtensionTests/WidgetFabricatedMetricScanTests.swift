import XCTest

/// NFR-WP-01 regression guard: no production widget source may render a
/// fabricated / mock metric. Scans the widget view sources for a hardcoded
/// `+NN%` literal — the exact anti-pattern removed from KPIWidget (`"+12%"`) —
/// and fails if it reappears.
///
/// The legitimate `WidgetTrend` render path builds `"+\(value)%"` from a real
/// backend trend; that interpolation contains no digits between `+` and `%`, so
/// it is intentionally NOT matched.
final class WidgetFabricatedMetricScanTests: XCTestCase {

    func testNoWidgetRendersHardcodedPercentage() throws {
        // Locate the widget Widgets dir relative to this test file. The test is
        // compiled from its real repo path, so #filePath is stable across
        // machines and CI (DerivedData keeps the original source location).
        let testFile = URL(fileURLWithPath: #filePath)
        let repoRoot = testFile
            .deletingLastPathComponent()          // .../SolennixWidgetExtensionTests
            .deletingLastPathComponent()          // .../ios
        let widgetsDir = repoRoot
            .appendingPathComponent("SolennixWidgetExtension/Widgets")

        let fm = FileManager.default
        let swiftURLs = try fm.contentsOfDirectory(at: widgetsDir, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "swift" }
        XCTAssertFalse(swiftURLs.isEmpty, "expected widget view sources in \(widgetsDir.path)")

        let fabricated = try NSRegularExpression(pattern: "\\+\\d+%")
        for url in swiftURLs {
            let raw = try String(contentsOf: url, encoding: .utf8)
            // Strip `//` line comments so an explanatory comment that mentions
            // the removed mock value does not trip the guard.
            let stripped = raw
                .split(separator: "\n", omittingEmptySubsequences: false)
                .map { line -> String in
                    if let slash = line.range(of: "//") {
                        return String(line[..<slash.lowerBound])
                    }
                    return String(line)
                }
                .joined(separator: "\n")

            let nsRange = NSRange(stripped.startIndex..., in: stripped)
            let matches = fabricated.matches(in: stripped, range: nsRange)
            XCTAssertTrue(
                matches.isEmpty,
                "\(url.lastPathComponent) renders a hardcoded '+NN%' metric (NFR-WP-01): \(matches.count) match(es)"
            )
        }
    }
}

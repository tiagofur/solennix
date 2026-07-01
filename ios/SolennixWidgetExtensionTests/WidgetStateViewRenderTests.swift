import XCTest
import SwiftUI
import ViewInspector
// WidgetStateView + WidgetModels + WidgetSharedConstants are compiled into this
// target (the extension product is not linkable by a test bundle).

/// NFR-WP-02 render tests for the shared `WidgetStateView` — the surface every
/// widget family delegates to for its empty / signed-out / error / placeholder
/// states. These prove the component renders an icon + title (rather than
/// collapsing to a blank pane — the root cause of the reported
/// "background-colored rectangle"), and that the per-state icon mapping is
/// correct.
final class WidgetStateViewRenderTests: XCTestCase {

    // MARK: - Render structure (ViewInspector)

    func testEmptyStateRendersIconAndTitle() throws {
        let sut = WidgetStateView(state: .empty)

        XCTAssertFalse(try sut.inspect().findAll(ViewType.Image.self).isEmpty,
                       "empty state must render an icon, not a blank pane")

        let texts = try sut.inspect().findAll(ViewType.Text.self)
        XCTAssertEqual(texts.count, 1)
        // No localized bundle in the test target → the key string is returned.
        XCTAssertEqual(try texts[0].string(), "widget.state.empty.title")
    }

    func testSignedOutStateRendersIconAndTitle() throws {
        let sut = WidgetStateView(state: .signedOut)
        XCTAssertFalse(try sut.inspect().findAll(ViewType.Image.self).isEmpty)
        XCTAssertEqual(try sut.inspect().findAll(ViewType.Text.self).count, 1)
    }

    func testErrorStateRendersIconAndTitle() throws {
        let sut = WidgetStateView(state: .error)
        XCTAssertFalse(try sut.inspect().findAll(ViewType.Image.self).isEmpty)
        XCTAssertEqual(try sut.inspect().findAll(ViewType.Text.self).count, 1)
    }

    func testPlaceholderShowsNoMessageText() throws {
        // The placeholder is a redacted skeleton — it must NOT show the empty
        // title (which would flash real-looking copy during loading).
        let sut = WidgetStateView(state: .placeholder)
        XCTAssertTrue(try sut.inspect().findAll(ViewType.Text.self).isEmpty,
                      "placeholder should not render a title Text")
    }

    // MARK: - Icon mapping (pure logic)

    func testIconMappingPerState() {
        XCTAssertEqual(WidgetStateView.icon(for: .empty), "tray")
        XCTAssertEqual(WidgetStateView.icon(for: .signedOut), "person.crop.circle.badge.exclamationmark")
        XCTAssertEqual(WidgetStateView.icon(for: .error), "exclamationmark.triangle.fill")
    }

    func testCustomIconOverrideIsRespected() {
        // Adopters pass a family-specific icon (e.g. calendar.badge.plus).
        XCTAssertEqual(WidgetStateView.icon(for: .empty, override: "calendar.badge.plus"),
                       "calendar.badge.plus")
    }
}

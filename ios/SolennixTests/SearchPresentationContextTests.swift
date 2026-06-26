import XCTest
@testable import SolennixFeatures

/// PR2 task 2.3 — `SearchView` gains a `SearchPresentationContext` so the same
/// view powers both the pushed search route (custom field + suggestions) and the
/// bottom-nav search tab (the system `.searchable` is the field; a structured
/// blank empty surface replaces recents).
///
/// The default context MUST stay `.pushed` so existing `Route.search` callers are
/// unchanged — spec R7: "SearchView MUST own its text; the nav field MAY seed an
/// initial query only."
final class SearchPresentationContextTests: XCTestCase {

    // MARK: - Enum surface

    func testPresentationContextExposesBothCases() {
        // The enum MUST exist with the two designed contexts and be distinct.
        let pushed: SearchPresentationContext = .pushed
        let bottomNav: SearchPresentationContext = .bottomNavTab
        XCTAssertNotEqual(pushed, bottomNav)
    }

    // MARK: - Default is .pushed (backward compatibility)

    func testDefaultContextIsPushed() {
        // Existing callers (`Route.search` → `SearchView(query)`) MUST keep the
        // pushed presentation without passing a context.
        let view = SearchView()
        XCTAssertEqual(view.presentationContext, .pushed)
    }

    func testExplicitBottomNavContextIsPreserved() {
        // The bottom-nav tab constructs SearchView with `.bottomNavTab`.
        let view = SearchView(initialQuery: "", context: .bottomNavTab)
        XCTAssertEqual(view.presentationContext, .bottomNavTab)
    }

    func testInitialQueryDefaultStillCompiles() {
        // The original single-arg initializer signature is preserved.
        let view = SearchView(initialQuery: "fiesta")
        XCTAssertEqual(view.presentationContext, .pushed)
    }
}

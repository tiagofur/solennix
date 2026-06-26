import XCTest
import SolennixFeatures
@testable import Solennix

/// Tab metadata contract tests (bottom-nav-search, PR1 task 1.4).
///
/// Locks the `Tab.search` presentation metadata (icon + localized title + enum
/// position) so the search destination renders the magnifier + "Buscar" label
/// the spec requires, and so the case is part of `allCases` (which the tab bar
/// and other `Tab`-iterating code rely on).
final class TabMetadataTests: XCTestCase {

    // MARK: - Search tab metadata

    func testSearchTabUsesMagnifyingGlassIcon() {
        XCTAssertEqual(Tab.search.iconName, "magnifyingglass")
    }

    func testSearchTabTitleIsBuscar() {
        // The title resolves through CommonStrings.tabSearch ("Buscar"), which
        // already existed — this change only wires `Tab.search` to it.
        XCTAssertEqual(Tab.search.title, CommonStrings.tabSearch)
        XCTAssertEqual(Tab.search.title, "Buscar")
    }

    // MARK: - Enum membership / ordering

    func testSearchIsTheFifthCase() {
        XCTAssertEqual(Tab.allCases.count, 5)
        XCTAssertEqual(Tab.allCases, [.home, .events, .clients, .more, .search])
        XCTAssertEqual(Tab.allCases.last, .search)
    }

    // MARK: - Triangulation: every tab exposes non-empty metadata

    func testAllTabsExposeNonEmptyIconAndTitle() {
        for tab in Tab.allCases {
            XCTAssertFalse(tab.iconName.isEmpty, "Expected non-empty icon for \(tab)")
            XCTAssertFalse(tab.title.isEmpty, "Expected non-empty title for \(tab)")
        }
    }
}

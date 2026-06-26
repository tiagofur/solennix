import XCTest
@testable import Solennix

/// Navigation-surface contract tests (unify-events-calendar-ios, task 5.4;
/// updated for bottom-nav-search PR1 — `Tab.search` is now the 5th tab).
///
/// The calendar destination MUST NOT exist as a tab or a sidebar section: the
/// navigation surface exposes exactly five compact tabs — `home`, `events`,
/// `clients`, `more`, `search` — and the sidebar's main sections exclude calendar.
/// (Previously five destinations including a `calendar` tab and section.)
final class SidebarSectionTests: XCTestCase {

    // MARK: - Compact tabs (five, including search; no Calendar)

    func testCompactTabsAreFiveIncludingSearchInOrder() {
        // Spec: "the tabs MUST be home, events, clients, more" + the new search
        // destination (bottom-nav-search). Calendar MUST NOT be among them.
        XCTAssertEqual(Tab.allCases.count, 5)
        XCTAssertEqual(Tab.allCases, [.home, .events, .clients, .more, .search])
    }

    func testTabsExposeExpectedTitleAndIcon() {
        XCTAssertEqual(Tab.home.title, "Inicio")
        XCTAssertEqual(Tab.home.iconName, "house.fill")
        XCTAssertEqual(Tab.more.title, "Más")
        XCTAssertEqual(Tab.more.iconName, "ellipsis")
    }

    // MARK: - Sidebar main sections (no Calendar)

    func testMainSectionsContainExpectedOrderWithoutCalendar() {
        // Calendar MUST NOT appear among the sidebar main sections.
        XCTAssertEqual(
            SidebarSection.mainSections,
            [.dashboard, .events, .clients, .personnel, .products, .inventory, .paymentInbox, .eventFormLinks, .reviews]
        )
    }

    func testMainSectionsCountIsNine() {
        // Triangulation for "no calendar": removing it drops the main section
        // count from ten to nine.
        XCTAssertEqual(SidebarSection.mainSections.count, 9)
    }

    func testMoreMenuCatalogSectionsContainExpectedOrder() {
        XCTAssertEqual(
            SidebarSection.moreMenuCatalogSections,
            [.products, .inventory, .paymentInbox, .personnel, .eventFormLinks, .reviews]
        )
    }

    func testRootSectionsDoNotExposeRoute() {
        // Root-tab sections are handled by layout selection and carry no Route.
        XCTAssertNil(SidebarSection.dashboard.route)
        XCTAssertNil(SidebarSection.events.route)
        XCTAssertNil(SidebarSection.clients.route)
    }

    func testNonRootSectionsExposeExpectedRoute() {
        XCTAssertEqual(SidebarSection.personnel.route, .staffList)
        XCTAssertEqual(SidebarSection.products.route, .productList)
        XCTAssertEqual(SidebarSection.inventory.route, .inventoryList)
        XCTAssertEqual(SidebarSection.paymentInbox.route, .paymentInbox)
        XCTAssertEqual(SidebarSection.eventFormLinks.route, .eventFormLinks)
        XCTAssertEqual(SidebarSection.reviews.route, .reviews)
        XCTAssertEqual(SidebarSection.settings.route, .settings)
    }

    func testMoreMenuSubtitleIsPresentForCatalogSections() {
        for section in SidebarSection.moreMenuCatalogSections {
            XCTAssertFalse(section.moreMenuSubtitle.isEmpty, "Expected non-empty subtitle for \(section)")
        }
    }

    func testSidebarSectionsExposeTitleAndIconName() {
        for section in SidebarSection.allCases {
            XCTAssertFalse(section.title.isEmpty, "Expected non-empty title for \(section)")
            XCTAssertFalse(section.iconName.isEmpty, "Expected non-empty icon for \(section)")
        }
    }

    func testSettingsSectionHasExpectedSubtitle() {
        XCTAssertEqual(SidebarSection.settings.moreMenuSubtitle, "Perfil, negocio, cuenta")
    }
}

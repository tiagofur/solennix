import XCTest
import SolennixFeatures
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
        // Titles resolve from the system locale (es "Inicio"/"Más", en
        // "Home"/"More"); assert the resolved word for whatever locale the
        // simulator reports — never a hardcoded one.
        XCTAssertEqual(Tab.home.title, FeatureL10n.languageCode == "en" ? "Home" : "Inicio")
        XCTAssertEqual(Tab.home.iconName, "house.fill")
        XCTAssertEqual(Tab.more.title, FeatureL10n.languageCode == "en" ? "More" : "Más")
        XCTAssertEqual(Tab.more.iconName, "ellipsis")
    }

    // MARK: - Sidebar main sections (no Calendar)

    func testMainSectionsContainExpectedOrderWithoutCalendar() {
        // Calendar MUST NOT appear among the sidebar main sections.
        XCTAssertEqual(
            SidebarSection.mainSections,
            [
                .dashboard, .events, .clients, .personnel, .products, .inventory,
                .paymentInbox, .publicRequests, .reviews,
            ]
        )
    }

    func testMainSectionsCountIsNine() {
        // Includes publicRequests (#1122); form links folded into Requests (Phase 6).
        XCTAssertEqual(SidebarSection.mainSections.count, 9)
    }

    func testMoreMenuCatalogSectionsContainExpectedOrder() {
        XCTAssertEqual(
            SidebarSection.moreMenuCatalogSections,
            [.products, .inventory, .paymentInbox, .publicRequests, .personnel, .reviews]
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
        XCTAssertEqual(SidebarSection.publicRequests.route, .publicRequests)
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
        // Subtitle resolves from the system locale (es "Perfil, negocio, cuenta",
        // en "Profile, business, account"); assert the resolved value rather
        // than a hardcoded locale.
        XCTAssertEqual(
            SidebarSection.settings.moreMenuSubtitle,
            FeatureL10n.languageCode == "en" ? "Profile, business, account" : "Perfil, negocio, cuenta"
        )
    }
}

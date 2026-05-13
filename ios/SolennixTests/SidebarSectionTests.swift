import XCTest
@testable import Solennix

final class SidebarSectionTests: XCTestCase {

    func testMainSectionsContainExpectedOrder() {
        XCTAssertEqual(
            SidebarSection.mainSections,
            [.dashboard, .calendar, .events, .clients, .personnel, .products, .inventory, .paymentInbox, .eventFormLinks]
        )
    }

    func testMoreMenuCatalogSectionsContainExpectedOrder() {
        XCTAssertEqual(
            SidebarSection.moreMenuCatalogSections,
            [.products, .inventory, .paymentInbox, .eventFormLinks, .personnel]
        )
    }

    func testRootSectionsDoNotExposeRoute() {
        XCTAssertNil(SidebarSection.dashboard.route)
        XCTAssertNil(SidebarSection.calendar.route)
        XCTAssertNil(SidebarSection.events.route)
        XCTAssertNil(SidebarSection.clients.route)
    }

    func testNonRootSectionsExposeExpectedRoute() {
        XCTAssertEqual(SidebarSection.personnel.route, .staffList)
        XCTAssertEqual(SidebarSection.products.route, .productList)
        XCTAssertEqual(SidebarSection.inventory.route, .inventoryList)
        XCTAssertEqual(SidebarSection.paymentInbox.route, .paymentInbox)
        XCTAssertEqual(SidebarSection.eventFormLinks.route, .eventFormLinks)
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

    func testTabsExposeExpectedTitleAndIcon() {
        XCTAssertEqual(Tab.allCases, [.home, .calendar, .events, .clients, .more])
        XCTAssertEqual(Tab.home.title, "Inicio")
        XCTAssertEqual(Tab.home.iconName, "house.fill")
        XCTAssertEqual(Tab.more.title, "Más")
        XCTAssertEqual(Tab.more.iconName, "ellipsis")
    }
}

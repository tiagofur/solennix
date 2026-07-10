import XCTest

extension XCUIElement {
    func safeTap() {
        let predicate = NSPredicate(format: "exists == true && isHittable == true")
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: self)
        _ = XCTWaiter().wait(for: [expectation], timeout: 5)
        self.tap()
    }
}

final class TabNavigationTests: XCTestCase {

    func testTabNavigationAndMoreMenuRouting() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SOLX_UI_TEST_BYPASS_AUTH"] = "1"
        app.launchArguments.append("-hasSeenOnboarding")
        app.launchArguments.append("YES")
        app.launch()

        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 10), "Tab bar should exist.")

        // 1. Home Tab (Index 0)
        let homeTab = tabBar.buttons.element(boundBy: 0)
        XCTAssertTrue(homeTab.exists)
        homeTab.safeTap()
        sleep(1)
        
        // 2. Events Tab (Index 1)
        let eventsTab = tabBar.buttons.element(boundBy: 1)
        XCTAssertTrue(eventsTab.exists)
        eventsTab.safeTap()
        sleep(1)
        
        // 3. Clients Tab (Index 2)
        let clientsTab = tabBar.buttons.element(boundBy: 2)
        XCTAssertTrue(clientsTab.exists)
        clientsTab.safeTap()
        sleep(1)
        
        // 4. Más Tab (Index 3)
        let masTab = tabBar.buttons.element(boundBy: 3)
        XCTAssertTrue(masTab.exists)
        masTab.safeTap()
        sleep(1)

        // Test navigation within More menu
        // 4.1. Productos
        let productsCell = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Productos' || label CONTAINS[c] 'Products'")).firstMatch
        if !productsCell.waitForExistence(timeout: 5) {
            print("TabNavigationTests Debug - App hierarchy:\n\(app.debugDescription)")
            XCTFail("Productos row should exist in Más menu. Hierarchy printed above.")
            return
        }
        productsCell.tap()
        sleep(1)
        
        // Verify detail view navigation title for Productos
        let productsTitle = app.navigationBars.firstMatch.staticTexts.firstMatch
        XCTAssertTrue(productsTitle.waitForExistence(timeout: 5))
        XCTAssertTrue(productsTitle.label.contains("Productos") || productsTitle.label.contains("Products"))
        
        // Go back
        app.navigationBars.buttons.element(boundBy: 0).tap()
        sleep(1)

        // 4.2. Inventario
        let inventoryCell = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Inventario' || label CONTAINS[c] 'Inventory'")).firstMatch
        XCTAssertTrue(inventoryCell.waitForExistence(timeout: 5), "Inventario row should exist in Más menu.")
        inventoryCell.tap()
        sleep(1)
        
        // Verify detail view navigation title for Inventario
        let inventoryTitle = app.navigationBars.firstMatch.staticTexts.firstMatch
        XCTAssertTrue(inventoryTitle.waitForExistence(timeout: 5))
        XCTAssertTrue(inventoryTitle.label.contains("Inventario") || inventoryTitle.label.contains("Inventory"))
        
        // Go back
        app.navigationBars.buttons.element(boundBy: 0).tap()
        sleep(1)

        // 4.3. Configuración (Ajustes / Settings)
        let settingsCell = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Ajustes' || label CONTAINS[c] 'Settings'")).firstMatch
        XCTAssertTrue(settingsCell.waitForExistence(timeout: 5), "Configuracion (Ajustes) row should exist in Más menu.")
        settingsCell.tap()
        sleep(1)
        
        // Verify detail view navigation title for Configuración
        let settingsTitle = app.navigationBars.firstMatch.staticTexts.firstMatch
        XCTAssertTrue(settingsTitle.waitForExistence(timeout: 5))
        XCTAssertTrue(settingsTitle.label.contains("Ajustes") || settingsTitle.label.contains("Configuraci") || settingsTitle.label.contains("Settings"))
        
        // Go back
        app.navigationBars.buttons.element(boundBy: 0).tap()
        sleep(1)

        // 5. Search Tab (Index 4) - Tapped last to avoid search role hiding the tab bar
        let searchTab = tabBar.buttons.element(boundBy: 4)
        XCTAssertTrue(searchTab.exists)
        searchTab.safeTap()
        sleep(1)
    }
}

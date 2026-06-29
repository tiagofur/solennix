import XCTest
import Foundation
@testable import SolennixFeatures

// MARK: - Products / Inventory Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class ProductsInventoryLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    func testProductStringsResolve() {
        XCTAssertEqual(ProductStrings.title, expected(spanish: "Productos", english: "Products"))
        XCTAssertEqual(ProductStrings.searchPrompt, expected(spanish: "Buscar productos", english: "Search products"))
        // The product name is echoed into the localized template; it must track
        // the resolved locale so the en template doesn't wrap a Spanish noun
        // ("Hamburguesa deleted") and mismatch the en expectation.
        let burger = expected(spanish: "Hamburguesa", english: "Burger")
        XCTAssertEqual(ProductStrings.deletedMessage(burger), expected(spanish: "Hamburguesa eliminado", english: "Burger deleted"))
        let soup = expected(spanish: "Cazuela", english: "Soup")
        XCTAssertEqual(
            ProductStrings.deletePrompt(soup),
            expected(
                spanish: "Se eliminará \"Cazuela\". Podrás deshacer durante unos segundos.",
                english: "Are you sure you want to delete \"Soup\"? You can undo for a few seconds."
            )
        )
        XCTAssertEqual(ProductStrings.unitsNext7Days(5), expected(spanish: "5 unidades en los próximos 7 días", english: "5 units in the next 7 days"))
        XCTAssertEqual(ProductStrings.revenueMessage("$10,000"), expected(spanish: "Alta demanda esta semana. Ingreso estimado total: $10,000", english: "High demand this week. Estimated total revenue: $10,000"))
        XCTAssertEqual(ProductStrings.demandSummary(units: 1, events: 1), expected(spanish: "1 unidad en 1 evento próximo", english: "1 unit across 1 upcoming event"))
        XCTAssertEqual(ProductStrings.demandSummary(units: 3, events: 5), expected(spanish: "3 unidades en 5 eventos próximos", english: "3 units across 5 upcoming events"))
        XCTAssertEqual(ProductStrings.stockWithUnit(10, unit: "kg"), expected(spanish: "Stock: 10 kg", english: "Stock: 10 kg"))
        XCTAssertEqual(ProductStrings.costPerUnit("$50", unit: "kg"), expected(spanish: "· $50/kg", english: "· $50/kg"))
        XCTAssertEqual(ProductStrings.upcomingEventsCount(3), expected(spanish: "Próximos 3 eventos", english: "Upcoming 3 events"))
        XCTAssertEqual(ProductStrings.quantityForPeople(quantity: 100, people: 50), expected(spanish: "Total: 100 unidades para 50 personas", english: "Total: 100 units for 50 people"))
        XCTAssertEqual(ProductStrings.inDays(4), expected(spanish: "en 4 días", english: "in 4 days"))
        XCTAssertEqual(ProductStrings.quantityUnits(25), expected(spanish: "25 unidades", english: "25 units"))
        XCTAssertEqual(ProductStrings.eventCount(1), expected(spanish: "1 evento", english: "1 event"))
        XCTAssertEqual(ProductStrings.eventCount(4), expected(spanish: "4 eventos", english: "4 events"))
        XCTAssertEqual(ProductStrings.estimatedAmount("$500"), expected(spanish: "$500 est.", english: "$500 est."))
        XCTAssertEqual(ProductStrings.compositionSummary(ingredients: 1, supplies: 0, equipment: 0), expected(spanish: "1 insumo", english: "1 ingredient"))
        XCTAssertEqual(ProductStrings.compositionSummary(ingredients: 3, supplies: 2, equipment: 1), expected(spanish: "3 insumos, 2 insumos por evento, 1 equipo", english: "3 ingredients, 2 supplies per event, 1 equipment"))
    }

    func testInventoryStringsResolve() {
        XCTAssertEqual(InventoryStrings.title, expected(spanish: "Inventario", english: "Inventory"))
        XCTAssertEqual(InventoryStrings.searchPrompt, expected(spanish: "Buscar inventario", english: "Search inventory"))
        // Names are echoed into the localized templates, so they must track the
        // resolved locale — otherwise the en template wraps a Spanish noun
        // ("Carne deleted") and mismatches the en expectation.
        let meat = expected(spanish: "Carne", english: "Meat")
        XCTAssertEqual(InventoryStrings.deletedMessage(meat), expected(spanish: "Carne eliminado", english: "Meat deleted"))
        let bread = expected(spanish: "Pan", english: "Bread")
        XCTAssertEqual(
            InventoryStrings.deletePrompt(bread),
            expected(
                spanish: "Se eliminará \"Pan\". Podrás deshacer durante unos segundos.",
                english: "Are you sure you want to delete \"Bread\"? You can undo for a few seconds."
            )
        )
        let cheese = expected(spanish: "Queso", english: "Cheese")
        XCTAssertEqual(
            InventoryStrings.permanentDeletePrompt(cheese),
            expected(
                spanish: "¿Estás seguro de que quieres eliminar \"Queso\"? Esta acción no se puede deshacer.",
                english: "Are you sure you want to delete \"Cheese\"? This action cannot be undone."
            )
        )
        XCTAssertEqual(InventoryStrings.minLabel(5), expected(spanish: "(min: 5)", english: "(min: 5)"))
        XCTAssertEqual(InventoryStrings.stockActual(50, unit: "lts"), expected(spanish: "Stock actual: 50 lts", english: "Current stock: 50 lts"))
        XCTAssertEqual(InventoryStrings.minimumValue(10, unit: "lts"), expected(spanish: "10 lts", english: "10 lts"))
        XCTAssertEqual(InventoryStrings.perUnit("kg"), expected(spanish: "por kg", english: "per kg"))
        XCTAssertEqual(InventoryStrings.quantityWithUnit(100, unit: "und"), expected(spanish: "100 und", english: "100 und"))
        XCTAssertEqual(InventoryStrings.defaultEventName(serviceType: nil), expected(spanish: "Evento", english: "Event"))
        // A provided serviceType is echoed verbatim through the passthrough
        // format ("%@"), not translated — assert the echo is locale-independent
        // rather than assuming "Boda" becomes "Wedding" under an en locale.
        XCTAssertEqual(InventoryStrings.defaultEventName(serviceType: "Boda"), "Boda")
        XCTAssertEqual(InventoryStrings.eventWithClient("Tiago"), expected(spanish: "Evento - Tiago", english: "Event - Tiago"))
        XCTAssertEqual(
            InventoryStrings.shortageMessage(demand: 100, stock: 40, missing: 60, unit: "kg"),
            expected(
                spanish: "Necesitas 100 kg en los próximos 7 días. Tienes 40 kg. Faltan 60 kg.",
                english: "You need 100 kg in the next 7 days. You have 40 kg. Missing 60 kg."
            )
        )
        XCTAssertEqual(
            InventoryStrings.lowStockMessage(stock: 5, unit: "und", minimum: 10),
            expected(
                spanish: "Tu stock actual (5 und) está por debajo del mínimo recomendado (10 und).",
                english: "Your current stock (5 und) is below the recommended minimum (10 und)."
            )
        )
        XCTAssertEqual(InventoryStrings.inDays(3), expected(spanish: "en 3 días", english: "in 3 days"))
    }
}

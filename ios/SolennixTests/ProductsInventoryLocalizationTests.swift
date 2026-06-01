import XCTest
import Foundation
@testable import SolennixFeatures

final class ProductsInventoryLocalizationTests: XCTestCase {

    override func setUp() {
        super.setUp()
        // Save the previous preferred locale to avoid polluting user settings
        let oldLocale = UserDefaults.standard.string(forKey: "preferredLocale")
        addTeardownBlock {
            if let oldLocale = oldLocale {
                UserDefaults.standard.set(oldLocale, forKey: "preferredLocale")
            } else {
                UserDefaults.standard.removeObject(forKey: "preferredLocale")
            }
        }
    }

    func testProductStringsResolveForSpanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")
        
        XCTAssertEqual(ProductStrings.title, "Productos")
        XCTAssertEqual(ProductStrings.searchPrompt, "Buscar productos")
        XCTAssertEqual(ProductStrings.deletedMessage("Hamburguesa"), "Hamburguesa eliminado")
        XCTAssertEqual(ProductStrings.deletePrompt("Cazuela"), "Se eliminará \"Cazuela\". Podrás deshacer durante unos segundos.")
        XCTAssertEqual(ProductStrings.unitsNext7Days(5), "5 unidades en los próximos 7 días")
        XCTAssertEqual(ProductStrings.revenueMessage("$10,000"), "Alta demanda esta semana. Ingreso estimado total: $10,000")
        XCTAssertEqual(ProductStrings.demandSummary(units: 1, events: 1), "1 unidad en 1 evento próximo")
        XCTAssertEqual(ProductStrings.demandSummary(units: 3, events: 5), "3 unidades en 5 eventos próximos")
        XCTAssertEqual(ProductStrings.stockWithUnit(10, unit: "kg"), "Stock: 10 kg")
        XCTAssertEqual(ProductStrings.costPerUnit("$50", unit: "kg"), "· $50/kg")
        XCTAssertEqual(ProductStrings.upcomingEventsCount(3), "Próximos 3 eventos")
        XCTAssertEqual(ProductStrings.quantityForPeople(quantity: 100, people: 50), "Total: 100 unidades para 50 personas")
        XCTAssertEqual(ProductStrings.inDays(4), "en 4 días")
        XCTAssertEqual(ProductStrings.quantityUnits(25), "25 uds")
        XCTAssertEqual(ProductStrings.eventCount(1), "1 evento")
        XCTAssertEqual(ProductStrings.eventCount(4), "4 eventos")
        XCTAssertEqual(ProductStrings.estimatedAmount("$500"), "$500 est.")
        XCTAssertEqual(ProductStrings.compositionSummary(ingredients: 1, supplies: 0, equipment: 0), "1 insumo")
        XCTAssertEqual(ProductStrings.compositionSummary(ingredients: 3, supplies: 2, equipment: 1), "3 insumos, 2 insumos por evento, 1 equipo")
    }

    func testProductStringsResolveForEnglish() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")
        
        XCTAssertEqual(ProductStrings.title, "Products")
        XCTAssertEqual(ProductStrings.searchPrompt, "Search products")
        XCTAssertEqual(ProductStrings.deletedMessage("Burger"), "Burger deleted")
        XCTAssertEqual(ProductStrings.deletePrompt("Soup"), "Are you sure you want to delete \"Soup\"? You can undo for a few seconds.")
        XCTAssertEqual(ProductStrings.unitsNext7Days(5), "5 units in the next 7 days")
        XCTAssertEqual(ProductStrings.revenueMessage("$10,000"), "High demand this week. Estimated total revenue: $10,000")
        XCTAssertEqual(ProductStrings.demandSummary(units: 1, events: 1), "1 unit across 1 upcoming event")
        XCTAssertEqual(ProductStrings.demandSummary(units: 3, events: 5), "3 units across 5 upcoming events")
        XCTAssertEqual(ProductStrings.stockWithUnit(10, unit: "kg"), "Stock: 10 kg")
        XCTAssertEqual(ProductStrings.costPerUnit("$50", unit: "kg"), "· $50/kg")
        XCTAssertEqual(ProductStrings.upcomingEventsCount(3), "Upcoming 3 events")
        XCTAssertEqual(ProductStrings.quantityForPeople(quantity: 100, people: 50), "Total: 100 units for 50 people")
        XCTAssertEqual(ProductStrings.inDays(4), "in 4 days")
        XCTAssertEqual(ProductStrings.quantityUnits(25), "25 units")
        XCTAssertEqual(ProductStrings.eventCount(1), "1 event")
        XCTAssertEqual(ProductStrings.eventCount(4), "4 events")
        XCTAssertEqual(ProductStrings.estimatedAmount("$500"), "$500 est.")
        XCTAssertEqual(ProductStrings.compositionSummary(ingredients: 1, supplies: 0, equipment: 0), "1 ingredient")
        XCTAssertEqual(ProductStrings.compositionSummary(ingredients: 3, supplies: 2, equipment: 1), "3 ingredients, 2 supplies per event, 1 equipment")
    }

    func testInventoryStringsResolveForSpanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")
        
        XCTAssertEqual(InventoryStrings.title, "Inventario")
        XCTAssertEqual(InventoryStrings.searchPrompt, "Buscar inventario")
        XCTAssertEqual(InventoryStrings.deletedMessage("Carne"), "Carne eliminado")
        XCTAssertEqual(InventoryStrings.deletePrompt("Pan"), "Se eliminará \"Pan\". Podrás deshacer durante unos segundos.")
        XCTAssertEqual(InventoryStrings.permanentDeletePrompt("Queso"), "¿Estás seguro de que querés eliminar \"Queso\"? Esta acción no se puede deshacer.")
        XCTAssertEqual(InventoryStrings.minLabel(5), "(min: 5)")
        XCTAssertEqual(InventoryStrings.stockActual(50, unit: "lts"), "Stock actual: 50 lts")
        XCTAssertEqual(InventoryStrings.minimumValue(10, unit: "lts"), "10 lts")
        XCTAssertEqual(InventoryStrings.perUnit("kg"), "por kg")
        XCTAssertEqual(InventoryStrings.quantityWithUnit(100, unit: "und"), "100 und")
        XCTAssertEqual(InventoryStrings.defaultEventName(serviceType: nil), "Evento")
        XCTAssertEqual(InventoryStrings.defaultEventName(serviceType: "Boda"), "Boda")
        XCTAssertEqual(InventoryStrings.eventWithClient("Tiago"), "Evento - Tiago")
        XCTAssertEqual(InventoryStrings.shortageMessage(demand: 100, stock: 40, missing: 60, unit: "kg"), "Necesitas 100 kg en los próximos 7 días. Tienes 40 kg. Faltan 60 kg.")
        XCTAssertEqual(InventoryStrings.lowStockMessage(stock: 5, unit: "und", minimum: 10), "Tu stock actual (5 und) está por debajo del mínimo recomendado (10 und).")
        XCTAssertEqual(InventoryStrings.inDays(3), "en 3 días")
    }

    func testInventoryStringsResolveForEnglish() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")
        
        XCTAssertEqual(InventoryStrings.title, "Inventory")
        XCTAssertEqual(InventoryStrings.searchPrompt, "Search inventory")
        XCTAssertEqual(InventoryStrings.deletedMessage("Meat"), "Meat deleted")
        XCTAssertEqual(InventoryStrings.deletePrompt("Bread"), "Are you sure you want to delete \"Bread\"? You can undo for a few seconds.")
        XCTAssertEqual(InventoryStrings.permanentDeletePrompt("Cheese"), "Are you sure you want to delete \"Cheese\"? This action cannot be undone.")
        XCTAssertEqual(InventoryStrings.minLabel(5), "(min: 5)")
        XCTAssertEqual(InventoryStrings.stockActual(50, unit: "lts"), "Current stock: 50 lts")
        XCTAssertEqual(InventoryStrings.minimumValue(10, unit: "lts"), "10 lts")
        XCTAssertEqual(InventoryStrings.perUnit("kg"), "per kg")
        XCTAssertEqual(InventoryStrings.quantityWithUnit(100, unit: "und"), "100 und")
        XCTAssertEqual(InventoryStrings.defaultEventName(serviceType: nil), "Event")
        XCTAssertEqual(InventoryStrings.defaultEventName(serviceType: "Wedding"), "Wedding")
        XCTAssertEqual(InventoryStrings.eventWithClient("Tiago"), "Event - Tiago")
        XCTAssertEqual(InventoryStrings.shortageMessage(demand: 100, stock: 40, missing: 60, unit: "kg"), "You need 100 kg in the next 7 days. You have 40 kg. Missing 60 kg.")
        XCTAssertEqual(InventoryStrings.lowStockMessage(stock: 5, unit: "und", minimum: 10), "Your current stock (5 und) is below the recommended minimum (10 und).")
        XCTAssertEqual(InventoryStrings.inDays(3), "in 3 days")
    }
}

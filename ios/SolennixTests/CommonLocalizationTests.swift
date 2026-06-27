import XCTest
@testable import SolennixFeatures

// MARK: - Common Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class CommonLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    // MARK: - Onboarding Tips Tests

    func testNewEventTipTitle_Resolves() {
        XCTAssertEqual(CommonStrings.newEventTipTitle, expected(spanish: "Crear un Evento", english: "Create an Event"))
    }

    func testNewEventTipMessage_Resolves() {
        XCTAssertEqual(
            CommonStrings.newEventTipMessage,
            expected(
                spanish: "Toca aquí para iniciar la creación de un nuevo evento, cotización o contrato.",
                english: "Tap here to start creating a new event, quote, or contract."
            )
        )
    }

    func testQuickQuoteTipMessage_Resolves() {
        XCTAssertEqual(
            CommonStrings.quickQuoteTipMessage,
            expected(
                spanish: "Usa esta herramienta para generar un presupuesto en el momento sin necesidad de crear el cliente primero.",
                english: "Use this tool to create a quote instantly without creating the client first."
            )
        )
    }

    func testSwipeActionTipTitle_Resolves() {
        XCTAssertEqual(CommonStrings.swipeActionTipTitle, expected(spanish: "Acciones Rápidas", english: "Quick Actions"))
    }

    func testSwipeActionTipMessage_Resolves() {
        XCTAssertEqual(
            CommonStrings.swipeActionTipMessage,
            expected(
                spanish: "Desliza los elementos de la lista hacia la izquierda o derecha para ver más opciones como editar, eliminar o llamar.",
                english: "Swipe list items left or right to see more options like edit, delete, or call."
            )
        )
    }

    // MARK: - Paywall Tests

    func testPaywallTitle_Resolves() {
        XCTAssertEqual(CommonStrings.paywallTitle, expected(spanish: "Límite alcanzado", english: "Limit reached"))
    }

    func testPaywallUpgradeButton_Resolves() {
        XCTAssertEqual(CommonStrings.paywallUpgradeButton, expected(spanish: "Ver planes", english: "View plans"))
    }

    func testPaywallDismissButton_Resolves() {
        XCTAssertEqual(CommonStrings.paywallDismissButton, expected(spanish: "Cerrar", english: "Close"))
    }

    // MARK: - Payment Entry Sheet Tests

    func testPaymentEntryDefaultTitle_Resolves() {
        XCTAssertEqual(CommonStrings.paymentEntryDefaultTitle, expected(spanish: "Registrar Pago", english: "Register Payment"))
    }

    func testPaymentEntryDefaultConfirm_Resolves() {
        XCTAssertEqual(CommonStrings.paymentEntryDefaultConfirm, expected(spanish: "Guardar Pago", english: "Save Payment"))
    }

    func testPaymentEntryAmountLabel_Resolves() {
        XCTAssertEqual(CommonStrings.paymentEntryAmountLabel, expected(spanish: "Monto", english: "Amount"))
    }

    func testPaymentEntryMethodLabel_Resolves() {
        XCTAssertEqual(CommonStrings.paymentEntryMethodLabel, expected(spanish: "Método de pago", english: "Payment method"))
    }

    func testPaymentEntryNotesLabel_Resolves() {
        XCTAssertEqual(CommonStrings.paymentEntryNotesLabel, expected(spanish: "Notas (opcional)", english: "Notes (optional)"))
    }

    func testPaymentEntryNotesPlaceholder_Resolves() {
        XCTAssertEqual(CommonStrings.paymentEntryNotesPlaceholder, expected(spanish: "Notas del pago", english: "Payment notes"))
    }

    func testPaymentEntryCancelButton_Resolves() {
        XCTAssertEqual(CommonStrings.paymentEntryCancelButton, expected(spanish: "Cancelar", english: "Cancel"))
    }

    // MARK: - Payment Methods Tests

    func testPaymentMethodCash_Resolves() {
        XCTAssertEqual(CommonStrings.paymentMethodCash, expected(spanish: "Efectivo", english: "Cash"))
    }

    func testPaymentMethodTransfer_Resolves() {
        XCTAssertEqual(CommonStrings.paymentMethodTransfer, expected(spanish: "Transferencia", english: "Transfer"))
    }

    func testPaymentMethodCard_Resolves() {
        XCTAssertEqual(CommonStrings.paymentMethodCard, expected(spanish: "Tarjeta", english: "Card"))
    }

    func testPaymentMethodCheck_Resolves() {
        XCTAssertEqual(CommonStrings.paymentMethodCheck, expected(spanish: "Cheque", english: "Check"))
    }

    // MARK: - Navigation, Tabs & Menu Tests

    func testNavigationTabs_Resolves() {
        XCTAssertEqual(CommonStrings.tabHome, expected(spanish: "Inicio", english: "Home"))
        XCTAssertEqual(CommonStrings.tabCalendar, expected(spanish: "Calendario", english: "Calendar"))
        XCTAssertEqual(CommonStrings.tabEvents, expected(spanish: "Eventos", english: "Events"))
        XCTAssertEqual(CommonStrings.tabClients, expected(spanish: "Clientes", english: "Clients"))
        XCTAssertEqual(CommonStrings.tabMore, expected(spanish: "Más", english: "More"))

        XCTAssertEqual(CommonStrings.navPersonnel, expected(spanish: "Personal", english: "Staff"))
        XCTAssertEqual(CommonStrings.navProducts, expected(spanish: "Productos", english: "Products"))
        XCTAssertEqual(CommonStrings.navInventory, expected(spanish: "Inventario", english: "Inventory"))

        XCTAssertEqual(CommonStrings.moreMenuProductsSubtitle, expected(spanish: "Catálogo y recetas", english: "Catalog and recipes"))
        XCTAssertEqual(CommonStrings.navHeaderConfiguracion, expected(spanish: "Configuración", english: "Settings"))
    }
}

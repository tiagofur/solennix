import XCTest
@testable import SolennixFeatures

// MARK: - Common Localization Tests

final class CommonLocalizationTests: XCTestCase {

    override func tearDown() {
        super.tearDown()
        UserDefaults.standard.removeObject(forKey: "preferredLocale")
    }

    // MARK: - Helpers

    private func setLocale(_ identifier: String) {
        UserDefaults.standard.set(identifier, forKey: "preferredLocale")
    }

    // MARK: - Onboarding Tips Tests

    func testNewEventTipTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.newEventTipTitle, "Crear un Evento")
    }

    func testNewEventTipTitle_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.newEventTipTitle, "Create an Event")
    }

    func testNewEventTipMessage_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.newEventTipMessage, "Toca aquí para iniciar la creación de un nuevo evento, cotización o contrato.")
    }

    func testNewEventTipMessage_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.newEventTipMessage, "Tap here to start creating a new event, quote, or contract.")
    }

    func testQuickQuoteTipMessage_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.quickQuoteTipMessage, "Usa esta herramienta para generar un presupuesto en el momento sin necesidad de crear el cliente primero.")
    }

    func testQuickQuoteTipMessage_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.quickQuoteTipMessage, "Use this tool to create a quote instantly without creating the client first.")
    }

    func testSwipeActionTipTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.swipeActionTipTitle, "Acciones Rápidas")
    }

    func testSwipeActionTipTitle_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.swipeActionTipTitle, "Quick Actions")
    }

    func testSwipeActionTipMessage_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.swipeActionTipMessage, "Desliza los elementos de la lista hacia la izquierda o derecha para ver más opciones como editar, eliminar o llamar.")
    }

    func testSwipeActionTipMessage_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.swipeActionTipMessage, "Swipe list items left or right to see more options like edit, delete, or call.")
    }

    // MARK: - FAB Tests

    func testNewEventLabel_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.newEventLabel, "Nuevo Evento")
    }

    func testNewEventLabel_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.newEventLabel, "New Event")
    }

    // MARK: - Paywall Tests

    func testPaywallTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paywallTitle, "Límite alcanzado")
    }

    func testPaywallTitle_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paywallTitle, "Limit reached")
    }

    func testPaywallUpgradeButton_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paywallUpgradeButton, "Ver planes")
    }

    func testPaywallUpgradeButton_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paywallUpgradeButton, "View plans")
    }

    func testPaywallDismissButton_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paywallDismissButton, "Cerrar")
    }

    func testPaywallDismissButton_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paywallDismissButton, "Close")
    }

    // MARK: - Payment Entry Sheet Tests

    func testPaymentEntryDefaultTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentEntryDefaultTitle, "Registrar Pago")
    }

    func testPaymentEntryDefaultTitle_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentEntryDefaultTitle, "Register Payment")
    }

    func testPaymentEntryDefaultConfirm_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentEntryDefaultConfirm, "Guardar Pago")
    }

    func testPaymentEntryDefaultConfirm_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentEntryDefaultConfirm, "Save Payment")
    }

    func testPaymentEntryAmountLabel_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentEntryAmountLabel, "Monto")
    }

    func testPaymentEntryAmountLabel_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentEntryAmountLabel, "Amount")
    }

    func testPaymentEntryMethodLabel_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentEntryMethodLabel, "Método de pago")
    }

    func testPaymentEntryMethodLabel_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentEntryMethodLabel, "Payment method")
    }

    func testPaymentEntryNotesLabel_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentEntryNotesLabel, "Notas (opcional)")
    }

    func testPaymentEntryNotesLabel_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentEntryNotesLabel, "Notes (optional)")
    }

    func testPaymentEntryNotesPlaceholder_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentEntryNotesPlaceholder, "Notas del pago")
    }

    func testPaymentEntryNotesPlaceholder_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentEntryNotesPlaceholder, "Payment notes")
    }

    func testPaymentEntryCancelButton_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentEntryCancelButton, "Cancelar")
    }

    func testPaymentEntryCancelButton_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentEntryCancelButton, "Cancel")
    }

    // MARK: - Payment Methods Tests

    func testPaymentMethodCash_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentMethodCash, "Efectivo")
    }

    func testPaymentMethodCash_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentMethodCash, "Cash")
    }

    func testPaymentMethodTransfer_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentMethodTransfer, "Transferencia")
    }

    func testPaymentMethodTransfer_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentMethodTransfer, "Transfer")
    }

    func testPaymentMethodCard_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentMethodCard, "Tarjeta")
    }

    func testPaymentMethodCard_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentMethodCard, "Card")
    }

    func testPaymentMethodCheck_Spanish() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.paymentMethodCheck, "Cheque")
    }

    func testPaymentMethodCheck_English() {
        setLocale("en")
        XCTAssertEqual(CommonStrings.paymentMethodCheck, "Check")
    }

    // MARK: - Dynamic Switching

    func testDynamicSwitching_NewEventTipTitle() {
        setLocale("es")
        XCTAssertEqual(CommonStrings.newEventTipTitle, "Crear un Evento")
        setLocale("en")
        XCTAssertEqual(CommonStrings.newEventTipTitle, "Create an Event")
    }
}

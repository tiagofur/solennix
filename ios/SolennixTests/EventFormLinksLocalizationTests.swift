import XCTest
@testable import SolennixFeatures

// MARK: - Event Form Links Localization Tests

final class EventFormLinksLocalizationTests: XCTestCase {

    override func tearDown() {
        super.tearDown()
        UserDefaults.standard.removeObject(forKey: "preferredLocale")
    }

    // MARK: - Helpers

    private func setLocale(_ identifier: String) {
        UserDefaults.standard.set(identifier, forKey: "preferredLocale")
    }

    // MARK: - General Tests

    func testTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.title, "Links de Formulario")
    }

    func testTitle_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.title, "Form Links")
    }

    func testGenerateLinkAccessibility_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.generateLinkAccessibility, "Generar link")
    }

    func testGenerateLinkAccessibility_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.generateLinkAccessibility, "Generate link")
    }

    func testDeleteConfirmTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.deleteConfirmTitle, "Eliminar link")
    }

    func testDeleteConfirmTitle_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.deleteConfirmTitle, "Delete link")
    }

    func testDeleteConfirmButton_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.deleteConfirmButton, "Eliminar")
    }

    func testDeleteConfirmButton_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.deleteConfirmButton, "Delete")
    }

    func testCancel_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.cancel, "Cancelar")
    }

    func testCancel_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.cancel, "Cancel")
    }

    func testLinkDeletedToast_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.linkDeletedToast, "Link eliminado")
    }

    func testLinkDeletedToast_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.linkDeletedToast, "Link deleted")
    }

    func testErrorLoading_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.errorLoading, "Error al cargar")
    }

    func testErrorLoading_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.errorLoading, "Error loading")
    }

    func testRetry_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.retry, "Reintentar")
    }

    func testRetry_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.retry, "Retry")
    }

    func testEmptyTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.emptyTitle, "Sin formularios")
    }

    func testEmptyTitle_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.emptyTitle, "No form links")
    }

    func testEmptyMessage_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.emptyMessage, "Genera un formulario para que tus clientes compartan la información del evento.")
    }

    func testEmptyMessage_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.emptyMessage, "Generate a form link so your clients can share the event information.")
    }

    func testEmptyAction_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.emptyAction, "Generar formulario")
    }

    func testEmptyAction_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.emptyAction, "Generate form link")
    }

    // MARK: - Swipes & Context Menu

    func testSwipeDelete_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.swipeDelete, "Eliminar")
    }

    func testSwipeDelete_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.swipeDelete, "Delete")
    }

    func testSwipeCopy_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.swipeCopy, "Copiar")
    }

    func testSwipeCopy_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.swipeCopy, "Copy")
    }

    func testSwipeShare_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.swipeShare, "Compartir")
    }

    func testSwipeShare_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.swipeShare, "Share")
    }

    func testContextMenuCopy_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.contextMenuCopy, "Copiar Link")
    }

    func testContextMenuCopy_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.contextMenuCopy, "Copy Link")
    }

    func testContextMenuViewEvent_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.contextMenuViewEvent, "Ver Evento")
    }

    func testContextMenuViewEvent_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.contextMenuViewEvent, "View Event")
    }

    func testLabelPlaceholder_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.labelPlaceholder, "Sin etiqueta")
    }

    func testLabelPlaceholder_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.labelPlaceholder, "No label")
    }

    // MARK: - Status

    func testCompletedForm_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.completedForm, "Formulario completado")
    }

    func testCompletedForm_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.completedForm, "Form completed")
    }

    func testStatusActive_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.statusActive, "Activo")
    }

    func testStatusActive_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.statusActive, "Active")
    }

    func testStatusUsed_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.statusUsed, "Usado")
    }

    func testStatusUsed_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.statusUsed, "Used")
    }

    func testStatusExpired_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.statusExpired, "Expirado")
    }

    func testStatusExpired_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.statusExpired, "Expired")
    }

    // MARK: - Generation Sheet

    func testSheetLabelSection_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.sheetLabelSection, "Etiqueta (opcional)")
    }

    func testSheetLabelSection_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.sheetLabelSection, "Label (optional)")
    }

    func testSheetLabelPlaceholder_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.sheetLabelPlaceholder, "Ej: Boda Rodriguez, Evento Mayo")
    }

    func testSheetLabelPlaceholder_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.sheetLabelPlaceholder, "e.g. Wedding Rodriguez, May Event")
    }

    func testSheetTtlSection_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.sheetTtlSection, "Vigencia del link")
    }

    func testSheetTtlSection_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.sheetTtlSection, "Link validity")
    }

    func testSheetTtlLabel_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.sheetTtlLabel, "Dias de vigencia")
    }

    func testSheetTtlLabel_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.sheetTtlLabel, "Days of validity")
    }

    func testSheetHint_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.sheetHint, "El cliente podra llenar sus datos de evento a traves de este link. Una vez usado, no podra volver a utilizarse.")
    }

    func testSheetHint_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.sheetHint, "The client will be able to fill in their event details through this link. Once used, it cannot be used again.")
    }

    func testSheetTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.sheetTitle, "Generar Link")
    }

    func testSheetTitle_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.sheetTitle, "Generate Link")
    }

    func testSheetGenerateButton_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.sheetGenerateButton, "Generar")
    }

    func testSheetGenerateButton_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.sheetGenerateButton, "Generate")
    }

    // MARK: - Toasts & Errors

    func testLinkCopiedToast_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.linkCopiedToast, "Link copiado")
    }

    func testLinkCopiedToast_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.linkCopiedToast, "Link copied")
    }

    func testErrorUnexpected_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.errorUnexpected, "Ocurrió un error inesperado.")
    }

    func testErrorUnexpected_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.errorUnexpected, "An unexpected error occurred.")
    }

    func testErrorUnexpectedRetry_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.errorUnexpectedRetry, "Ocurrió un error inesperado. Intenta de nuevo.")
    }

    func testErrorUnexpectedRetry_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.errorUnexpectedRetry, "An unexpected error occurred. Please try again.")
    }

    // MARK: - Formatted Tests

    func testDeleteConfirmMessage_Spanish() {
        setLocale("es")
        XCTAssertEqual(
            EventFormLinksStrings.deleteConfirmMessage(label: "Boda Rodriguez"),
            "Se eliminara el link \"Boda Rodriguez\". Esta accion no se puede deshacer."
        )
    }

    func testDeleteConfirmMessage_English() {
        setLocale("en")
        XCTAssertEqual(
            EventFormLinksStrings.deleteConfirmMessage(label: "Boda Rodriguez"),
            "The link \"Boda Rodriguez\" will be deleted. This action cannot be undone."
        )
    }

    func testExpiresLabel_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.expiresLabel(date: "12 May"), "Expira: 12 May")
    }

    func testExpiresLabel_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.expiresLabel(date: "12 May"), "Expires: 12 May")
    }

    func testTtlDaysLabel_Single_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.ttlDaysLabel(1), "1 dia")
    }

    func testTtlDaysLabel_Single_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.ttlDaysLabel(1), "1 day")
    }

    func testTtlDaysLabel_Plural_Spanish() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.ttlDaysLabel(7), "7 dias")
    }

    func testTtlDaysLabel_Plural_English() {
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.ttlDaysLabel(7), "7 days")
    }

    // MARK: - Dynamic Switching

    func testDynamicSwitching_Title() {
        setLocale("es")
        XCTAssertEqual(EventFormLinksStrings.title, "Links de Formulario")
        setLocale("en")
        XCTAssertEqual(EventFormLinksStrings.title, "Form Links")
    }
}

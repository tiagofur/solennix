import XCTest
@testable import SolennixFeatures

// MARK: - Event Form Links Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class EventFormLinksLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    // MARK: - General Tests

    func testTitle_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.title, expected(spanish: "Links de Formulario", english: "Form Links"))
    }

    func testGenerateLinkAccessibility_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.generateLinkAccessibility, expected(spanish: "Generar link", english: "Generate link"))
    }

    func testDeleteConfirmTitle_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.deleteConfirmTitle, expected(spanish: "Eliminar link", english: "Delete link"))
    }

    func testDeleteConfirmButton_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.deleteConfirmButton, expected(spanish: "Eliminar", english: "Delete"))
    }

    func testCancel_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.cancel, expected(spanish: "Cancelar", english: "Cancel"))
    }

    func testLinkDeletedToast_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.linkDeletedToast, expected(spanish: "Link eliminado", english: "Link deleted"))
    }

    func testErrorLoading_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.errorLoading, expected(spanish: "Error al cargar", english: "Error loading"))
    }

    func testRetry_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.retry, expected(spanish: "Reintentar", english: "Retry"))
    }

    func testEmptyTitle_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.emptyTitle, expected(spanish: "Sin formularios", english: "No form links"))
    }

    func testEmptyMessage_Resolves() {
        XCTAssertEqual(
            EventFormLinksStrings.emptyMessage,
            expected(
                spanish: "Genera un formulario para que tus clientes compartan la información del evento.",
                english: "Generate a form link so your clients can share the event information."
            )
        )
    }

    func testEmptyAction_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.emptyAction, expected(spanish: "Generar formulario", english: "Generate form link"))
    }

    // MARK: - Swipes & Context Menu

    func testSwipeDelete_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.swipeDelete, expected(spanish: "Eliminar", english: "Delete"))
    }

    func testSwipeCopy_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.swipeCopy, expected(spanish: "Copiar", english: "Copy"))
    }

    func testSwipeShare_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.swipeShare, expected(spanish: "Compartir", english: "Share"))
    }

    func testContextMenuCopy_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.contextMenuCopy, expected(spanish: "Copiar Link", english: "Copy Link"))
    }

    func testContextMenuViewEvent_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.contextMenuViewEvent, expected(spanish: "Ver Evento", english: "View Event"))
    }

    func testLabelPlaceholder_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.labelPlaceholder, expected(spanish: "Sin etiqueta", english: "No label"))
    }

    // MARK: - Status

    func testCompletedForm_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.completedForm, expected(spanish: "Formulario completado", english: "Form completed"))
    }

    func testStatusActive_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.statusActive, expected(spanish: "Activo", english: "Active"))
    }

    func testStatusUsed_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.statusUsed, expected(spanish: "Usado", english: "Used"))
    }

    func testStatusExpired_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.statusExpired, expected(spanish: "Expirado", english: "Expired"))
    }

    // MARK: - Generation Sheet

    func testSheetLabelSection_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.sheetLabelSection, expected(spanish: "Etiqueta (opcional)", english: "Label (optional)"))
    }

    func testSheetLabelPlaceholder_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.sheetLabelPlaceholder, expected(spanish: "Ej: Boda Rodriguez, Evento Mayo", english: "e.g. Wedding Rodriguez, May Event"))
    }

    func testSheetTtlSection_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.sheetTtlSection, expected(spanish: "Vigencia del link", english: "Link validity"))
    }

    func testSheetTtlLabel_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.sheetTtlLabel, expected(spanish: "Días de vigencia", english: "Days of validity"))
    }

    func testSheetHint_Resolves() {
        XCTAssertEqual(
            EventFormLinksStrings.sheetHint,
            expected(
                spanish: "El cliente podrá llenar sus datos de evento a través de este link. Una vez usado, no podrá volver a utilizarse.",
                english: "The client will be able to fill in their event details through this link. Once used, it cannot be used again."
            )
        )
    }

    func testSheetTitle_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.sheetTitle, expected(spanish: "Generar Link", english: "Generate Link"))
    }

    func testSheetGenerateButton_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.sheetGenerateButton, expected(spanish: "Generar", english: "Generate"))
    }

    // MARK: - Toasts & Errors

    func testLinkCopiedToast_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.linkCopiedToast, expected(spanish: "Link copiado", english: "Link copied"))
    }

    func testErrorUnexpected_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.errorUnexpected, expected(spanish: "Ocurrió un error inesperado.", english: "An unexpected error occurred."))
    }

    func testErrorUnexpectedRetry_Resolves() {
        XCTAssertEqual(
            EventFormLinksStrings.errorUnexpectedRetry,
            expected(
                spanish: "Ocurrió un error inesperado. Intenta de nuevo.",
                english: "An unexpected error occurred. Please try again."
            )
        )
    }

    // MARK: - Formatted Tests

    func testDeleteConfirmMessage_Resolves() {
        XCTAssertEqual(
            EventFormLinksStrings.deleteConfirmMessage(label: "Boda Rodriguez"),
            expected(
                spanish: "Se eliminará el link \"Boda Rodriguez\". Esta acción no se puede deshacer.",
                english: "The link \"Boda Rodriguez\" will be deleted. This action cannot be undone."
            )
        )
    }

    func testExpiresLabel_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.expiresLabel(date: "12 May"), expected(spanish: "Expira: 12 May", english: "Expires: 12 May"))
    }

    func testTtlDaysLabel_Single_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.ttlDaysLabel(1), expected(spanish: "1 día", english: "1 day"))
    }

    func testTtlDaysLabel_Plural_Resolves() {
        XCTAssertEqual(EventFormLinksStrings.ttlDaysLabel(7), expected(spanish: "7 días", english: "7 days"))
    }
}

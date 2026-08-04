import XCTest
@testable import SolennixFeatures

/// Localization smoke tests for Solicitudes share-link copy (Phase 6).
final class RequestLinksLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    func testTabAndTitle() {
        XCTAssertEqual(RequestsStrings.tabInbox, expected(spanish: "Bandeja", english: "Inbox"))
        XCTAssertEqual(RequestsStrings.tabLinks, expected(spanish: "Links", english: "Links"))
        XCTAssertEqual(
            RequestsStrings.linksTitle,
            expected(spanish: "Compartir link", english: "Share link")
        )
    }

    func testEmptyAndActions() {
        XCTAssertEqual(
            RequestsStrings.linkEmptyTitle,
            expected(spanish: "Sin links", english: "No links")
        )
        XCTAssertEqual(
            RequestsStrings.linkEmptyAction,
            expected(spanish: "Generar link", english: "Generate link")
        )
        XCTAssertEqual(
            RequestsStrings.linkGenerateAccessibility,
            expected(spanish: "Generar link", english: "Generate link")
        )
        XCTAssertEqual(
            RequestsStrings.linkDeleteConfirmTitle,
            expected(spanish: "Eliminar link", english: "Delete link")
        )
    }

    func testStatusAndModes() {
        XCTAssertEqual(
            RequestsStrings.linkStatusActive,
            expected(spanish: "Activo", english: "Active")
        )
        XCTAssertEqual(
            RequestsStrings.linkStatusRevoked,
            expected(spanish: "Revocado", english: "Revoked")
        )
        XCTAssertEqual(
            RequestsStrings.linkModeAutoEvent,
            expected(spanish: "Auto evento", english: "Auto event")
        )
        XCTAssertEqual(
            RequestsStrings.linkModeAutoQuote,
            expected(spanish: "Auto cotizacion", english: "Auto quote")
        )
        XCTAssertEqual(
            RequestsStrings.linkModeStandard,
            expected(spanish: "Solo solicitud", english: "Request only")
        )
    }

    func testSheetAndToasts() {
        XCTAssertEqual(
            RequestsStrings.linkSheetTitle,
            expected(spanish: "Generar Link", english: "Generate Link")
        )
        XCTAssertEqual(
            RequestsStrings.linkCopiedToast,
            expected(spanish: "Link copiado", english: "Link copied")
        )
        XCTAssertEqual(
            RequestsStrings.linkDeletedToast,
            expected(spanish: "Link eliminado", english: "Link deleted")
        )
        XCTAssertEqual(
            RequestsStrings.linkExpiresLabel(date: "12 May"),
            expected(spanish: "Expira: 12 May", english: "Expires: 12 May")
        )
        XCTAssertEqual(
            RequestsStrings.linkTtlDaysLabel(1),
            expected(spanish: "1 dia", english: "1 day")
        )
    }
}

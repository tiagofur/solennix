import XCTest
import Foundation
@testable import SolennixFeatures

// MARK: - Events Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class EventsLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    func testClientPortalShareStringsResolve() {
        XCTAssertEqual(ClientPortalShareStrings.title, expected(spanish: "Portal del cliente", english: "Client portal"))
        XCTAssertEqual(ClientPortalShareStrings.shareSubject, expected(spanish: "Portal del cliente — Solennix", english: "Client portal — Solennix"))
        XCTAssertEqual(
            ClientPortalShareStrings.description,
            expected(
                spanish: "Un enlace privado para que tu cliente vea el evento, el estado de pagos y los detalles clave.",
                english: "A private link so your client can see the event, payment status, and key details."
            )
        )
        XCTAssertEqual(ClientPortalShareStrings.loading, expected(spanish: "Cargando…", english: "Loading…"))
        XCTAssertEqual(
            ClientPortalShareStrings.noExpiry,
            expected(
                spanish: "Este enlace no tiene vencimiento. Podés deshabilitarlo cuando quieras.",
                english: "This link does not expire. You can disable it whenever you want."
            )
        )
        XCTAssertEqual(ClientPortalShareStrings.copied, expected(spanish: "Copiado", english: "Copied"))
        XCTAssertEqual(ClientPortalShareStrings.copyLink, expected(spanish: "Copiar enlace", english: "Copy link"))
        XCTAssertEqual(ClientPortalShareStrings.share, expected(spanish: "Compartir", english: "Share"))
        XCTAssertEqual(ClientPortalShareStrings.rotateLink, expected(spanish: "Rotar enlace", english: "Rotate link"))
        XCTAssertEqual(ClientPortalShareStrings.disableLink, expected(spanish: "Deshabilitar enlace", english: "Disable link"))
        XCTAssertEqual(ClientPortalShareStrings.disable, expected(spanish: "Deshabilitar", english: "Disable"))
        XCTAssertEqual(ClientPortalShareStrings.cancel, expected(spanish: "Cancelar", english: "Cancel"))
        XCTAssertEqual(ClientPortalShareStrings.expiryPrefix, expected(spanish: "Vence el", english: "Expires on"))
        XCTAssertEqual(
            ClientPortalShareStrings.emptyState,
            expected(
                spanish: "Todavía no generaste un enlace para este evento.",
                english: "You have not generated a link for this event yet."
            )
        )
        XCTAssertEqual(ClientPortalShareStrings.generateLink, expected(spanish: "Generar enlace para el cliente", english: "Generate client link"))
        XCTAssertEqual(ClientPortalShareStrings.copyToast, expected(spanish: "Enlace copiado al portapapeles.", english: "Link copied to clipboard."))
        XCTAssertEqual(ClientPortalShareStrings.generatedToast, expected(spanish: "Enlace generado. Compartilo con tu cliente.", english: "Link generated. Share it with your client."))
        XCTAssertEqual(ClientPortalShareStrings.rotatedToast, expected(spanish: "Enlace rotado. El anterior ya no funciona.", english: "Link rotated. The previous one no longer works."))
        XCTAssertEqual(ClientPortalShareStrings.disabledToast, expected(spanish: "Enlace deshabilitado.", english: "Link disabled."))
        XCTAssertEqual(
            ClientPortalShareStrings.rotateMessage,
            expected(
                spanish: "Al rotar el enlace, el que ya compartiste dejará de funcionar. ¿Continuamos?",
                english: "Rotating the link will make the one you already shared stop working. Continue?"
            )
        )
        XCTAssertEqual(
            ClientPortalShareStrings.disableMessage,
            expected(
                spanish: "Se va a deshabilitar el enlace para el cliente. ¿Estás seguro?",
                english: "This will disable the client link. Are you sure?"
            )
        )

        XCTAssertEqual(
            ClientPortalShareStrings.shareMessage("https://solennix.com/portal/123"),
            expected(
                spanish: "Hola! Acá podés ver los detalles de tu evento: https://solennix.com/portal/123",
                english: "Hi! Here you can see your event details: https://solennix.com/portal/123"
            )
        )

        XCTAssertEqual(ClientPortalShareStrings.loadError, expected(spanish: "No pudimos cargar el enlace del cliente.", english: "We could not load the client link."))
        XCTAssertEqual(ClientPortalShareStrings.generateError, expected(spanish: "No pudimos generar el enlace. Intenta de nuevo.", english: "We could not generate the link. Try again."))
        XCTAssertEqual(ClientPortalShareStrings.disableError, expected(spanish: "No pudimos deshabilitar el enlace. Intenta de nuevo.", english: "We could not disable the link. Try again."))
    }
}

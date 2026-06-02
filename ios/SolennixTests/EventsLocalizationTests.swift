import XCTest
import Foundation
@testable import SolennixFeatures

final class EventsLocalizationTests: XCTestCase {

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

    func testClientPortalShareStringsResolveForSpanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")
        
        XCTAssertEqual(ClientPortalShareStrings.title, "Portal del cliente")
        XCTAssertEqual(ClientPortalShareStrings.shareSubject, "Portal del cliente — Solennix")
        XCTAssertEqual(ClientPortalShareStrings.description, "Un enlace privado para que tu cliente vea el evento, el estado de pagos y los detalles clave.")
        XCTAssertEqual(ClientPortalShareStrings.loading, "Cargando…")
        XCTAssertEqual(ClientPortalShareStrings.noExpiry, "Este enlace no tiene vencimiento. Podés deshabilitarlo cuando quieras.")
        XCTAssertEqual(ClientPortalShareStrings.copied, "Copiado")
        XCTAssertEqual(ClientPortalShareStrings.copyLink, "Copiar enlace")
        XCTAssertEqual(ClientPortalShareStrings.share, "Compartir")
        XCTAssertEqual(ClientPortalShareStrings.rotateLink, "Rotar enlace")
        XCTAssertEqual(ClientPortalShareStrings.disableLink, "Deshabilitar enlace")
        XCTAssertEqual(ClientPortalShareStrings.disable, "Deshabilitar")
        XCTAssertEqual(ClientPortalShareStrings.cancel, "Cancelar")
        XCTAssertEqual(ClientPortalShareStrings.expiryPrefix, "Vence el")
        XCTAssertEqual(ClientPortalShareStrings.emptyState, "Todavía no generaste un enlace para este evento.")
        XCTAssertEqual(ClientPortalShareStrings.generateLink, "Generar enlace para el cliente")
        XCTAssertEqual(ClientPortalShareStrings.copyToast, "Enlace copiado al portapapeles.")
        XCTAssertEqual(ClientPortalShareStrings.generatedToast, "Enlace generado. Compartilo con tu cliente.")
        XCTAssertEqual(ClientPortalShareStrings.rotatedToast, "Enlace rotado. El anterior ya no funciona.")
        XCTAssertEqual(ClientPortalShareStrings.disabledToast, "Enlace deshabilitado.")
        XCTAssertEqual(ClientPortalShareStrings.rotateMessage, "Al rotar el enlace, el que ya compartiste dejará de funcionar. ¿Continuamos?")
        XCTAssertEqual(ClientPortalShareStrings.disableMessage, "Se va a deshabilitar el enlace para el cliente. ¿Estás seguro?")
        
        XCTAssertEqual(ClientPortalShareStrings.shareMessage("https://solennix.com/portal/123"), "Hola! Acá podés ver los detalles de tu evento: https://solennix.com/portal/123")
        
        XCTAssertEqual(ClientPortalShareStrings.loadError, "No pudimos cargar el enlace del cliente.")
        XCTAssertEqual(ClientPortalShareStrings.generateError, "No pudimos generar el enlace. Intenta de nuevo.")
        XCTAssertEqual(ClientPortalShareStrings.disableError, "No pudimos deshabilitar el enlace. Intenta de nuevo.")
    }

    func testClientPortalShareStringsResolveForEnglish() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")
        
        XCTAssertEqual(ClientPortalShareStrings.title, "Client portal")
        XCTAssertEqual(ClientPortalShareStrings.shareSubject, "Client portal — Solennix")
        XCTAssertEqual(ClientPortalShareStrings.description, "A private link so your client can see the event, payment status, and key details.")
        XCTAssertEqual(ClientPortalShareStrings.loading, "Loading…")
        XCTAssertEqual(ClientPortalShareStrings.noExpiry, "This link does not expire. You can disable it whenever you want.")
        XCTAssertEqual(ClientPortalShareStrings.copied, "Copied")
        XCTAssertEqual(ClientPortalShareStrings.copyLink, "Copy link")
        XCTAssertEqual(ClientPortalShareStrings.share, "Share")
        XCTAssertEqual(ClientPortalShareStrings.rotateLink, "Rotate link")
        XCTAssertEqual(ClientPortalShareStrings.disableLink, "Disable link")
        XCTAssertEqual(ClientPortalShareStrings.disable, "Disable")
        XCTAssertEqual(ClientPortalShareStrings.cancel, "Cancel")
        XCTAssertEqual(ClientPortalShareStrings.expiryPrefix, "Expires on")
        XCTAssertEqual(ClientPortalShareStrings.emptyState, "You have not generated a link for this event yet.")
        XCTAssertEqual(ClientPortalShareStrings.generateLink, "Generate client link")
        XCTAssertEqual(ClientPortalShareStrings.copyToast, "Link copied to clipboard.")
        XCTAssertEqual(ClientPortalShareStrings.generatedToast, "Link generated. Share it with your client.")
        XCTAssertEqual(ClientPortalShareStrings.rotatedToast, "Link rotated. The previous one no longer works.")
        XCTAssertEqual(ClientPortalShareStrings.disabledToast, "Link disabled.")
        XCTAssertEqual(ClientPortalShareStrings.rotateMessage, "Rotating the link will make the one you already shared stop working. Continue?")
        XCTAssertEqual(ClientPortalShareStrings.disableMessage, "This will disable the client link. Are you sure?")
        
        XCTAssertEqual(ClientPortalShareStrings.shareMessage("https://solennix.com/portal/123"), "Hi! Here you can see your event details: https://solennix.com/portal/123")
        
        XCTAssertEqual(ClientPortalShareStrings.loadError, "We could not load the client link.")
        XCTAssertEqual(ClientPortalShareStrings.generateError, "We could not generate the link. Try again.")
        XCTAssertEqual(ClientPortalShareStrings.disableError, "We could not disable the link. Try again.")
    }
}

import Foundation

enum ClientPortalShareStrings {
    private static var isEnglish: Bool { FeatureL10n.languageCode == "en" }

    static var title: String { isEnglish ? "Client portal" : "Portal del cliente" }
    static var shareSubject: String { isEnglish ? "Client portal — Solennix" : "Portal del cliente — Solennix" }
    static var description: String {
        isEnglish
            ? "A private link so your client can see the event, payment status, and key details."
            : "Un enlace privado para que tu cliente vea el evento, el estado de pagos y los detalles clave."
    }
    static var loading: String { isEnglish ? "Loading…" : "Cargando…" }
    static var noExpiry: String {
        isEnglish
            ? "This link does not expire. You can disable it whenever you want."
            : "Este enlace no tiene vencimiento. Podés deshabilitarlo cuando quieras."
    }
    static var copied: String { isEnglish ? "Copied" : "Copiado" }
    static var copyLink: String { isEnglish ? "Copy link" : "Copiar enlace" }
    static var share: String { isEnglish ? "Share" : "Compartir" }
    static var rotateLink: String { isEnglish ? "Rotate link" : "Rotar enlace" }
    static var disableLink: String { isEnglish ? "Disable link" : "Deshabilitar enlace" }
    static var disable: String { isEnglish ? "Disable" : "Deshabilitar" }
    static var cancel: String { isEnglish ? "Cancel" : "Cancelar" }
    static var expiryPrefix: String { isEnglish ? "Expires on" : "Vence el" }
    static var emptyState: String {
        isEnglish
            ? "You have not generated a link for this event yet."
            : "Todavía no generaste un enlace para este evento."
    }
    static var generateLink: String { isEnglish ? "Generate client link" : "Generar enlace para el cliente" }
    static var copyToast: String { isEnglish ? "Link copied to clipboard." : "Enlace copiado al portapapeles." }
    static var generatedToast: String { isEnglish ? "Link generated. Share it with your client." : "Enlace generado. Compartilo con tu cliente." }
    static var rotatedToast: String { isEnglish ? "Link rotated. The previous one no longer works." : "Enlace rotado. El anterior ya no funciona." }
    static var disabledToast: String { isEnglish ? "Link disabled." : "Enlace deshabilitado." }
    static var rotateMessage: String {
        isEnglish
            ? "Rotating the link will make the one you already shared stop working. Continue?"
            : "Al rotar el enlace, el que ya compartiste dejará de funcionar. ¿Continuamos?"
    }
    static var disableMessage: String {
        isEnglish
            ? "This will disable the client link. Are you sure?"
            : "Se va a deshabilitar el enlace para el cliente. ¿Estás seguro?"
    }
    static func shareMessage(_ url: String) -> String {
        isEnglish ? "Hi! Here you can see your event details: \(url)" : "Hola! Acá podés ver los detalles de tu evento: \(url)"
    }
    static var loadError: String { isEnglish ? "We could not load the client link." : "No pudimos cargar el enlace del cliente." }
    static var generateError: String { isEnglish ? "We could not generate the link. Try again." : "No pudimos generar el enlace. Intenta de nuevo." }
    static var disableError: String { isEnglish ? "We could not disable the link. Try again." : "No pudimos deshabilitar el enlace. Intenta de nuevo." }
}

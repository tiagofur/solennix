import Foundation

enum ClientPortalShareStrings {
    static var title: String { FeatureL10n.text("events.share.title", "Portal del cliente") }
    static var shareSubject: String { FeatureL10n.text("events.share.share_subject", "Portal del cliente — Solennix") }
    static var description: String {
        FeatureL10n.text("events.share.description", "Un enlace privado para que tu cliente vea el evento, el estado de pagos y los detalles clave.")
    }
    static var loading: String { FeatureL10n.text("events.share.loading", "Cargando…") }
    static var noExpiry: String {
        FeatureL10n.text("events.share.no_expiry", "Este enlace no tiene vencimiento. Podés deshabilitarlo cuando quieras.")
    }
    static var copied: String { FeatureL10n.text("events.share.copied", "Copiado") }
    static var copyLink: String { FeatureL10n.text("events.share.copy_link", "Copiar enlace") }
    static var share: String { FeatureL10n.text("events.share.share", "Compartir") }
    static var rotateLink: String { FeatureL10n.text("events.share.rotate_link", "Rotar enlace") }
    static var disableLink: String { FeatureL10n.text("events.share.disable_link", "Deshabilitar enlace") }
    static var disable: String { FeatureL10n.text("events.share.disable", "Deshabilitar") }
    static var cancel: String { FeatureL10n.text("events.share.cancel", "Cancelar") }
    static var expiryPrefix: String { FeatureL10n.text("events.share.expiry_prefix", "Vence el") }
    static var emptyState: String {
        FeatureL10n.text("events.share.empty_state", "Todavía no generaste un enlace para este evento.")
    }
    static var generateLink: String { FeatureL10n.text("events.share.generate_link", "Generar enlace para el cliente") }
    static var copyToast: String { FeatureL10n.text("events.share.copy_toast", "Enlace copiado al portapapeles.") }
    static var generatedToast: String { FeatureL10n.text("events.share.generated_toast", "Enlace generado. Compartilo con tu cliente.") }
    static var rotatedToast: String { FeatureL10n.text("events.share.rotated_toast", "Enlace rotado. El anterior ya no funciona.") }
    static var disabledToast: String { FeatureL10n.text("events.share.disabled_toast", "Enlace deshabilitado.") }
    static var rotateMessage: String {
        FeatureL10n.text("events.share.rotate_message", "Al rotar el enlace, el que ya compartiste dejará de funcionar. ¿Continuamos?")
    }
    static var disableMessage: String {
        FeatureL10n.text("events.share.disable_message", "Se va a deshabilitar el enlace para el cliente. ¿Estás seguro?")
    }
    static func shareMessage(_ url: String) -> String {
        FeatureL10n.format("events.share.share_message", "Hola! Acá podés ver los detalles de tu evento: %@", url)
    }
    static var loadError: String { FeatureL10n.text("events.share.load_error", "No pudimos cargar el enlace del cliente.") }
    static var generateError: String { FeatureL10n.text("events.share.generate_error", "No pudimos generar el enlace. Intenta de nuevo.") }
    static var disableError: String { FeatureL10n.text("events.share.disable_error", "No pudimos deshabilitar el enlace. Intenta de nuevo.") }
}


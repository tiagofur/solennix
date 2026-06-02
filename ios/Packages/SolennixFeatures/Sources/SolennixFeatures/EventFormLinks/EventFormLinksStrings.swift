import Foundation

enum EventFormLinksStrings {
    static var title: String { FeatureL10n.text("event_form_links.title", "Links de Formulario") }
    static var generateLinkAccessibility: String { FeatureL10n.text("event_form_links.accessibility.generate", "Generar link") }
    static var deleteConfirmTitle: String { FeatureL10n.text("event_form_links.delete.confirm_title", "Eliminar link") }
    static var deleteConfirmButton: String { FeatureL10n.text("event_form_links.delete.confirm_button", "Eliminar") }
    static var cancel: String { FeatureL10n.text("event_form_links.shared.cancel", "Cancelar") }
    static var linkDeletedToast: String { FeatureL10n.text("event_form_links.toast.deleted", "Link eliminado") }
    static var errorLoading: String { FeatureL10n.text("event_form_links.error.loading", "Error al cargar") }
    static var retry: String { FeatureL10n.text("event_form_links.shared.retry", "Reintentar") }
    static var emptyTitle: String { FeatureL10n.text("event_form_links.empty.title", "Sin formularios") }
    static var emptyMessage: String { FeatureL10n.text("event_form_links.empty.message", "Genera un formulario para que tus clientes compartan la información del evento.") }
    static var emptyAction: String { FeatureL10n.text("event_form_links.empty.action", "Generar formulario") }
    static var swipeDelete: String { FeatureL10n.text("event_form_links.swipe.delete", "Eliminar") }
    static var swipeCopy: String { FeatureL10n.text("event_form_links.swipe.copy", "Copiar") }
    static var swipeShare: String { FeatureL10n.text("event_form_links.swipe.share", "Compartir") }
    static var contextMenuCopy: String { FeatureL10n.text("event_form_links.context.copy", "Copiar Link") }
    static var contextMenuViewEvent: String { FeatureL10n.text("event_form_links.context.view_event", "Ver Evento") }
    static var labelPlaceholder: String { FeatureL10n.text("event_form_links.label.placeholder", "Sin etiqueta") }
    static var completedForm: String { FeatureL10n.text("event_form_links.status.completed", "Formulario completado") }
    
    // Status
    static var statusActive: String { FeatureL10n.text("event_form_links.status.active", "Activo") }
    static var statusUsed: String { FeatureL10n.text("event_form_links.status.used", "Usado") }
    static var statusExpired: String { FeatureL10n.text("event_form_links.status.expired", "Expirado") }
    
    // Generation Sheet
    static var sheetLabelSection: String { FeatureL10n.text("event_form_links.sheet.label_section", "Etiqueta (opcional)") }
    static var sheetLabelPlaceholder: String { FeatureL10n.text("event_form_links.sheet.label_placeholder", "Ej: Boda Rodriguez, Evento Mayo") }
    static var sheetTtlSection: String { FeatureL10n.text("event_form_links.sheet.ttl_section", "Vigencia del link") }
    static var sheetTtlLabel: String { FeatureL10n.text("event_form_links.sheet.ttl_label", "Dias de vigencia") }
    static var sheetHint: String { FeatureL10n.text("event_form_links.sheet.hint", "El cliente podra llenar sus datos de evento a traves de este link. Una vez usado, no podra volver a utilizarse.") }
    static var sheetTitle: String { FeatureL10n.text("event_form_links.sheet.title", "Generar Link") }
    static var sheetGenerateButton: String { FeatureL10n.text("event_form_links.sheet.generate_button", "Generar") }
    
    // Toast
    static var linkCopiedToast: String { FeatureL10n.text("event_form_links.toast.copied", "Link copiado") }
    
    // Errors
    static var errorUnexpected: String { FeatureL10n.text("event_form_links.error.unexpected", "Ocurrió un error inesperado.") }
    static var errorUnexpectedRetry: String { FeatureL10n.text("event_form_links.error.unexpected_retry", "Ocurrió un error inesperado. Intenta de nuevo.") }

    // Formatted
    static func deleteConfirmMessage(label: String) -> String {
        FeatureL10n.format("event_form_links.delete.confirm_message", "Se eliminara el link \"%@\". Esta accion no se puede deshacer.", label)
    }
    
    static func expiresLabel(date: String) -> String {
        FeatureL10n.format("event_form_links.status.expires_label", "Expira: %@", date)
    }
    
    static func ttlDaysLabel(_ count: Int) -> String {
        if count == 1 {
            return FeatureL10n.text("event_form_links.sheet.ttl_day_single", "1 dia")
        } else {
            return FeatureL10n.format("event_form_links.sheet.ttl_days_plural", "%lld dias", count)
        }
    }
}

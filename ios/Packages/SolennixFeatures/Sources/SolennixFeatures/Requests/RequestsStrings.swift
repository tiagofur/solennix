import Foundation
import SolennixCore

/// Localized copy for the organizer public-request inbox (#1122).
/// Defaults are Spanish (app defaultLocalization); wire via FeatureL10n.
enum RequestsStrings {
    static var title: String { FeatureL10n.text("requests.title", "Solicitudes") }
    static var moreMenuSubtitle: String {
        FeatureL10n.text("requests.more_menu.subtitle", "Cotizaciones de visitantes")
    }

    static var emptyTitle: String { FeatureL10n.text("requests.empty.title", "Sin solicitudes") }
    static var emptyMessage: String {
        FeatureL10n.text(
            "requests.empty.message",
            "Cuando un visitante pida cotizacion desde tu perfil publico, la veras aca."
        )
    }

    static var errorLoadingTitle: String { FeatureL10n.text("requests.error.loading_title", "No se pudo cargar") }
    static var actionRetry: String { FeatureL10n.text("requests.action.retry", "Reintentar") }
    static var errorTitle: String { FeatureL10n.text("requests.error.title", "Error") }
    static var errorOk: String { FeatureL10n.text("requests.error.ok", "OK") }

    static var filterAll: String { FeatureL10n.text("requests.filter.all", "Todas") }
    static var filterPending: String { FeatureL10n.text("requests.filter.pending", "Pendientes") }
    static var filterResponded: String { FeatureL10n.text("requests.filter.responded", "Respondidas") }
    static var filterBooked: String { FeatureL10n.text("requests.filter.booked", "Reservadas") }

    static var statusPending: String { FeatureL10n.text("requests.status.pending", "Pendiente") }
    static var statusInfoRequested: String { FeatureL10n.text("requests.status.info_requested", "Info pedida") }
    static var statusResponded: String { FeatureL10n.text("requests.status.responded", "Respondida") }
    static var statusAccepted: String { FeatureL10n.text("requests.status.accepted", "Aceptada") }
    static var statusDeclinedProvider: String { FeatureL10n.text("requests.status.declined_provider", "Rechazada") }
    static var statusDeclinedClient: String { FeatureL10n.text("requests.status.declined_client", "Rechazada por cliente") }
    static var statusBooked: String { FeatureL10n.text("requests.status.booked", "Reservada") }
    static var statusExpired: String { FeatureL10n.text("requests.status.expired", "Expirada") }

    static var detailTitle: String { FeatureL10n.text("requests.detail.title", "Solicitud") }
    static var sectionContact: String { FeatureL10n.text("requests.detail.contact", "Contacto") }
    static var sectionEvent: String { FeatureL10n.text("requests.detail.event", "Evento") }
    static var sectionServices: String { FeatureL10n.text("requests.detail.services", "Servicios") }
    static var sectionMessage: String { FeatureL10n.text("requests.detail.message", "Mensaje") }
    static var sectionResponses: String { FeatureL10n.text("requests.detail.responses", "Cotizaciones enviadas") }
    static var sectionActions: String { FeatureL10n.text("requests.detail.actions", "Acciones") }

    static var fieldEmail: String { FeatureL10n.text("requests.field.email", "Email") }
    static var fieldName: String { FeatureL10n.text("requests.field.name", "Name") }
    static var fieldType: String { FeatureL10n.text("requests.field.type", "Type") }
    static var fieldDate: String { FeatureL10n.text("requests.field.date", "Date") }
    static var fieldLocation: String { FeatureL10n.text("requests.field.location", "Location") }
    static var fieldGuests: String { FeatureL10n.text("requests.field.guests", "Guests") }
    static var fieldBudget: String { FeatureL10n.text("requests.field.budget", "Budget") }
    static var fieldStatus: String { FeatureL10n.text("requests.field.status", "Status") }

    static var actionRespond: String { FeatureL10n.text("requests.action.respond", "Responder") }
    static var actionRequestInfo: String { FeatureL10n.text("requests.action.request_info", "Pedir info") }
    static var actionDecline: String { FeatureL10n.text("requests.action.decline", "Declinar") }
    static var actionConvert: String { FeatureL10n.text("requests.action.convert", "Convertir a evento") }
    static var actionClose: String { FeatureL10n.text("requests.action.close", "Cerrar") }
    static var actionSend: String { FeatureL10n.text("requests.action.send", "Enviar") }
    static var actionCancel: String { FeatureL10n.text("requests.action.cancel", "Cancelar") }

    static var respondTitle: String { FeatureL10n.text("requests.respond.title", "Enviar cotizacion") }
    static var respondAmount: String { FeatureL10n.text("requests.respond.amount", "Monto") }
    static var respondCurrency: String { FeatureL10n.text("requests.respond.currency", "Moneda") }
    static var respondValidUntil: String { FeatureL10n.text("requests.respond.valid_until", "Valida hasta") }
    static var respondInclusions: String { FeatureL10n.text("requests.respond.inclusions", "Incluye (una por linea)") }
    static var respondMessage: String { FeatureL10n.text("requests.respond.message", "Mensaje (opcional)") }
    static var declineTitle: String { FeatureL10n.text("requests.decline.title", "Declinar solicitud") }
    static var declineReason: String { FeatureL10n.text("requests.decline.reason", "Motivo (opcional)") }
    static var viewEvent: String { FeatureL10n.text("requests.action.view_event", "Ver evento") }

    static var toastResponded: String { FeatureL10n.text("requests.toast.responded", "Cotizacion enviada") }
    static var toastDeclined: String { FeatureL10n.text("requests.toast.declined", "Solicitud declinada") }
    static var toastInfoRequested: String { FeatureL10n.text("requests.toast.info_requested", "Se pidio mas informacion") }
    static var toastConverted: String { FeatureL10n.text("requests.toast.converted", "Evento creado") }

    static var unreadBadgeA11y: String { FeatureL10n.text("requests.a11y.unread", "No leida") }
    static var noEventType: String { FeatureL10n.text("requests.fallback.event_type", "Evento") }
    static var noLocation: String { FeatureL10n.text("requests.fallback.location", "Sin ubicacion") }

    static var decodingError: String { FeatureL10n.text("requests.error.decoding", "Error procesando respuesta") }
    static var unauthorizedError: String { FeatureL10n.text("requests.error.unauthorized", "Sesion expirada") }
    static var unknownError: String { FeatureL10n.text("requests.error.unknown", "Error desconocido") }

    static func statusLabel(_ status: PublicRequestStatus) -> String {
        switch status {
        case .pending: return statusPending
        case .infoRequested: return statusInfoRequested
        case .responded: return statusResponded
        case .acceptedByClient: return statusAccepted
        case .declinedProvider: return statusDeclinedProvider
        case .declinedClient: return statusDeclinedClient
        case .booked: return statusBooked
        case .expired: return statusExpired
        }
    }

    // MARK: - Share links (Compartir link)

    static var tabInbox: String { FeatureL10n.text("requests.tab.inbox", "Bandeja") }
    static var tabLinks: String { FeatureL10n.text("requests.tab.links", "Links") }

    static var linksTitle: String { FeatureL10n.text("requests.links.title", "Compartir link") }
    static var linkGenerateAccessibility: String {
        FeatureL10n.text("requests.links.accessibility.generate", "Generar link")
    }
    static var linkDeleteConfirmTitle: String {
        FeatureL10n.text("requests.links.delete.confirm_title", "Eliminar link")
    }
    static var linkDeleteConfirmButton: String {
        FeatureL10n.text("requests.links.delete.confirm_button", "Eliminar")
    }
    static var linkDeletedToast: String {
        FeatureL10n.text("requests.links.toast.deleted", "Link eliminado")
    }
    static var linkErrorLoading: String {
        FeatureL10n.text("requests.links.error.loading", "Error al cargar")
    }
    static var linkEmptyTitle: String {
        FeatureL10n.text("requests.links.empty.title", "Sin links")
    }
    static var linkEmptyMessage: String {
        FeatureL10n.text(
            "requests.links.empty.message",
            "Genera un link para que tus clientes envien una solicitud de evento."
        )
    }
    static var linkEmptyAction: String {
        FeatureL10n.text("requests.links.empty.action", "Generar link")
    }
    static var linkSwipeDelete: String { FeatureL10n.text("requests.links.swipe.delete", "Eliminar") }
    static var linkSwipeCopy: String { FeatureL10n.text("requests.links.swipe.copy", "Copiar") }
    static var linkSwipeShare: String { FeatureL10n.text("requests.links.swipe.share", "Compartir") }
    static var linkContextCopy: String {
        FeatureL10n.text("requests.links.context.copy", "Copiar Link")
    }
    static var linkLabelPlaceholder: String {
        FeatureL10n.text("requests.links.label.placeholder", "Sin etiqueta")
    }

    static var linkStatusActive: String { FeatureL10n.text("requests.links.status.active", "Activo") }
    static var linkStatusUsed: String { FeatureL10n.text("requests.links.status.used", "Usado") }
    static var linkStatusExpired: String { FeatureL10n.text("requests.links.status.expired", "Expirado") }
    static var linkStatusRevoked: String {
        FeatureL10n.text("requests.links.status.revoked", "Revocado")
    }

    static var linkModeStandard: String {
        FeatureL10n.text("requests.links.mode.standard", "Solo solicitud")
    }
    static var linkModeAutoQuote: String {
        FeatureL10n.text("requests.links.mode.auto_quote", "Auto cotizacion")
    }
    static var linkModeAutoEvent: String {
        FeatureL10n.text("requests.links.mode.auto_event", "Auto evento")
    }

    static var linkSheetLabelSection: String {
        FeatureL10n.text("requests.links.sheet.label_section", "Etiqueta (opcional)")
    }
    static var linkSheetLabelPlaceholder: String {
        FeatureL10n.text(
            "requests.links.sheet.label_placeholder",
            "Ej: Boda Rodriguez, Evento Mayo"
        )
    }
    static var linkSheetTtlSection: String {
        FeatureL10n.text("requests.links.sheet.ttl_section", "Vigencia del link")
    }
    static var linkSheetTtlLabel: String {
        FeatureL10n.text("requests.links.sheet.ttl_label", "Dias de vigencia")
    }
    static var linkSheetMaxUsesSection: String {
        FeatureL10n.text("requests.links.sheet.max_uses_section", "Usos maximos")
    }
    static var linkSheetMaxUsesPlaceholder: String {
        FeatureL10n.text("requests.links.sheet.max_uses_placeholder", "Vacio = ilimitado")
    }
    static var linkSheetMaxUsesHint: String {
        FeatureL10n.text(
            "requests.links.sheet.max_uses_hint",
            "Deja vacio para usos ilimitados hasta que expire."
        )
    }
    static var linkSheetModeSection: String {
        FeatureL10n.text("requests.links.sheet.mode_section", "Al enviar")
    }
    static var linkSheetModeLabel: String {
        FeatureL10n.text("requests.links.sheet.mode_label", "Modo de envio")
    }
    static var linkSheetHint: String {
        FeatureL10n.text(
            "requests.links.sheet.hint",
            "El cliente completa el formulario en el link. Por defecto se crea el evento automaticamente."
        )
    }
    static var linkSheetTitle: String {
        FeatureL10n.text("requests.links.sheet.title", "Generar Link")
    }
    static var linkSheetGenerateButton: String {
        FeatureL10n.text("requests.links.sheet.generate_button", "Generar")
    }

    static var linkCopiedToast: String {
        FeatureL10n.text("requests.links.toast.copied", "Link copiado")
    }
    static var linkErrorUnexpected: String {
        FeatureL10n.text("requests.links.error.unexpected", "Ocurrio un error inesperado.")
    }
    static var linkErrorUnexpectedRetry: String {
        FeatureL10n.text(
            "requests.links.error.unexpected_retry",
            "Ocurrio un error inesperado. Intenta de nuevo."
        )
    }

    static func linkDeleteConfirmMessage(label: String) -> String {
        FeatureL10n.format(
            "requests.links.delete.confirm_message",
            "Se eliminara el link \"%@\". Esta accion no se puede deshacer.",
            label
        )
    }

    static func linkExpiresLabel(date: String) -> String {
        FeatureL10n.format("requests.links.status.expires_label", "Expira: %@", date)
    }

    static func linkUsesLabel(used: Int, max: Int) -> String {
        FeatureL10n.format("requests.links.status.uses_label", "Usos: %lld / %lld", used, max)
    }

    static func linkTtlDaysLabel(_ count: Int) -> String {
        if count == 1 {
            return FeatureL10n.text("requests.links.sheet.ttl_day_single", "1 dia")
        }
        return FeatureL10n.plural("requests.links.sheet.ttl_days_plural", "%lld dias", count: count)
    }
}

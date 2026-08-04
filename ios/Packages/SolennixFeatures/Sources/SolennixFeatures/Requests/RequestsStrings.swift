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
}

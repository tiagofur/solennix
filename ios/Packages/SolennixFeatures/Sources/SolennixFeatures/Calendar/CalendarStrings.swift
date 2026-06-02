import Foundation

// MARK: - Calendar Strings

enum CalendarStrings {
    // MARK: - General Actions

    static var actionCancel: String { FeatureL10n.text("calendar.action.cancel", "Cancelar") }
    static var actionRetry: String { FeatureL10n.text("calendar.action.retry", "Reintentar") }
    static var actionDelete: String { FeatureL10n.text("calendar.action.delete", "Eliminar") }

    // MARK: - Header & Actions

    static var title: String { FeatureL10n.text("calendar.title", "Calendario") }
    static var today: String { FeatureL10n.text("calendar.today", "Hoy") }
    static var newEvent: String { FeatureL10n.text("calendar.new_event", "Nuevo Evento") }
    static var quickQuote: String { FeatureL10n.text("calendar.quick_quote", "Cotización Rápida") }
    static var createEventAction: String { FeatureL10n.text("calendar.create_event_action", "Crear evento o cotización") }
    static var manageBlocks: String { FeatureL10n.text("calendar.manage_blocks", "Bloquear fechas") }
    static var exportICal: String { FeatureL10n.text("calendar.export_ical", "Exportar calendario") }
    static var selectDayPrompt: String { FeatureL10n.text("calendar.select_day_prompt", "Seleccioná un día para ver sus eventos") }
    static var previousMonth: String { FeatureL10n.text("calendar.previous_month", "Mes anterior") }
    static var nextMonth: String { FeatureL10n.text("calendar.next_month", "Mes siguiente") }
    static var noEventsForDay: String { FeatureL10n.text("calendar.no_events_for_day", "No hay eventos para este día") }
    static var allDay: String { FeatureL10n.text("calendar.all_day", "Todo el día") }
    static var unknownClient: String { FeatureL10n.text("calendar.unknown_client", "Cliente") }

    // MARK: - Filters

    static var filterAll: String { FeatureL10n.text("calendar.filter.all", "Todos") }
    static var filterQuoted: String { FeatureL10n.text("calendar.filter.quoted", "Cotizados") }
    static var filterConfirmed: String { FeatureL10n.text("calendar.filter.confirmed", "Confirmados") }
    static var filterCompleted: String { FeatureL10n.text("calendar.filter.completed", "Completados") }
    static var filterCancelled: String { FeatureL10n.text("calendar.filter.cancelled", "Cancelados") }

    // MARK: - Status Label Lookups

    static var statusQuoted: String { FeatureL10n.text("calendar.status.quoted", "Cotizado") }
    static var statusConfirmed: String { FeatureL10n.text("calendar.status.confirmed", "Confirmado") }
    static var statusCompleted: String { FeatureL10n.text("calendar.status.completed", "Completado") }
    static var statusCancelled: String { FeatureL10n.text("calendar.status.cancelled", "Cancelado") }

    // MARK: - Error Alerts

    static var errorLoadFailed: String { FeatureL10n.text("calendar.error.load_failed", "No se pudieron cargar los eventos") }
    static var errorBlockFailed: String { FeatureL10n.text("calendar.error.block_failed", "No se pudo bloquear la fecha") }
    static var errorUnblockFailed: String { FeatureL10n.text("calendar.error.unblock_failed", "No se pudo desbloquear") }

    // MARK: - Unblock Confirmation

    static var unblockTitle: String { FeatureL10n.text("calendar.unblock.title", "Desbloquear fecha") }
    static var unblockConfirm: String { FeatureL10n.text("calendar.unblock.confirm", "Desbloquear") }
    static var unblockMessage: String { FeatureL10n.text("calendar.unblock_message", "Esta acción habilitará la fecha nuevamente.") }

    static func unblockMessageReason(_ reason: String) -> String {
        FeatureL10n.format("calendar.unblock_message_reason", "Motivo: %@\n\nEsta acción habilitará la fecha nuevamente.", reason)
    }

    // MARK: - Blocked Dates List View

    static var blockedDatesTitle: String { FeatureL10n.text("calendar.blocked_dates_title", "Fechas No Disponibles") }
    static var blockedDatesEmpty: String { FeatureL10n.text("calendar.blocked_dates_empty", "No hay fechas bloqueadas") }
    static var blockedDatesEmptySubtitle: String { FeatureL10n.text("calendar.blocked_dates_empty_subtitle", "Todas las fechas están disponibles") }

    // MARK: - Block Date Form Sheet

    static var blockTitle: String { FeatureL10n.text("calendar.block.title", "Bloquear fecha") }
    static var blockSave: String { FeatureL10n.text("calendar.block.save", "Bloquear") }
    static var blockStartDate: String { FeatureL10n.text("calendar.block.start_date", "Desde") }
    static var blockEndDate: String { FeatureL10n.text("calendar.block.end_date", "Hasta") }
    static var blockReasonLabel: String { FeatureL10n.text("calendar.block.reason_label", "Motivo (opcional)") }
    static var blockReasonPlaceholderRange: String { FeatureL10n.text("calendar.block.reason_placeholder_range", "Ej: Vacaciones, mantenimiento…") }
    static var blockAddRange: String { FeatureL10n.text("calendar.block.add_range", "Agregar rango") }
    static var blockRangeTitle: String { FeatureL10n.text("calendar.block.range_title", "Bloquear rango de fechas") }

    // MARK: - Dynamic Formats

    static func overflowMore(_ count: Int) -> String {
        FeatureL10n.format("calendar.overflow_more", "+%lld más", count)
    }

    static var a11yDayBlocked: String { FeatureL10n.text("calendar.a11y.day_blocked", "Día bloqueado") }
    static var a11yDayNoEvents: String { FeatureL10n.text("calendar.a11y.day_no_events", "Sin eventos") }

    static func a11yDayWithEvents(_ count: Int) -> String {
        FeatureL10n.format("calendar.a11y.day_with_events", "%lld eventos", count)
    }
}

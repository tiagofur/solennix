import Foundation

// MARK: - Calendar Strings

enum CalendarStrings {
    // MARK: - General Actions

    static var actionCancel: String { FeatureL10n.text("calendar.action.cancel", "Cancelar") }
    static var actionDelete: String { FeatureL10n.text("calendar.action.delete", "Eliminar") }

    // MARK: - Status Label Lookups (used by CalendarGridView)

    static var statusQuoted: String { FeatureL10n.text("calendar.status.quoted", "Cotizado") }
    static var statusConfirmed: String { FeatureL10n.text("calendar.status.confirmed", "Confirmado") }
    static var statusCompleted: String { FeatureL10n.text("calendar.status.completed", "Completado") }
    static var statusCancelled: String { FeatureL10n.text("calendar.status.cancelled", "Cancelado") }

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

    // MARK: - Dynamic Formats (used by CalendarGridView)

    static func overflowMore(_ count: Int) -> String {
        FeatureL10n.plural("calendar.overflow_more", "+%lld más", count: count)
    }

    static var a11yDayBlocked: String { FeatureL10n.text("calendar.a11y.day_blocked", "Día bloqueado") }
    static var a11yDayNoEvents: String { FeatureL10n.text("calendar.a11y.day_no_events", "Sin eventos") }

    static func a11yDayWithEvents(_ count: Int) -> String {
        FeatureL10n.plural("calendar.a11y.day_with_events", "%lld eventos", count: count)
    }
}

import XCTest
import Foundation
import SolennixNetwork
@testable import SolennixFeatures

final class CalendarLocalizationTests: XCTestCase {

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

    func testCalendarStringsResolveForSpanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")

        // General Actions
        XCTAssertEqual(CalendarStrings.actionCancel, "Cancelar")
        XCTAssertEqual(CalendarStrings.actionRetry, "Reintentar")
        XCTAssertEqual(CalendarStrings.actionDelete, "Eliminar")

        // Header & Actions
        XCTAssertEqual(CalendarStrings.title, "Calendario")
        XCTAssertEqual(CalendarStrings.today, "Hoy")
        XCTAssertEqual(CalendarStrings.newEvent, "Nuevo Evento")
        XCTAssertEqual(CalendarStrings.quickQuote, "Cotización Rápida")
        XCTAssertEqual(CalendarStrings.createEventAction, "Crear evento o cotización")
        XCTAssertEqual(CalendarStrings.manageBlocks, "Bloquear fechas")
        XCTAssertEqual(CalendarStrings.exportICal, "Exportar calendario")
        XCTAssertEqual(CalendarStrings.selectDayPrompt, "Seleccioná un día para ver sus eventos")
        XCTAssertEqual(CalendarStrings.previousMonth, "Mes anterior")
        XCTAssertEqual(CalendarStrings.nextMonth, "Mes siguiente")
        XCTAssertEqual(CalendarStrings.noEventsForDay, "No hay eventos para este día")
        XCTAssertEqual(CalendarStrings.allDay, "Todo el día")

        // Filters
        XCTAssertEqual(CalendarStrings.filterAll, "Todos")
        XCTAssertEqual(CalendarStrings.filterQuoted, "Cotizados")
        XCTAssertEqual(CalendarStrings.filterConfirmed, "Confirmados")
        XCTAssertEqual(CalendarStrings.filterCompleted, "Completados")
        XCTAssertEqual(CalendarStrings.filterCancelled, "Cancelados")

        // Status Label Lookups
        XCTAssertEqual(CalendarStrings.statusQuoted, "Cotizado")
        XCTAssertEqual(CalendarStrings.statusConfirmed, "Confirmado")
        XCTAssertEqual(CalendarStrings.statusCompleted, "Completado")
        XCTAssertEqual(CalendarStrings.statusCancelled, "Cancelado")

        // Error Alerts
        XCTAssertEqual(CalendarStrings.errorLoadFailed, "No se pudieron cargar los eventos")
        XCTAssertEqual(CalendarStrings.errorBlockFailed, "No se pudo bloquear la fecha")
        XCTAssertEqual(CalendarStrings.errorUnblockFailed, "No se pudo desbloquear")

        // Unblock Confirmation
        XCTAssertEqual(CalendarStrings.unblockTitle, "Desbloquear fecha")
        XCTAssertEqual(CalendarStrings.unblockConfirm, "Desbloquear")
        XCTAssertEqual(CalendarStrings.unblockMessage, "Esta acción habilitará la fecha nuevamente.")
        XCTAssertEqual(CalendarStrings.unblockMessageReason("Vacaciones"), "Motivo: Vacaciones\n\nEsta acción habilitará la fecha nuevamente.")

        // Blocked Dates List View
        XCTAssertEqual(CalendarStrings.blockedDatesTitle, "Fechas No Disponibles")
        XCTAssertEqual(CalendarStrings.blockedDatesEmpty, "No hay fechas bloqueadas")
        XCTAssertEqual(CalendarStrings.blockedDatesEmptySubtitle, "Todas las fechas están disponibles")

        // Block Date Form Sheet
        XCTAssertEqual(CalendarStrings.blockTitle, "Bloquear fecha")
        XCTAssertEqual(CalendarStrings.blockSave, "Bloquear")
        XCTAssertEqual(CalendarStrings.blockStartDate, "Desde")
        XCTAssertEqual(CalendarStrings.blockEndDate, "Hasta")
        XCTAssertEqual(CalendarStrings.blockReasonLabel, "Motivo (opcional)")
        XCTAssertEqual(CalendarStrings.blockReasonPlaceholderRange, "Ej: Vacaciones, mantenimiento…")
        XCTAssertEqual(CalendarStrings.blockAddRange, "Agregar rango")
        XCTAssertEqual(CalendarStrings.blockRangeTitle, "Bloquear rango de fechas")

        // Dynamic Formats
        XCTAssertEqual(CalendarStrings.overflowMore(5), "+5 más")
        XCTAssertEqual(CalendarStrings.a11yDayBlocked, "Día bloqueado")
        XCTAssertEqual(CalendarStrings.a11yDayNoEvents, "Sin eventos")
        XCTAssertEqual(CalendarStrings.a11yDayWithEvents(3), "3 eventos")
    }

    func testCalendarStringsResolveForEnglish() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")

        // General Actions
        XCTAssertEqual(CalendarStrings.actionCancel, "Cancel")
        XCTAssertEqual(CalendarStrings.actionRetry, "Retry")
        XCTAssertEqual(CalendarStrings.actionDelete, "Delete")

        // Header & Actions
        XCTAssertEqual(CalendarStrings.title, "Calendar")
        XCTAssertEqual(CalendarStrings.today, "Today")
        XCTAssertEqual(CalendarStrings.newEvent, "New Event")
        XCTAssertEqual(CalendarStrings.quickQuote, "Quick Quote")
        XCTAssertEqual(CalendarStrings.createEventAction, "Create event or quote")
        XCTAssertEqual(CalendarStrings.manageBlocks, "Block dates")
        XCTAssertEqual(CalendarStrings.exportICal, "Export calendar")
        XCTAssertEqual(CalendarStrings.selectDayPrompt, "Select a day to see its events")
        XCTAssertEqual(CalendarStrings.previousMonth, "Previous month")
        XCTAssertEqual(CalendarStrings.nextMonth, "Next month")
        XCTAssertEqual(CalendarStrings.noEventsForDay, "No events on this day")
        XCTAssertEqual(CalendarStrings.allDay, "All day")

        // Filters
        XCTAssertEqual(CalendarStrings.filterAll, "All")
        XCTAssertEqual(CalendarStrings.filterQuoted, "Quoted")
        XCTAssertEqual(CalendarStrings.filterConfirmed, "Confirmed")
        XCTAssertEqual(CalendarStrings.filterCompleted, "Completed")
        XCTAssertEqual(CalendarStrings.filterCancelled, "Cancelled")

        // Status Label Lookups
        XCTAssertEqual(CalendarStrings.statusQuoted, "Quoted")
        XCTAssertEqual(CalendarStrings.statusConfirmed, "Confirmed")
        XCTAssertEqual(CalendarStrings.statusCompleted, "Completed")
        XCTAssertEqual(CalendarStrings.statusCancelled, "Cancelled")

        // Error Alerts
        XCTAssertEqual(CalendarStrings.errorLoadFailed, "Failed to load events")
        XCTAssertEqual(CalendarStrings.errorBlockFailed, "Failed to block date")
        XCTAssertEqual(CalendarStrings.errorUnblockFailed, "Failed to unblock date")

        // Unblock Confirmation
        XCTAssertEqual(CalendarStrings.unblockTitle, "Unblock date")
        XCTAssertEqual(CalendarStrings.unblockConfirm, "Unblock")
        XCTAssertEqual(CalendarStrings.unblockMessage, "This will make the date available again.")
        XCTAssertEqual(CalendarStrings.unblockMessageReason("Vacation"), "Reason: Vacation\n\nThis will make the date available again.")

        // Blocked Dates List View
        XCTAssertEqual(CalendarStrings.blockedDatesTitle, "Unavailable Dates")
        XCTAssertEqual(CalendarStrings.blockedDatesEmpty, "No blocked dates")
        XCTAssertEqual(CalendarStrings.blockedDatesEmptySubtitle, "All dates are available")

        // Block Date Form Sheet
        XCTAssertEqual(CalendarStrings.blockTitle, "Block date")
        XCTAssertEqual(CalendarStrings.blockSave, "Block")
        XCTAssertEqual(CalendarStrings.blockStartDate, "From")
        XCTAssertEqual(CalendarStrings.blockEndDate, "To")
        XCTAssertEqual(CalendarStrings.blockReasonLabel, "Reason (optional)")
        XCTAssertEqual(CalendarStrings.blockReasonPlaceholderRange, "E.g. Vacation, maintenance…")
        XCTAssertEqual(CalendarStrings.blockAddRange, "Add range")
        XCTAssertEqual(CalendarStrings.blockRangeTitle, "Block date range")

        // Dynamic Formats
        XCTAssertEqual(CalendarStrings.overflowMore(5), "+5 more")
        XCTAssertEqual(CalendarStrings.a11yDayBlocked, "Day blocked")
        XCTAssertEqual(CalendarStrings.a11yDayNoEvents, "No events")
        XCTAssertEqual(CalendarStrings.a11yDayWithEvents(3), "3 events")
    }

    // MARK: - Month and Selected Date Dynamic Formatters Tests

    func testMonthAndSelectedDateFormatter_Spanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")

        let client = APIClient(baseURL: URL(string: "https://example.com")!)
        let vm = CalendarViewModel(apiClient: client)

        // Define a specific date to test: March 15, 2026
        var components = DateComponents()
        components.year = 2026
        components.month = 3
        components.day = 15
        let date = Calendar.current.date(from: components)!

        // Set current month of viewModel
        vm.currentMonth = date
        vm.selectedDate = date

        // Under es-MX: Month title should capitalize only the first letter "Marzo de 2026"
        XCTAssertEqual(vm.monthTitle, "Marzo de 2026")

        // Formatted selected date
        let formattedSelected = vm.formattedSelectedDate()
        XCTAssertTrue(formattedSelected.contains("marzo") || formattedSelected.contains("Marzo"))
    }

    func testMonthAndSelectedDateFormatter_English() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")

        let client = APIClient(baseURL: URL(string: "https://example.com")!)
        let vm = CalendarViewModel(apiClient: client)

        // Define a specific date to test: March 15, 2026
        var components = DateComponents()
        components.year = 2026
        components.month = 3
        components.day = 15
        let date = Calendar.current.date(from: components)!

        // Set current month of viewModel
        vm.currentMonth = date
        vm.selectedDate = date

        // Under en-US: Month title should capitalize month name "March 2026"
        XCTAssertEqual(vm.monthTitle, "March 2026")

        // Formatted selected date
        let formattedSelected = vm.formattedSelectedDate()
        XCTAssertTrue(formattedSelected.contains("March") || formattedSelected.contains("march"))
    }
}

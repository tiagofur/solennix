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
        XCTAssertEqual(CalendarStrings.actionDelete, "Eliminar")

        // Status Label Lookups
        XCTAssertEqual(CalendarStrings.statusQuoted, "Cotizado")
        XCTAssertEqual(CalendarStrings.statusConfirmed, "Confirmado")
        XCTAssertEqual(CalendarStrings.statusCompleted, "Completado")
        XCTAssertEqual(CalendarStrings.statusCancelled, "Cancelado")

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
        XCTAssertEqual(CalendarStrings.actionDelete, "Delete")

        // Status Label Lookups
        XCTAssertEqual(CalendarStrings.statusQuoted, "Quoted")
        XCTAssertEqual(CalendarStrings.statusConfirmed, "Confirmed")
        XCTAssertEqual(CalendarStrings.statusCompleted, "Completed")
        XCTAssertEqual(CalendarStrings.statusCancelled, "Cancelled")

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

    // MARK: - Month Formatter Tests

    func testMonthFormatter_Spanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")

        let client = APIClient(baseURL: URL(string: "https://example.com")!)
        let vm = EventListViewModel(apiClient: client)

        // Define a specific date to test: March 15, 2026
        var components = DateComponents()
        components.year = 2026
        components.month = 3
        components.day = 15
        let date = Calendar.current.date(from: components)!

        // Set current month of viewModel
        vm.currentMonth = date

        // Under es-MX: Month title should capitalize only the first letter "Marzo de 2026" or "Marzo 2026"
        let title = vm.monthTitle
        XCTAssertTrue(title == "Marzo de 2026" || title == "Marzo 2026", "Expected 'Marzo de 2026' or 'Marzo 2026', but got: '\(title)'")
    }

    func testMonthFormatter_English() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")

        let client = APIClient(baseURL: URL(string: "https://example.com")!)
        let vm = EventListViewModel(apiClient: client)

        // Define a specific date to test: March 15, 2026
        var components = DateComponents()
        components.year = 2026
        components.month = 3
        components.day = 15
        let date = Calendar.current.date(from: components)!

        // Set current month of viewModel
        vm.currentMonth = date

        // Under en-US: Month title should capitalize month name "March 2026"
        XCTAssertEqual(vm.monthTitle, "March 2026")
    }
}

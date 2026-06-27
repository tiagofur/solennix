import XCTest
import Foundation
import SolennixNetwork
@testable import SolennixFeatures

// MARK: - Calendar Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class CalendarLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    func testCalendarStringsResolve() {
        // General Actions
        XCTAssertEqual(CalendarStrings.actionCancel, expected(spanish: "Cancelar", english: "Cancel"))
        XCTAssertEqual(CalendarStrings.actionDelete, expected(spanish: "Eliminar", english: "Delete"))

        // Status Label Lookups
        XCTAssertEqual(CalendarStrings.statusQuoted, expected(spanish: "Cotizado", english: "Quoted"))
        XCTAssertEqual(CalendarStrings.statusConfirmed, expected(spanish: "Confirmado", english: "Confirmed"))
        XCTAssertEqual(CalendarStrings.statusCompleted, expected(spanish: "Completado", english: "Completed"))
        XCTAssertEqual(CalendarStrings.statusCancelled, expected(spanish: "Cancelado", english: "Cancelled"))

        // Blocked Dates List View
        XCTAssertEqual(CalendarStrings.blockedDatesTitle, expected(spanish: "Fechas No Disponibles", english: "Unavailable Dates"))
        XCTAssertEqual(CalendarStrings.blockedDatesEmpty, expected(spanish: "No hay fechas bloqueadas", english: "No blocked dates"))
        XCTAssertEqual(CalendarStrings.blockedDatesEmptySubtitle, expected(spanish: "Todas las fechas están disponibles", english: "All dates are available"))

        // Block Date Form Sheet
        XCTAssertEqual(CalendarStrings.blockTitle, expected(spanish: "Bloquear fecha", english: "Block date"))
        XCTAssertEqual(CalendarStrings.blockSave, expected(spanish: "Bloquear", english: "Block"))
        XCTAssertEqual(CalendarStrings.blockStartDate, expected(spanish: "Desde", english: "From"))
        XCTAssertEqual(CalendarStrings.blockEndDate, expected(spanish: "Hasta", english: "To"))
        XCTAssertEqual(CalendarStrings.blockReasonLabel, expected(spanish: "Motivo (opcional)", english: "Reason (optional)"))
        XCTAssertEqual(CalendarStrings.blockReasonPlaceholderRange, expected(spanish: "Ej: Vacaciones, mantenimiento…", english: "E.g. Vacation, maintenance…"))
        XCTAssertEqual(CalendarStrings.blockAddRange, expected(spanish: "Agregar rango", english: "Add range"))
        XCTAssertEqual(CalendarStrings.blockRangeTitle, expected(spanish: "Bloquear rango de fechas", english: "Block date range"))

        // Dynamic Formats
        XCTAssertEqual(CalendarStrings.overflowMore(5), expected(spanish: "+5 más", english: "+5 more"))
        XCTAssertEqual(CalendarStrings.a11yDayBlocked, expected(spanish: "Día bloqueado", english: "Day blocked"))
        XCTAssertEqual(CalendarStrings.a11yDayNoEvents, expected(spanish: "Sin eventos", english: "No events"))
        XCTAssertEqual(CalendarStrings.a11yDayWithEvents(3), expected(spanish: "3 eventos", english: "3 events"))
    }

    // MARK: - Month Formatter Tests

    func testMonthFormatter_Resolves() {
        let client = APIClient(baseURL: URL(string: "https://example.com")!)
        let vm = EventListViewModel(apiClient: client)

        // Define a specific date to test: March 15, 2026
        var components = DateComponents()
        components.year = 2026
        components.month = 3
        components.day = 15
        let date = Calendar.current.date(from: components)!

        vm.currentMonth = date

        let title = vm.monthTitle
        // Spanish capitalizes only the first letter ("Marzo de 2026" / "Marzo 2026");
        // English capitalizes the month name ("March 2026").
        switch FeatureL10n.languageCode {
        case "en":
            XCTAssertEqual(title, "March 2026")
        default:
            XCTAssertTrue(title == "Marzo de 2026" || title == "Marzo 2026", "Expected 'Marzo de 2026' or 'Marzo 2026', but got: '\(title)'")
        }
    }
}
